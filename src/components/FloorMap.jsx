import { PLAN, ROOMS, HALLS, LANDMARKS, LANDMARK_KEYS, posOf, landmarkOf } from '../lib/floor.js';
import { meter, fmtBac, initial } from '../lib/logic.js';

const pct = (v, total) => `${(v / total) * 100}%`;

// Staged map of Tangen Hall, 4th floor, with each friend's pin + drunk-o-meter.
export default function FloorMap({
  members, meId, subjectId = null, goingIds = [], route = null, onLandmark, selectedId, compact = false,
}) {
  const subject = members.find((m) => m.id === subjectId);
  const subjectSpot = subject ? landmarkOf(subject) : null;
  return (
    <div className="floor" style={{ aspectRatio: `${PLAN.w} / ${PLAN.h}` }}>
      <svg viewBox={`0 0 ${PLAN.w} ${PLAN.h}`} width="100%" height="100%" role="img"
        aria-label="Floor plan of Tangen Hall 4th floor: elevators, bathrooms, conference room, hallway and classroom">
        <rect x="0" y="0" width={PLAN.w} height={PLAN.h} rx="8" fill="#110B1D" />
        {HALLS.map((h, i) => <rect key={i} x={h.x} y={h.y} width={h.w} height={h.h} rx="3" fill="#1D1530" />)}
        {ROOMS.map((r) => (
          <g key={r.key}>
            <rect x={r.x} y={r.y} width={r.w} height={r.h} rx="4"
              fill={r.key === subjectSpot ? 'rgba(255,59,78,0.16)' : '#17102A'}
              stroke={r.key === subjectSpot ? '#FF3B4E' : '#2E2448'} strokeWidth="1" />
            {r.label && (
              <text x={r.x + r.w / 2} y={r.y + 8.5} textAnchor="middle"
                fill="#8F84B0" fontSize="6.4" fontWeight="600" fontFamily="Space Grotesk, sans-serif" letterSpacing="0.3">
                {r.label.toUpperCase()}
              </text>
            )}
          </g>
        ))}
        <text x="76" y="196" textAnchor="middle" fill="#6F6390" fontSize="5.6" fontFamily="Space Grotesk, sans-serif"
          transform="rotate(-90 76 196)">CORRIDOR</text>
        {route && (
          <polyline points={route.pts.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#3DE0FF"
            strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="0.1 5"
            style={{ filter: 'drop-shadow(0 0 2px rgba(61,224,255,0.8))' }} />
        )}
        {onLandmark && LANDMARK_KEYS.map((k) => (
          <circle key={k} cx={LANDMARKS[k].x} cy={LANDMARKS[k].y} r="13" fill="rgba(61,224,255,0.08)"
            stroke="#3DE0FF" strokeOpacity="0.5" strokeDasharray="2 2" style={{ cursor: 'pointer' }}
            onClick={() => onLandmark(k)} />
        ))}
      </svg>
      {members.filter((m) => m.status === 'active' && posOf(m)).map((m) => {
        const p = posOf(m);
        const isMe = m.id === meId;
        const isSubject = m.id === subjectId;
        const isGoing = goingIds.includes(m.id);
        const { ratio, level } = meter(m);
        const tag = isSubject ? `${m.name} ${fmtBac(m.bac)}` : isGoing ? `${isMe ? 'You' : m.name} · going` : isMe ? 'You' : m.name;
        return (
          <div key={m.id} className={`pin${compact ? ' small' : ''}`} style={{ left: pct(p.x, PLAN.w), top: pct(p.y, PLAN.h), zIndex: isSubject ? 5 : m.id === selectedId ? 4 : 2 }}>
            <div className="pin-row">
              {isSubject && <div className="pin-ring" />}
              <div className={`pin-av${isMe ? ' me' : ''}${isGoing ? ' going' : ''}${isSubject ? ' subject' : ''}${m.id === selectedId ? ' selected' : ''}`}>
                {isMe ? 'You' : initial(m.name)}
              </div>
              {m.has_band && <div className="pin-meter"><div className={`lvl-${level}`} style={{ height: `${Math.max(6, ratio * 100)}%` }} /></div>}
            </div>
            {!compact && <span className={`pin-tag${isSubject ? ' subject' : isGoing ? ' going' : ''}`}>{tag}</span>}
          </div>
        );
      })}
    </div>
  );
}
