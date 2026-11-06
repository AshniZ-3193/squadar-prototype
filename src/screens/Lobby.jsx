import { ShareCode, Avatar } from '../components/Bits.jsx';
import { startNight } from '../lib/actions.js';
import { fmtBac } from '../lib/logic.js';
import { useState } from 'react';

export default function Lobby({ squad, members, me, isHost, host }) {
  const [busy, setBusy] = useState(false);
  return (
    <main className="screen">
      <div className="stack" style={{ gap: 2 }}>
        <span className="eyebrow">{isHost ? 'You’re the host' : 'You’re in'}</span>
        <h1 className="h-display h1">{squad.name}</h1>
      </div>
      <ShareCode code={squad.code} />
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2 className="h-display" style={{ fontSize: 17, fontWeight: 700 }}>Who’s in · {members.length}</h2>
        <span className="muted" style={{ fontSize: 13 }}>updates live</span>
      </div>
      <ul className="list">
        {members.map((m) => (
          <li key={m.id}>
            <Avatar m={m} me={m.id === me.id} />
            <span className="grow" style={{ fontWeight: 600 }}>
              {m.name}{m.id === squad.host_member_id && <span className="muted" style={{ fontWeight: 500 }}> · host</span>}
            </span>
            <span className="small soft">{m.has_band ? `band ✓ · ${fmtBac(m.bac_limit)}` : 'no band · location only'}</span>
          </li>
        ))}
      </ul>
      <div className="stack spacer" style={{ gap: 10 }}>
        {isHost ? (
          <>
            <button type="button" className="btn btn-primary big" disabled={busy}
              onClick={async () => { setBusy(true); await startNight(squad.id); }}>
              Start the night
            </button>
            <p className="muted small" style={{ textAlign: 'center' }}>Start when everyone’s in. Friends can still join after.</p>
          </>
        ) : (
          <div className="card row" style={{ justifyContent: 'center' }}>
            <span className="spinner" /><span className="soft">Waiting for {host?.name || 'the host'} to start the night</span>
          </div>
        )}
      </div>
    </main>
  );
}
