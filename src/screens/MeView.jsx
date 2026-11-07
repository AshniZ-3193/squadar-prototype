import { useState } from 'react';
import { TopBar, ShareCode } from '../components/Bits.jsx';
import { meter, fmtBac, num, levelFor } from '../lib/logic.js';
import { landmarkOf, LANDMARKS } from '../lib/floor.js';
import { endNight, leaveSquad } from '../lib/actions.js';
import { playAlarm, unlockAudio } from '../lib/audio.js';

export default function MeView({ squad, me, isHost, onBack }) {
  const [confirm, setConfirm] = useState(null); // 'end' | 'leave'
  const [busy, setBusy] = useState(false);
  const { ratio, level } = meter(me);
  const limit = num(me.bac_limit);

  const run = async () => {
    setBusy(true);
    if (confirm === 'end') await endNight(squad.id);
    else await leaveSquad(me.id);
  };

  return (
    <main className="screen">
      <TopBar title={me.name} onBack={onBack} right={isHost ? <span className="muted small">host</span> : null} />

      <div className="card row" style={{ gap: 20 }}>
        <div style={{ width: 44, height: 120, borderRadius: 14, background: 'var(--surface-2)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', overflow: 'hidden', position: 'relative' }}>
          {me.has_band && <div className={`lvl-${level}`} style={{ height: `${Math.max(4, ratio * 100)}%` }} />}
          <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 3, background: 'var(--red)' }} />
        </div>
        <div className="stack" style={{ gap: 4 }}>
          <span className="eyebrow">Your est. BAC</span>
          <span className="h-display" style={{ fontSize: 46, lineHeight: 1 }}>{me.has_band ? fmtBac(me.bac) : '—'}</span>
          <span className="soft" style={{ fontSize: 15 }}>
            {me.has_band ? <>Your limit: <b style={{ color: 'var(--red-soft)' }}>{levelFor(limit).label}</b> ({fmtBac(limit)})</> : 'No device paired'}
          </span>
          <span className="muted" style={{ fontSize: 13 }}>Demo: readings are simulated</span>
        </div>
      </div>

      <ShareCode code={squad.code} />

      <ul className="list">
        <li><span className="grow">Device</span><span className="soft small">{me.has_band ? 'Connected' : 'Not paired'}</span></li>
        <li><span className="grow">You’re at</span><span className="soft small">{landmarkOf(me) ? LANDMARKS[landmarkOf(me)].label : '—'}</span></li>
        <li>
          <span className="grow">Alert sound</span>
          <button type="button" className="btn-text" style={{ color: 'var(--cyan)' }} onClick={() => { unlockAudio(); playAlarm(); }}>Test sound</button>
        </li>
      </ul>

      <div className="stack spacer" style={{ gap: 12 }}>
        {confirm ? (
          <div className="card stack reveal">
            <b>{confirm === 'end' ? 'End the night for everyone?' : 'Leave the squad?'}</b>
            <p className="soft small">
              {confirm === 'end'
                ? 'The night ends for the whole squad and everyone sees their aftermath.'
                : 'You leave the map and see your aftermath.'}
            </p>
            <div className="row">
              <button type="button" className="btn btn-ghost" onClick={() => setConfirm(null)} disabled={busy}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={run} disabled={busy}>{confirm === 'end' ? 'End night' : 'Leave'}</button>
            </div>
          </div>
        ) : (
          <>
            {isHost && <button type="button" className="btn btn-primary" onClick={() => setConfirm('end')}>End the night for everyone</button>}
            <button type="button" className="btn btn-ghost" onClick={() => setConfirm('leave')}>{isHost ? 'Just leave the squad' : 'Leave the squad'}</button>
          </>
        )}
      </div>
    </main>
  );
}
