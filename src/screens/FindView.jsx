import { useState } from 'react';
import FloorMap from '../components/FloorMap.jsx';
import { route, formatFeet } from '../lib/floor.js';
import { byId, fmtBac } from '../lib/logic.js';
import { resolveAlert } from '../lib/actions.js';
import * as I from '../components/Icons.jsx';

export default function FindView({ members, me, alert, subject, onBack }) {
  const [busy, setBusy] = useState(false);
  const r = route(me, subject, subject.name);
  const close = r && r.feet < 25;
  const others = alert.going_ids.filter((id) => id !== me.id).map((id) => byId(members, id)).filter(Boolean);
  const steps = r ? r.steps : [];
  const found = async () => { setBusy(true); await resolveAlert(alert.id, me.id, 'found'); };

  return (
    <main className="screen" style={{ gap: 12 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <button type="button" className="icon-btn" aria-label="Back to map" onClick={onBack}><I.Back /></button>
        <span className="h-display" style={{ fontSize: 17, fontWeight: 700 }}>Finding {subject.name}</span>
        <span className="tag red" style={{ fontFamily: 'var(--display)', fontSize: 14, padding: '6px 10px' }}>{fmtBac(alert.bac)}</span>
      </div>

      <div style={{ width: '100%', maxWidth: 'min(100%, calc((100dvh - 420px) * 0.652))', minWidth: 210, margin: '0 auto' }}>
        <FloorMap members={members} meId={me.id} subjectId={subject.id} goingIds={alert.going_ids} route={r} compact />
      </div>

      <div className="row" style={{ justifyContent: 'center', alignItems: 'baseline', gap: 10 }}>
        <span className="h-display" style={{ fontSize: 40 }}>{r ? formatFeet(r.feet) : '—'}</span>
        <span className="muted">away</span>
      </div>

      {close ? (
        <div className="banner-cyan stack reveal" style={{ gap: 6 }}>
          <b style={{ fontSize: 18 }}>You’re close. Look around.</b>
          <span className="soft">{subject.name}’s phone is flashing so you can spot them.</span>
        </div>
      ) : (
        <div className="card stack" style={{ gap: 12 }}>
          <div className="row" style={{ alignItems: 'flex-start', gap: 14 }}>
            <span style={{ flex: 'none', width: 40, height: 40, borderRadius: 12, background: 'var(--cyan)', color: 'var(--cyan-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><I.Nav /></span>
            <div className="stack" style={{ gap: 2 }}>
              <span className="eyebrow" style={{ fontSize: 12 }}>Now</span>
              <span style={{ fontSize: 19, fontWeight: 700, lineHeight: 1.25 }}>{steps[0]}</span>
            </div>
          </div>
          {steps.length > 1 && (
            <ol className="muted" style={{ margin: 0, padding: '12px 0 0 54px', borderTop: '1px solid var(--line)', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 15 }}>
              {steps.slice(1).map((s, i) => <li key={i}>{s}</li>)}
            </ol>
          )}
        </div>
      )}

      {others.length > 0 && (
        <p className="soft row" style={{ gap: 8, fontSize: 15 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid var(--cyan)' }} />
          <span><b style={{ color: 'var(--text)' }}>{others.map((m) => m.name).join(' + ')}</b> {others.length === 1 ? 'is' : 'are'} also coming</span>
        </p>
      )}

      <div className="stack spacer">
        <button type="button" className="btn btn-primary big" disabled={busy} onClick={found}>Found {subject.name}</button>
      </div>
    </main>
  );
}
