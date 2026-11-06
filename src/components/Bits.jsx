import { useState } from 'react';
import { meter, fmtBac, initial } from '../lib/logic.js';
import * as I from './Icons.jsx';

export function Avatar({ m, me }) {
  return <span className={`avatar${me ? ' me' : ''}`}>{me ? 'You' : initial(m?.name)}</span>;
}

export function MeterRow({ members, meId }) {
  return (
    <div className="meters">
      {members.map((m) => {
        const { ratio, level } = meter(m);
        return (
          <div className="meter-col" key={m.id}>
            <div className="meter-bar" style={level === 'over' ? { boxShadow: '0 0 16px rgba(255,59,78,0.5)' } : undefined}>
              {m.has_band && <div className={`lvl-${level}`} style={{ height: `${Math.max(4, ratio * 100)}%` }} />}
            </div>
            <span style={{ fontWeight: 700, fontSize: 14, maxWidth: 62, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {m.id === meId ? 'You' : m.name}
            </span>
            <span style={{ fontSize: 12, marginTop: -4, color: level === 'over' ? 'var(--red-soft)' : 'var(--muted)', fontWeight: level === 'over' ? 700 : 500 }}>
              {m.has_band ? fmtBac(m.bac) : 'no band'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function ShareCode({ code }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}/j/${code}`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); } catch { /* ignore */ }
    setCopied(true);
    setTimeout(() => { setCopied(false); setOpen(false); }, 1200);
  };
  const share = async () => {
    setOpen(false);
    if (navigator.share) {
      try { await navigator.share({ title: 'Join my squad on Squadar', text: `Join my squad tonight. Code ${code}`, url: link }); } catch { /* cancelled */ }
    } else {
      copy();
    }
  };
  return (
    <div className="card row" style={{ position: 'relative' }}>
      <div className="grow stack" style={{ gap: 2 }}>
        <span className="muted small">Squad code</span>
        <span className="h-display" style={{ fontSize: 30, letterSpacing: '0.2em' }}>{code}</span>
      </div>
      <button type="button" className="icon-btn round cyan" style={{ width: 52, height: 52 }} aria-label="Share invite link" aria-expanded={open} onClick={() => setOpen(!open)}>
        <I.Share />
      </button>
      {open && (
        <div className="popover reveal">
          <span className="muted small" style={{ padding: '8px 12px 10px', wordBreak: 'break-all' }}>{link.replace(/^https?:\/\//, '')}</span>
          <button type="button" className="pop-item" onClick={copy}><I.Copy />{copied ? 'Link copied ✓' : 'Copy invite link'}</button>
          <button type="button" className="pop-item" onClick={share}><I.Send />Send via messages…</button>
        </div>
      )}
    </div>
  );
}

export function TopBar({ title, onBack, right }) {
  return (
    <div className="row">
      {onBack && <button type="button" className="icon-btn" aria-label="Back" onClick={onBack}><I.Back /></button>}
      <h1 className="h-display" style={{ fontSize: 22 }}>{title}</h1>
      {right && <div style={{ marginLeft: 'auto' }}>{right}</div>}
    </div>
  );
}
