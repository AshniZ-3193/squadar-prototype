import { useEffect, useRef, useState } from 'react';
import { useHeading, requestOrientationPermission } from '../lib/device.js';
import { distanceM, bearingDeg, formatDistance, walkMinutes, compassWord, hasLoc } from '../lib/geo.js';
import { byId, fmtBac } from '../lib/logic.js';
import { resolveAlert } from '../lib/actions.js';
import * as I from '../components/Icons.jsx';

const MOD = {
  left: 'left', right: 'right', 'slight left': 'slightly left', 'slight right': 'slightly right',
  'sharp left': 'sharp left', 'sharp right': 'sharp right', straight: 'straight', uturn: 'around',
};

function stepText(s, name) {
  const m = s.maneuver || {};
  const mod = m.modifier || '';
  const road = s.name || '';
  switch (m.type) {
    case 'depart': return `Head ${compassWord(m.bearing_after)}${road ? ` on ${road}` : ''}`;
    case 'arrive': return `${name} is ${mod && mod !== 'straight' ? `on your ${mod.replace(/^(slight|sharp) /, '')}` : 'right ahead'}`;
    case 'continue':
    case 'new name': return `Keep going${road ? ` on ${road}` : ' straight'}`;
    case 'roundabout':
    case 'rotary': return `Go around the roundabout${road ? ` to ${road}` : ''}`;
    default:
      if (mod === 'straight') return `Go straight${road ? ` onto ${road}` : ''}`;
      if (mod === 'uturn') return 'Turn around';
      return `Turn ${MOD[mod] || mod}${road ? ` onto ${road}` : ''}`;
  }
}

export default function FindView({ members, me, alert, subject, onBack }) {
  const heading = useHeading();
  const [route, setRoute] = useState(null);
  const [busy, setBusy] = useState(false);
  const last = useRef({ t: 0, lat: null, lng: null });
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  const d = distanceM(me, subject);
  const b = bearingDeg(me, subject);
  const rel = b == null ? null : heading == null ? b : (b - heading + 360) % 360;
  const close = d != null && d < 50;
  const others = alert.going_ids.filter((id) => id !== me.id).map((id) => byId(members, id)).filter(Boolean);

  // Walking directions (free OpenStreetMap router). Refreshed as you move.
  useEffect(() => {
    if (close || !hasLoc(me) || !hasLoc(subject)) return;
    const now = Date.now();
    const moved = last.current.lat == null ? Infinity : distanceM(last.current, me);
    if (now - last.current.t < 15000 && moved < 25) return;
    last.current = { t: now, lat: me.lat, lng: me.lng };
    const url = `https://routing.openstreetmap.de/routed-foot/route/v1/driving/${me.lng},${me.lat};${subject.lng},${subject.lat}?overview=false&steps=true`;
    fetch(url).then((r) => r.json()).then((j) => {
      const r0 = j.routes && j.routes[0];
      if (!r0 || !alive.current) return;
      const steps = r0.legs[0].steps.map((s) => ({ text: stepText(s, subject.name), dist: s.distance }));
      setRoute({ steps, total: r0.distance });
    }).catch(() => {});
  }, [me, subject, close]);

  const remaining = route && !close ? Math.max(d || 0, route.total) : d;
  const steps = route && !close ? route.steps : [];

  const found = async () => { setBusy(true); await resolveAlert(alert.id, me.id, 'found'); };

  return (
    <main className="screen" style={{ gap: 12 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <button type="button" className="icon-btn" aria-label="Back to map" onClick={onBack}><I.Back /></button>
        <span className="h-display" style={{ fontSize: 17, fontWeight: 700 }}>Finding {subject.name}</span>
        <span className="tag red" style={{ fontFamily: 'var(--display)', fontSize: 14, padding: '6px 10px' }}>{fmtBac(alert.bac)}</span>
      </div>

      {!hasLoc(me) || !hasLoc(subject) ? (
        <div className="card stack" style={{ alignItems: 'center', textAlign: 'center', marginTop: 40 }}>
          <span className="spinner" />
          <p className="soft">Waiting for {!hasLoc(me) ? 'your' : `${subject.name}’s`} location…</p>
        </div>
      ) : (
        <>
          <div style={{ position: 'relative', width: 'min(84vw, 320px)', aspectRatio: '1', margin: '8px auto 0' }}>
            <svg viewBox="0 0 320 320" width="100%" height="100%" role="img"
              aria-label={`Arrow pointing toward ${subject.name}, ${compassWord(b)}`}>
              <circle cx="160" cy="160" r="150" fill="none" stroke="#2A2140" strokeWidth="2" />
              <circle cx="160" cy="160" r="100" fill="none" stroke="#1C1530" />
              {heading == null && <text x="154" y="24" fill="#8A7DAA" fontSize="14" fontFamily="Space Grotesk">N</text>}
              <g transform={`rotate(${rel ?? 0} 160 160)`} style={{ transition: 'transform .3s ease-out' }}>
                <path d="M160 62 L212 196 L160 168 L108 196 Z" fill="#3DE0FF" style={{ filter: 'drop-shadow(0 0 18px rgba(61,224,255,0.6))' }} />
                <circle cx="160" cy="12" r="11" fill="#FF3B4E" style={{ filter: 'drop-shadow(0 0 10px #FF3B4E)' }} />
              </g>
              <circle cx="160" cy="160" r="6" fill="#F4EEFF" />
            </svg>
          </div>
          <div className="row" style={{ justifyContent: 'center', alignItems: 'baseline', gap: 10 }}>
            <span className="h-display" style={{ fontSize: 44 }}>{formatDistance(remaining)}</span>
            {!close && <span className="muted">· {walkMinutes(remaining)} min walk</span>}
          </div>
          {heading == null && (
            <button type="button" className="btn-text" onClick={() => requestOrientationPermission()}>
              Arrow uses a north-up map. Tap to use your compass
            </button>
          )}

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
                  <span style={{ fontSize: 19, fontWeight: 700, lineHeight: 1.25 }}>
                    {steps[0] ? steps[0].text : `Head ${compassWord(b)}`}
                  </span>
                </div>
              </div>
              {steps.length > 1 && (
                <ol className="muted" style={{ margin: 0, padding: '12px 0 0 54px', borderTop: '1px solid var(--line)', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 15 }}>
                  {steps.slice(1, 3).map((s, i) => (
                    <li key={i}>{s.text}{i === 0 ? ` in ${formatDistance(steps[0].dist)}` : ''}</li>
                  ))}
                </ol>
              )}
            </div>
          )}
        </>
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
