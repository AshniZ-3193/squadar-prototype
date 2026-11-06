import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import PinGate from '../components/PinGate.jsx';
import LiveMap from '../components/LiveMap.jsx';
import { useSquad } from '../lib/useSquad.js';
import { fireAlert, escalate, startNight, endNight, resolveAlert } from '../lib/actions.js';
import { activeMembers, byId, fmtBac, num, openAlert, meter, namesList } from '../lib/logic.js';
import { hasLoc, offset, DEFAULT_CENTER, distanceM, formatDistance } from '../lib/geo.js';
import { getPositionOnce } from '../lib/device.js';

export default function Facilitator() {
  return <PinGate title="Facilitator">{() => <Picker />}</PinGate>;
}

function Picker() {
  const [squads, setSquads] = useState([]);
  const [code, setCode] = useState('');
  const [chosen, setChosen] = useState(null);
  useEffect(() => {
    const load = () => supabase.from('squads').select('*').neq('status', 'ended')
      .gte('created_at', new Date(Date.now() - 36 * 3600e3).toISOString())
      .order('created_at', { ascending: false }).then(({ data }) => setSquads(data || []));
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);
  if (chosen) return <Control code={chosen} onExit={() => setChosen(null)} />;
  return (
    <main className="screen">
      <h1 className="h-display h1">Facilitator</h1>
      <p className="soft">Pick the squad your testers created. Keep this page open during the session: it runs the alert timing.</p>
      <ul className="list">
        {squads.length === 0 && <li className="muted">No active squads yet. Ask the host to create one.</li>}
        {squads.map((s) => (
          <li key={s.id} style={{ cursor: 'pointer' }} onClick={() => setChosen(s.code)}>
            <span className="grow"><b>{s.name}</b> <span className="muted">· {s.code}</span></span>
            <span className="tag">{s.status}</span>
          </li>
        ))}
      </ul>
      <div className="row">
        <input className="input code" placeholder="CODE" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
        <button type="button" className="btn btn-primary" style={{ width: 'auto' }} onClick={() => code && setChosen(code)}>Open</button>
      </div>
      <a href="/results" className="small">See feedback results →</a>
    </main>
  );
}

const ESCALATE_AFTER_S = 120;

function Control({ code, onExit }) {
  const { squad, members: all, alerts } = useSquad(code);
  const members = activeMembers(all);
  const [placing, setPlacing] = useState(null);
  const [picked, setPicked] = useState([]); // manual responder choice
  const [autoEscalate, setAutoEscalate] = useState(true);
  const [msg, setMsg] = useState('');
  const debounce = useRef({});
  const [draft, setDraft] = useState({}); // memberId -> bac being dragged
  const alert = squad?.status === 'live' ? openAlert(alerts) : null;

  const say = (t) => { setMsg(t); setTimeout(() => setMsg(''), 3500); };

  // Escalate to the next closest friend if nobody has said they're going.
  const state = useRef({});
  state.current = { alert, all, autoEscalate };
  useEffect(() => {
    const t = setInterval(() => {
      const { alert: a, all: ms, autoEscalate: on } = state.current;
      if (!on || !a || a.going_ids.length) return;
      const age = (Date.now() - new Date(a.created_at).getTime()) / 1000;
      if (age > ESCALATE_AFTER_S * Math.max(1, a.responder_ids.length - 1)) escalate(a, ms);
    }, 5000);
    return () => clearInterval(t);
  }, []);

  if (!squad) return <main className="screen center"><div className="spinner" /></main>;

  const commitBac = async (m, value) => {
    const bac = Math.round(value * 1000) / 1000;
    await supabase.from('members').update({ bac }).eq('id', m.id);
    const limit = num(m.bac_limit);
    const mine = alerts.filter((a) => a.subject_member_id === m.id && a.resolution !== 'superseded');
    const last = mine[mine.length - 1];
    const fresh = { ...m, bac };
    if (squad.status === 'live' && bac >= limit) {
      if (!last || (last.status === 'resolved' && bac >= num(last.bac) + 0.02)) {
        await fireAlert(squad.id, all, fresh, picked.filter((id) => id !== m.id));
        say(`Alert fired for ${m.name}`);
      }
    }
  };
  const setBac = (m, value) => {
    setDraft((d) => ({ ...d, [m.id]: value }));
    clearTimeout(debounce.current[m.id]);
    debounce.current[m.id] = setTimeout(() => { commitBac(m, value); setDraft((d) => { const n = { ...d }; delete n[m.id]; return n; }); }, 400);
  };

  const hitLimit = async (m) => {
    if (squad.status !== 'live') { say('Start the night first'); return; }
    await fireAlert(squad.id, all, m, picked.filter((id) => id !== m.id));
    say(`Alert fired for ${m.name}`);
  };

  const simNight = async () => {
    await Promise.all(members.filter((m) => m.has_band && meter(m).level !== 'over').map((m) =>
      supabase.from('members').update({ bac: Math.round((0.01 + Math.random() * 0.04) * 1000) / 1000 }).eq('id', m.id)));
    say('Gave everyone a starting BAC (0.01–0.05)');
  };

  const scatter = async () => {
    const here = await getPositionOnce(5000);
    const center = here.ok ? { lat: here.lat, lng: here.lng } : (members.find(hasLoc) || DEFAULT_CENTER);
    const n = members.length;
    await Promise.all(members.map((m, i) => {
      const angle = (i / n) * 2 * Math.PI;
      const r = 150 + (i % 3) * 250;
      const p = offset(center, Math.cos(angle) * r, Math.sin(angle) * r);
      return supabase.from('members').update({ ...p, location_source: 'manual', location_updated_at: new Date().toISOString() }).eq('id', m.id);
    }));
    say('Placed everyone around you (manual positions)');
  };

  const place = async (latlng) => {
    if (!placing) return;
    await supabase.from('members').update({ lat: latlng.lat, lng: latlng.lng, location_source: 'manual', location_updated_at: new Date().toISOString() }).eq('id', placing);
    setPlacing(null);
  };
  const backToGps = (m) => supabase.from('members').update({ location_source: 'gps', accuracy_m: null }).eq('id', m.id);
  const allGps = () => Promise.all(members.map((m) => backToGps(m))).then(() => say('Everyone back on live GPS'));

  const subject = alert ? byId(all, alert.subject_member_id) : null;
  const age = alert ? Math.round((Date.now() - new Date(alert.created_at).getTime()) / 1000) : 0;

  return (
    <main className="screen wide">
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <button type="button" className="btn-text" onClick={onExit}>← Squads</button>
        <h1 className="h-display h1 grow">{squad.name} <span className="muted" style={{ fontSize: 18 }}>· {squad.code}</span></h1>
        <span className="tag cyan">{squad.status}</span>
        {squad.status === 'lobby' && <button type="button" className="btn btn-primary" style={{ width: 'auto' }} onClick={() => startNight(squad.id)}>Start the night</button>}
        {squad.status === 'live' && <button type="button" className="btn btn-ghost" style={{ width: 'auto' }} onClick={() => window.confirm('End the night for everyone?') && endNight(squad.id)}>End night for everyone</button>}
      </div>

      <div className="fac-grid">
        <div className="stack">
          <div className="fac-map" style={{ position: 'relative' }}>
            <LiveMap members={members} subjectId={subject?.id} goingIds={alert?.going_ids || []} onMapClick={place} selectedId={placing} />
          </div>
          {placing && <p className="banner-cyan small">Tap the map to place <b>{byId(all, placing)?.name}</b>. <button type="button" className="btn-text" onClick={() => setPlacing(null)}>Cancel</button></p>}
          <div className="row" style={{ flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-ghost" style={{ width: 'auto' }} onClick={scatter}>Scatter demo positions</button>
            <button type="button" className="btn btn-ghost" style={{ width: 'auto' }} onClick={allGps}>Everyone on live GPS</button>
            <button type="button" className="btn btn-ghost" style={{ width: 'auto' }} onClick={simNight}>Random starting BACs</button>
          </div>

          <div className="card stack">
            <b>Alert</b>
            {alert && subject ? (
              <>
                <p><span className="tag red">{subject.name} · {fmtBac(alert.bac)}</span> <span className="muted small">{age}s ago</span></p>
                <p className="small">Alerted: {namesList(alert.responder_ids.map((id) => byId(all, id)?.name).filter(Boolean)) || '—'}</p>
                <p className="small">Going: {namesList(alert.going_ids.map((id) => byId(all, id)?.name).filter(Boolean)) || 'nobody yet'}</p>
                <div className="row" style={{ flexWrap: 'wrap' }}>
                  <button type="button" className="btn btn-ghost" style={{ width: 'auto' }} onClick={() => escalate(alert, all)}>Alert next closest now</button>
                  <button type="button" className="btn btn-ghost" style={{ width: 'auto' }} onClick={() => resolveAlert(alert.id, null, 'facilitator')}>Clear alert</button>
                </div>
              </>
            ) : <p className="muted small">No open alert. Push someone’s BAC to their limit or press “Hit limit”.</p>}
            <label className="row small"><input type="checkbox" checked={autoEscalate} onChange={(e) => setAutoEscalate(e.target.checked)} /> If nobody goes within 2 min, alert the next closest friend</label>
          </div>
          {msg && <div className="toast">{msg}</div>}
        </div>

        <div className="stack">
          <p className="muted small">Responders: tick up to 2 people to alert instead of the 2 closest (useful indoors). Leave empty for closest-by-GPS.</p>
          <ul className="list">
            {members.map((m) => {
              const val = draft[m.id] ?? num(m.bac);
              const lvl = meter({ ...m, bac: val }).level;
              const d = subject && m.id !== subject.id ? distanceM(m, subject) : null;
              return (
                <li key={m.id} style={{ flexDirection: 'column', alignItems: 'stretch', padding: '12px 14px', gap: 8 }}>
                  <div className="row" style={{ flexWrap: 'wrap' }}>
                    <label className="row small" title="Use as responder">
                      <input type="checkbox" checked={picked.includes(m.id)} onChange={(e) => setPicked((p) => e.target.checked ? [...p, m.id].slice(-2) : p.filter((x) => x !== m.id))} />
                    </label>
                    <b className="grow">{m.name}{m.id === squad.host_member_id ? ' (host)' : ''}</b>
                    <span className={`tag${lvl === 'over' ? ' red' : ''}`}>{m.has_band ? `${fmtBac(val)} / ${fmtBac(m.bac_limit)}` : 'no band'}</span>
                    <span className="tag">{m.location_source === 'manual' ? 'placed' : !hasLoc(m) ? 'no location' : m.accuracy_m == null ? 'GPS (waiting)' : `GPS ±${Math.round(m.accuracy_m)}m`}</span>
                    {d != null && <span className="tag cyan">{formatDistance(d)} from {subject.name}</span>}
                  </div>
                  {m.has_band && (
                    <div className="row">
                      <button type="button" className="icon-btn" aria-label={`Lower ${m.name}'s BAC`} onClick={() => setBac(m, Math.max(0, val - 0.01))}>−</button>
                      <input type="range" min="0" max="0.15" step="0.005" value={val} aria-label={`${m.name}'s BAC`} onChange={(e) => setBac(m, Number(e.target.value))} />
                      <button type="button" className="icon-btn" aria-label={`Raise ${m.name}'s BAC`} onClick={() => setBac(m, val + 0.01)}>+</button>
                    </div>
                  )}
                  <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
                    {m.has_band && <button type="button" className="btn btn-primary" style={{ width: 'auto', minHeight: 40, fontSize: 14 }} onClick={() => hitLimit(m)}>Hit limit</button>}
                    <button type="button" className="btn btn-ghost" style={{ width: 'auto', minHeight: 40, fontSize: 14 }} onClick={() => setPlacing(m.id)}>Place on map</button>
                    {m.location_source === 'manual' && <button type="button" className="btn btn-ghost" style={{ width: 'auto', minHeight: 40, fontSize: 14 }} onClick={() => backToGps(m)}>Back to GPS</button>}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </main>
  );
}
