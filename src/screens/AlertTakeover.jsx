import { useState } from 'react';
import { byId, fmtBac, namesList } from '../lib/logic.js';
import { walkFeet, formatFeet } from '../lib/floor.js';
import { joinGoing, resolveAlert } from '../lib/actions.js';
import * as I from '../components/Icons.jsx';

// Shrinks the name so it always fits on one line (Unbounded caps are ~0.95em wide).
function nameSize(name) {
  const n = Math.max(3, name.trim().length);
  return `min(104px, calc((min(100vw, 480px) - 48px) / ${(n * 0.95).toFixed(2)}))`;
}

export default function AlertTakeover({ members, me, alert, subject, onDismiss }) {
  const [busy, setBusy] = useState(false);
  const others = alert.responder_ids.filter((id) => id !== me.id).map((id) => byId(members, id)).filter(Boolean);
  const d = walkFeet(me, subject);
  const ticker = 'SQUAD ALERT ● SQUAD ALERT ● SQUAD ALERT ● SQUAD ALERT ●';

  const go = async () => {
    setBusy(true);
    await joinGoing(alert.id, me.id);
  };
  const withHer = async () => {
    setBusy(true);
    await resolveAlert(alert.id, me.id, 'already_with');
    onDismiss();
  };

  return (
    <div className="takeover" role="alertdialog" aria-labelledby="t-title">
      <div className="ticker" aria-hidden="true">
        <div className="ticker-track"><span>{ticker}</span><span>{ticker}</span></div>
      </div>
      <div className="takeover-body">
        <h1 id="t-title" style={{ margin: 0 }}>
          <span className="t-name" style={{ fontSize: nameSize(subject.name) }}>{subject.name.toUpperCase()}</span>
          <span className="t-line">reached their limit</span>
        </h1>
        <span className="t-num">{fmtBac(alert.bac)}</span>
        <span className="t-sub">BAC{d != null ? ` · ${formatFeet(d)} away` : ''}</span>
      </div>
      <div className="takeover-sheet">
        <div className="row">
          <span className="avatar me">You</span>
          <span className="soft" style={{ fontSize: 15, lineHeight: 1.35 }}>
            {others.length
              ? <>You and <b style={{ color: 'var(--text)' }}>{namesList(others.map((m) => m.name))}</b> are closest to {subject.name}. Everyone else sees who’s going.</>
              : <>You’re closest to {subject.name}. Everyone else sees who’s going.</>}
          </span>
        </div>
        <button type="button" className="btn btn-primary big" disabled={busy} onClick={go}><I.Nav />Gotta get my friend</button>
        <button type="button" className="btn btn-ghost" disabled={busy} onClick={withHer}>I’m already with {subject.name}</button>
      </div>
    </div>
  );
}
