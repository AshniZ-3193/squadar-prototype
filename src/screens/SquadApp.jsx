import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSquad } from '../lib/useSquad.js';
import { getMemberId } from '../lib/storage.js';
import { useWakeLock } from '../lib/device.js';
import { openAlert, byId, activeMembers } from '../lib/logic.js';
import { walkFeet } from '../lib/floor.js';
import { playAlarm, playChime } from '../lib/audio.js';
import Lobby from './Lobby.jsx';
import MapView from './MapView.jsx';
import AlertTakeover from './AlertTakeover.jsx';
import FindView from './FindView.jsx';
import MeView from './MeView.jsx';
import Aftermath from './Aftermath.jsx';

export default function SquadApp() {
  const { code: rawCode } = useParams();
  const code = (rawCode || '').toUpperCase();
  const { loading, squad, members, alerts, error, refresh } = useSquad(code);
  const meId = getMemberId(code);
  const me = byId(members, meId);

  const [view, setView] = useState('main'); // main | me | map
  const [dismissed, setDismissed] = useState(() => new Set()); // alerts I closed the takeover for
  const [toast, setToast] = useState('');

  const live = squad?.status === 'live';
  const ended = squad?.status === 'ended' || me?.status === 'left';
  useWakeLock(Boolean(me && !ended));

  const alert = live ? openAlert(alerts) : null;
  const alertId = alert?.id;
  useEffect(() => { setView((v) => (v === 'map' ? 'main' : v)); }, [alertId]);
  const subject = alert ? byId(members, alert.subject_member_id) : null;
  const iAmSubject = Boolean(alert && alert.subject_member_id === meId);
  const iAmResponder = Boolean(alert && alert.responder_ids.includes(meId));
  const iAmGoing = Boolean(alert && alert.going_ids.includes(meId));
  const showTakeover = Boolean(alert && iAmResponder && !iAmGoing && !iAmSubject && !dismissed.has(alert.id));

  // Sound: alarm when the takeover first appears; chime for the subject's notice.
  const played = useRef(new Set());
  useEffect(() => {
    if (!alert) return;
    const key = `${alert.id}:${showTakeover ? 't' : iAmSubject ? 's' : 'b'}`;
    if (played.current.has(key)) return;
    played.current.add(key);
    if (showTakeover) playAlarm();
    else if (iAmSubject || !iAmResponder) playChime();
  }, [alert, showTakeover, iAmSubject, iAmResponder]);

  // Tell everyone when an alert gets resolved.
  const lastResolved = useRef(null);
  useEffect(() => {
    const r = alerts.filter((a) => a.status === 'resolved' && a.resolved_by && a.resolution !== 'superseded').at(-1);
    if (!r) return;
    if (lastResolved.current === null) { lastResolved.current = r.id; return; }
    if (lastResolved.current === r.id) return;
    lastResolved.current = r.id;
    const who = byId(members, r.resolved_by);
    const subj = byId(members, r.subject_member_id);
    if (who && subj) {
      setToast(r.resolution === 'found'
        ? `${who.id === meId ? 'You' : who.name} found ${subj.id === meId ? 'you' : subj.name}`
        : `${who.id === meId ? 'You are' : `${who.name} is`} with ${subj.id === meId ? 'you' : subj.name}`);
      setTimeout(() => setToast(''), 5000);
    }
  }, [alerts, members, meId]);

  const subjectClose = useMemo(() => {
    if (!iAmSubject || !alert) return null;
    return alert.going_ids
      .map((id) => byId(members, id))
      .filter(Boolean)
      .map((m) => ({ m, d: walkFeet(m, me) }))
      .filter((x) => x.d != null && x.d < 25)[0] || null;
  }, [iAmSubject, alert, members, me]);

  if (loading) return <main className="screen center"><div className="spinner" /></main>;
  if (error === 'not_found' || !squad) {
    return (
      <main className="screen center">
        <h1 className="h-display h1">Squad not found</h1>
        <p className="muted">Check the code with whoever created it.</p>
        <Link to="/join" className="btn btn-primary" style={{ maxWidth: 320 }}>Enter a code</Link>
      </main>
    );
  }
  if (!me) {
    return (
      <main className="screen center">
        <h1 className="h-display h1">{squad.name}</h1>
        <p className="muted">You’re not in this squad on this phone yet.</p>
        {squad.status !== 'ended'
          ? <Link to={`/j/${squad.code}`} className="btn btn-primary" style={{ maxWidth: 320 }}>Join {squad.name}</Link>
          : <p className="muted">This night has ended.</p>}
      </main>
    );
  }

  const isHost = squad.host_member_id === me.id;
  const host = byId(members, squad.host_member_id);
  const ctx = { squad, members: activeMembers(members), allMembers: members, alerts, me, isHost, host, refresh };

  let screen;
  if (ended) {
    screen = <Aftermath {...ctx} />;
  } else if (squad.status === 'lobby') {
    screen = <Lobby {...ctx} />;
  } else if (view === 'me') {
    screen = <MeView {...ctx} onBack={() => setView('main')} />;
  } else if (alert && iAmGoing && view !== 'map') {
    screen = <FindView {...ctx} alert={alert} subject={subject} onBack={() => setView('map')} />;
  } else {
    screen = <MapView {...ctx} alert={alert} subject={subject} iAmGoing={iAmGoing} onNavigate={() => setView('main')} onMe={() => setView('me')} />;
  }

  return (
    <>
      {screen}
      {showTakeover && subject && (
        <AlertTakeover {...ctx} alert={alert} subject={subject}
          onDismiss={() => setDismissed((s) => new Set(s).add(alert.id))} />
      )}
      {subjectClose && (
        <div className="beacon" role="alert">
          <span className="h-display" style={{ fontSize: 34 }}>{subjectClose.m.name} is close</span>
          <p className="soft" style={{ fontSize: 18 }}>Hold your phone up so they can spot you.</p>
          <p className="muted small">(With the real device, it would glow and beep now.)</p>
        </div>
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}
