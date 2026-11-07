import { PLAN, ROOMS, PARTITIONS, LANDMARKS, LANDMARK_KEYS, posOf, landmarkOf } from '../lib/floor.js';
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
        <rect x="0" y="0" width={PLAN.w} height={PLAN.h} rx="8" fill="#0F0919" />
        {/* floor */}
        <rect x="5" y="5" width={PLAN.w - 10} height={PLAN.h - 10} rx="3" fill="#1A1229" />
        {/* rooms: fill, walls, then the door gap painted in floor colour */}
        {ROOMS.map((r) => {
          const hot = r.key === subjectSpot;
          const d = r.door;
          const gap = d.side === 'top' ? { x: r.x + d.at, y: r.y - 2, w: d.len, h: 4 }
            : d.side === 'left' ? { x: r.x - 2, y: r.y + d.at, w: 4, h: d.len }
            : { x: r.x + r.w - 2, y: r.y + d.at, w: 4, h: d.len };
          return (
            <g key={r.key}>
              <rect x={r.x} y={r.y} width={r.w} height={r.h} fill={hot ? 'rgba(255,59,78,0.14)' : '#140D22'}
                stroke={hot ? '#FF3B4E' : '#B4A8D6'} strokeOpacity={hot ? 1 : 0.75} strokeWidth="2" strokeLinejoin="round" />
              <rect x={gap.x} y={gap.y} width={gap.w} height={gap.h} fill="#1A1229" />
              {r.label && (
                <text x={r.x + r.w / 2} y={r.y + 9} textAnchor="middle" fill={hot ? '#FF8A95' : '#A99BC8'}
                  fontSize="6" fontWeight="700" fontFamily="Space Grotesk, sans-serif" letterSpacing="0.4">
                  {r.label.toUpperCase()}
                </text>
              )}
            </g>
          );
        })}
        {PARTITIONS.map(([x1, y1, x2, y2], i) => (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#B4A8D6" strokeOpacity="0.55" strokeWidth="1.4" strokeLinecap="round" />
        ))}
        {/* elevator cars with up/down arrows */}
        {[[129, 182], [129, 202]].map(([x, y], i) => (
          <g key={i}>
            <rect x={x} y={y} width="11" height="14" rx="1.5" fill="none" stroke="#B4A8D6" strokeOpacity="0.6" strokeWidth="1.2" />
            <path d={`M${x + 5.5} ${y + 3} l3 3 h-6 z M${x + 5.5} ${y + 11} l3 -3 h-6 z`} fill="#B4A8D6" fillOpacity="0.7" />
          </g>
        ))}
        {/* stairs at the end of the hallway */}
        {[0, 1, 2, 3, 4].map((i) => <line key={i} x1={8 + i * 3} y1="20" x2={8 + i * 3} y2="44" stroke="#B4A8D6" strokeOpacity="0.35" strokeWidth="1" />)}
        {/* outer walls */}
        <rect x="5" y="5" width={PLAN.w - 10} height={PLAN.h - 10} rx="3" fill="none" stroke="#D9D0F5" strokeOpacity="0.85" strokeWidth="2.6" />
        <text x="76" y="200" textAnchor="middle" fill="#6F6390" fontSize="5.6" fontWeight="700" letterSpacing="1" fontFamily="Space Grotesk, sans-serif"
          transform="rotate(-90 76 200)">CORRIDOR</text>
        <text x="60" y="13" textAnchor="middle" fill="#6F6390" fontSize="5.6" fontWeight="700" letterSpacing="1" fontFamily="Space Grotesk, sans-serif">HALLWAY</text>
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
              {isSubject && <span className="pin-alarm" aria-hidden="true">!!</span>}
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
