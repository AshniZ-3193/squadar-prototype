import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { num, fmtBac, levelFor, drinksFrom, byId } from '../lib/logic.js';

// ---------- data ----------

const DAY = 86400000;
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const mondayOf = (d) => { const x = startOfDay(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
const fmtDay = (d) => d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
const fmtTime = (d) => d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

function seeded(str) {
  let h = 1779033703;
  for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

// Tonight's real numbers for one person.
function peakFor(m, alerts) {
  const asSubject = alerts.filter((a) => a.subject_member_id === m.id);
  return Math.max(num(m.bac), ...asSubject.map((a) => num(a.bac)), 0);
}

function lastNightFor(me, squad, alerts, members) {
  const start = new Date(squad.started_at || squad.created_at);
  const end = new Date(squad.ended_at || Date.now());
  const limit = num(me.bac_limit);
  const mine = alerts.filter((a) => a.subject_member_id === me.id && a.resolution !== 'superseded');
  const peak = peakFor(me, alerts);
  const firstHit = mine.length ? new Date(mine[0].created_at) : null;
  const cameFor = [...new Set(mine.flatMap((a) => a.going_ids))].map((id) => byId(members, id)?.name).filter(Boolean);
  const wentFor = [...new Set(alerts.filter((a) => a.going_ids.includes(me.id)).map((a) => a.subject_member_id))]
    .map((id) => byId(members, id)?.name).filter(Boolean);
  return {
    date: startOfDay(start), start, end, limit, peak, over: peak >= limit || mine.length > 0,
    drinks: drinksFrom(peak), firstHit, timesHit: mine.length, cameFor, wentFor,
  };
}

// Earlier nights: sample history so trends can be shown in the demo.
function historyFor(me, last) {
  const rnd = seeded(me.id);
  const limit = num(me.bac_limit);
  const sober = limit <= 0.02;
  const nights = [];
  for (let i = 84; i >= 1; i--) {
    const date = new Date(last.date.getTime() - i * DAY);
    const thisWeek = date >= mondayOf(last.date);
    const p = (thisWeek ? 0.45 : ({ 5: 0.5, 6: 0.55, 4: 0.3, 0: 0.1 }[date.getDay()] ?? 0.05)) * (sober ? 0.35 : 1);
    if (rnd() < p) {
      const peak = Math.round(limit * (0.35 + rnd() * 0.85) * 1000) / 1000;
      nights.push({ date, peak, over: peak >= limit, drinks: drinksFrom(peak) });
    } else rnd();
  }
  nights.push({ date: last.date, peak: last.peak, over: last.over, drinks: last.drinks, isLast: true });
  return nights;
}

// ---------- charts (hand-rolled SVG, single series, recessive axes) ----------

const C = { grid: '#2A2140', axis: '#8A7DAA', under: '#B4A8D6', over: '#FF3B4E', line: '#3DE0FF', surface: '#160F24' };

function NightCurve({ n }) {
  const W = 320; const H = 150; const P = { l: 8, r: 8, t: 22, b: 22 };
  const dur = Math.max(1, n.end - n.start);
  const peakAt = n.firstHit ? Math.min(0.9, Math.max(0.2, (n.firstHit - n.start) / dur)) : 0.7;
  const N = 30;
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const v = t <= peakAt ? n.peak * Math.sin((t / peakAt) * Math.PI / 2) : n.peak * (1 - 0.18 * ((t - peakAt) / (1 - peakAt || 1)));
    pts.push([t, v]);
  }
  const peakIdx = Math.round(peakAt * N);
  const [idx, setIdx] = useState(peakIdx);
  const top = Math.max(n.limit * 1.25, n.peak * 1.15, 0.02);
  const x = (t) => P.l + t * (W - P.l - P.r);
  const y = (v) => H - P.b - (v / top) * (H - P.t - P.b);
  const d = pts.map(([t, v], i) => `${i ? 'L' : 'M'}${x(t).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = `${d} L${x(1)},${y(0)} L${x(0)},${y(0)} Z`;
  const color = n.over ? C.over : C.line;
  const pick = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const t = Math.min(1, Math.max(0, ((e.clientX - r.left) / r.width * W - P.l) / (W - P.l - P.r)));
    setIdx(Math.round(t * N));
  };
  const [st, sv] = pts[idx];
  const when = new Date(n.start.getTime() + st * dur);
  const sx = x(st);
  return (
    <div className="stack" style={{ gap: 4 }}>
      <span className="small" style={{ minHeight: 20 }}>
        <b>{fmtTime(when)}</b> <span className="soft">· est. BAC {fmtBac(sv)}{sv >= n.limit ? ' · over your limit' : ''}{idx === peakIdx ? ' · your peak' : ''}</span>
      </span>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" style={{ touchAction: 'none', cursor: 'crosshair' }}
        aria-label={`Estimated BAC through the night, peaking at ${fmtBac(n.peak)} against a limit of ${fmtBac(n.limit)}. Tap or drag to read a time.`}
        onPointerDown={pick} onPointerMove={(e) => e.buttons && pick(e)}>
        <line x1={P.l} x2={W - P.r} y1={y(0)} y2={y(0)} stroke={C.grid} />
        <line x1={P.l} x2={W - P.r} y1={y(n.limit)} y2={y(n.limit)} stroke={C.over} strokeOpacity="0.55" />
        <text x={W - P.r} y={y(n.limit) - 5} textAnchor="end" fill={C.axis} fontSize="11">your limit {fmtBac(n.limit)}</text>
        <path d={area} fill={color} fillOpacity="0.1" />
        <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <line x1={sx} x2={sx} y1={P.t - 6} y2={y(0)} stroke="#F4EEFF" strokeOpacity="0.35" />
        <circle cx={sx} cy={y(sv)} r="5" fill={color} stroke={C.surface} strokeWidth="2" />
        <text x={P.l} y={H - 5} fill={C.axis} fontSize="11">{fmtTime(n.start)}</text>
        <text x={W - P.r} y={H - 5} textAnchor="end" fill={C.axis} fontSize="11">{fmtTime(n.end)}</text>
      </svg>
      <span className="muted" style={{ fontSize: 12 }}>Tap or drag across the chart</span>
    </div>
  );
}

function WeekBars({ days, limit, selected, onSelect }) {
  const W = 320; const H = 170; const P = { l: 6, r: 6, t: 24, b: 24 };
  const top = Math.max(limit * 1.3, ...days.map((d) => d.night?.peak || 0), 0.02);
  const slot = (W - P.l - P.r) / 7;
  const y = (v) => H - P.b - (v / top) * (H - P.t - P.b);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Peak BAC each night this week">
      <line x1={P.l} x2={W - P.r} y1={y(0)} y2={y(0)} stroke={C.grid} />
      <line x1={P.l} x2={W - P.r} y1={y(limit)} y2={y(limit)} stroke={C.over} strokeOpacity="0.55" />
      <text x={W - P.r} y={y(limit) - 5} textAnchor="end" fill={C.axis} fontSize="11">your limit</text>
      {days.map((d, i) => {
        const cx = P.l + slot * i + slot / 2;
        const v = d.night?.peak || 0;
        const h = Math.max(0, y(0) - y(v));
        const bw = 22; const r = Math.min(4, h);
        const x0 = cx - bw / 2; const y0 = y(0) - h;
        const path = h > 0 ? `M${x0},${y(0)} V${y0 + r} Q${x0},${y0} ${x0 + r},${y0} H${x0 + bw - r} Q${x0 + bw},${y0} ${x0 + bw},${y0 + r} V${y(0)} Z` : '';
        const isSel = selected === i;
        return (
          <g key={i} onClick={() => d.night && onSelect(i)} style={{ cursor: d.night ? 'pointer' : 'default' }}>
            <rect x={cx - slot / 2} y={P.t} width={slot} height={H - P.t} fill="transparent" />
            {h > 0 && <path d={path} fill={d.night.over ? C.over : C.under} opacity={selected == null || isSel ? 1 : 0.55} />}
            {d.night?.over && <text x={cx} y={y0 - 5} textAnchor="middle" fill="#FF8A95" fontSize="10" fontWeight="700">over</text>}
            <text x={cx} y={H - 6} textAnchor="middle" fill={isSel ? '#F4EEFF' : C.axis} fontSize="11" fontWeight={isSel ? 700 : 500}>{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function WeeksLine({ weeks }) {
  const W = 320; const H = 150; const P = { l: 24, r: 14, t: 16, b: 24 };
  const [sel, setSel] = useState(weeks.length - 1);
  const top = Math.max(3, ...weeks.map((w) => w.count));
  const x = (i) => P.l + (i / (weeks.length - 1)) * (W - P.l - P.r);
  const y = (v) => H - P.b - (v / top) * (H - P.t - P.b);
  const d = weeks.map((w, i) => `${i ? 'L' : 'M'}${x(i)},${y(w.count)}`).join(' ');
  const months = weeks.map((w, i) => ({ i, m: w.start.toLocaleDateString(undefined, { month: 'short' }) }))
    .filter((w, i, arr) => i === 0 || arr[i - 1].m !== w.m);
  const w = weeks[sel];
  const step = (W - P.l - P.r) / (weeks.length - 1);
  return (
    <div className="stack" style={{ gap: 4 }}>
      <span className="small" style={{ minHeight: 20 }}>
        <b>{sel === weeks.length - 1 ? 'This week' : `Week of ${w.start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}</b>
        <span className="soft"> · {w.count} {w.count === 1 ? 'night' : 'nights'} out{w.over ? ` · ${w.over} over your limit` : ''}</span>
      </span>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Nights out per week, past 12 weeks. Tap a week for details.">
        {[0, top].map((v) => (
          <g key={v}>
            <line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} stroke={C.grid} />
            <text x={P.l - 6} y={y(v) + 4} textAnchor="end" fill={C.axis} fontSize="11">{v}</text>
          </g>
        ))}
        <path d={`${d} L${x(weeks.length - 1)},${y(0)} L${x(0)},${y(0)} Z`} fill={C.line} fillOpacity="0.08" />
        <path d={d} fill="none" stroke={C.line} strokeWidth="2" strokeLinejoin="round" />
        <line x1={x(sel)} x2={x(sel)} y1={P.t - 4} y2={y(0)} stroke="#F4EEFF" strokeOpacity="0.3" />
        {weeks.map((wk, i) => (
          <g key={i} onClick={() => setSel(i)} style={{ cursor: 'pointer' }}>
            <rect x={x(i) - step / 2} y={0} width={step} height={H} fill="transparent" />
            <circle cx={x(i)} cy={y(wk.count)} r={i === sel ? 6 : 4} fill={i === sel ? C.line : C.surface} stroke={i === sel ? C.surface : C.line} strokeWidth="2" />
          </g>
        ))}
        {months.map((m) => <text key={m.i} x={x(m.i)} y={H - 6} textAnchor="middle" fill={C.axis} fontSize="11">{m.m}</text>)}
      </svg>
      <span className="muted" style={{ fontSize: 12 }}>Tap a week to see it</span>
    </div>
  );
}

function Calendar({ days }) {
  const lastIdx = days.findIndex((d) => d.night?.isLast);
  const [sel, setSel] = useState(lastIdx);
  const pick = days[sel];
  return (
    <div className="stack" style={{ gap: 8 }}>
      <span className="small" style={{ minHeight: 20 }}>
        {pick?.night
          ? <><b>{pick.night.isLast ? 'Last night' : fmtDay(pick.date)}</b><span className="soft"> · peak {fmtBac(pick.night.peak)} · ~{pick.night.drinks} drinks{pick.night.over ? ' · over your limit' : ' · under your limit'}</span></>
          : <span className="soft">Tap a dot to see that night</span>}
      </span>
      <div className="cal">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <span key={i} className="cal-head">{d}</span>)}
        {days.map((d, i) => {
          const size = d.night ? 10 + Math.min(1.4, d.night.peak / d.limit) * 10 : 4;
          const dot = <span style={{ width: size, height: size, borderRadius: '50%', background: d.future ? 'transparent' : d.night ? (d.night.over ? C.over : C.under) : C.grid, outline: d.night?.isLast ? '2px solid #F4EEFF' : 'none', outlineOffset: 2 }} />;
          return d.night ? (
            <button key={i} type="button" className={`cal-cell cal-btn${i === sel ? ' on' : ''}`} onClick={() => setSel(i)}
              aria-label={`${fmtDay(d.date)}, peak ${fmtBac(d.night.peak)}${d.night.over ? ', over your limit' : ''}`} aria-pressed={i === sel}>
              {dot}
            </button>
          ) : <span key={i} className="cal-cell" aria-hidden="true">{dot}</span>;
        })}
      </div>
      <div className="row small muted" style={{ gap: 14, flexWrap: 'wrap' }}>
        <span className="row" style={{ gap: 6 }}><span className="dot" style={{ background: C.under }} />Under your limit</span>
        <span className="row" style={{ gap: 6 }}><span className="dot" style={{ background: C.over }} />Over your limit</span>
        <span className="row" style={{ gap: 6 }}><span className="dot ring" />Last night</span>
      </div>
    </div>
  );
}

// ---------- month insight ----------

function Ring({ pct }) {
  const r = 30; const c = 2 * Math.PI * r;
  return (
    <svg width="84" height="84" viewBox="0 0 84 84" role="img" aria-label={`${pct}% of nights under your limit`} style={{ flex: 'none' }}>
      <circle cx="42" cy="42" r={r} fill="none" stroke="#2A2140" strokeWidth="8" />
      <circle cx="42" cy="42" r={r} fill="none" stroke="#3DE0FF" strokeWidth="8" strokeLinecap="round"
        strokeDasharray={`${(pct / 100) * c} ${c}`} transform="rotate(-90 42 42)" style={{ transition: 'stroke-dasharray .8s ease-out' }} />
      <text x="42" y="47" textAnchor="middle" fill="#F4EEFF" fontSize="17" fontWeight="800" fontFamily="Unbounded, sans-serif">{pct}%</text>
    </svg>
  );
}

// Picks the headline, a comparison and tips from the past 4 weeks.
function monthInsight(nights, prevCount, busiest, level) {
  const total = nights.length;
  const under = nights.filter((n) => !n.over).length;
  const pct = total ? Math.round((under / total) * 100) : 100;
  let title; let body;
  if (total === 0) {
    title = 'A quiet month';
    body = 'No nights out in the past 4 weeks.';
  } else if (pct >= 80) {
    title = 'Hey, you’re doing great';
    body = `You stayed under your limit on ${under} of ${total} nights out.`;
  } else if (pct >= 50) {
    title = `You’re ${pct}% of the way to your goal`;
    body = `You stayed under your limit on ${under} of ${total} nights. One or two more and you’re there.`;
  } else {
    title = 'This month was a lot';
    body = `Only ${under} of ${total} nights stayed under your limit. Small changes add up.`;
  }
  const diff = total - prevCount;
  const trend = diff === 0 ? `Same number of nights out as the month before (${prevCount}).`
    : diff < 0 ? `${-diff} fewer ${-diff === 1 ? 'night' : 'nights'} out than the month before (${prevCount}).`
    : `${diff} more ${diff === 1 ? 'night' : 'nights'} out than the month before (${prevCount}).`;
  const tips = [
    `${busiest}s are your biggest nights. Try planning for one level lower than ${level.label} on your next ${busiest}.`,
    'Pick one night next week to go out sober, or switch to water after your second drink.',
    'Ask a friend in your squad to check in with you halfway through the night.',
  ];
  return { pct, title, body, trend, tips, total };
}

function MonthInsight({ insight }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="card stack reveal insight" style={{ gap: 12 }}>
      <span className="eyebrow" style={{ fontSize: 12, color: 'var(--cyan-soft)' }}>Your month · goal: stay under your limit</span>
      <div className="row" style={{ gap: 16, alignItems: 'center' }}>
        <Ring pct={insight.pct} />
        <div className="stack" style={{ gap: 4 }}>
          <span className="h-display" style={{ fontSize: 22, lineHeight: 1.15 }}>{insight.title}</span>
          <span className="soft" style={{ fontSize: 15 }}>{insight.body}</span>
        </div>
      </div>
      <span className="muted small">{insight.trend}</span>
      {insight.total > 0 && (
        <>
          <button type="button" className="insight-btn" aria-expanded={open} onClick={() => setOpen(!open)}>
            How can next month be better? <span aria-hidden="true">{open ? '−' : '+'}</span>
          </button>
          {open && (
            <ul className="tips reveal">
              {insight.tips.map((t, i) => <li key={i}>{t}</li>)}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

// ---------- screen ----------

function Stat({ label, value, tone }) {
  return (
    <div className="stat">
      <span className="muted small">{label}</span>
      <span className="h-display" style={{ fontSize: 24, color: tone === 'over' ? 'var(--red-soft)' : 'var(--text)' }}>{value}</span>
    </div>
  );
}

export default function Aftermath({ squad, allMembers, alerts, me }) {
  const [range, setRange] = useState('night');
  const last = useMemo(() => lastNightFor(me, squad, alerts, allMembers), [me, squad, alerts, allMembers]);
  const nights = useMemo(() => historyFor(me, last), [me, last]);
  const byDay = useMemo(() => new Map(nights.map((n) => [startOfDay(n.date).getTime(), n])), [nights]);
  const level = levelFor(last.limit);

  const weekStart = mondayOf(last.date);
  const weekDays = [...Array(7)].map((_, i) => {
    const date = new Date(weekStart.getTime() + i * DAY);
    return { date, label: date.toLocaleDateString(undefined, { weekday: 'narrow' }), night: byDay.get(startOfDay(date).getTime()) };
  });
  const lastIdx = weekDays.findIndex((d) => d.night?.isLast);
  const [sel, setSel] = useState(null);
  const selIdx = sel ?? lastIdx;
  const weekNights = weekDays.filter((d) => d.night).map((d) => d.night);
  const prevWeekCount = nights.filter((n) => n.date >= new Date(weekStart.getTime() - 7 * DAY) && n.date < weekStart).length;

  const weeks = [...Array(12)].map((_, i) => {
    const start = new Date(weekStart.getTime() - (11 - i) * 7 * DAY);
    const end = new Date(start.getTime() + 7 * DAY);
    const inWeek = nights.filter((n) => n.date >= start && n.date < end);
    return { start, count: inWeek.length, over: inWeek.filter((n) => n.over).length };
  });
  const calStart = new Date(weekStart.getTime() - 21 * DAY);
  const calDays = [...Array(28)].map((_, i) => {
    const date = new Date(calStart.getTime() + i * DAY);
    return { date, limit: last.limit, night: byDay.get(startOfDay(date).getTime()), future: date > last.date };
  });
  const monthNights = calDays.filter((d) => d.night).map((d) => d.night);
  const prevMonthCount = nights.filter((n) => n.date >= new Date(calStart.getTime() - 28 * DAY) && n.date < calStart).length;
  const busiestDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][(() => { const c = Array(7).fill(0); nights.forEach((n) => c[n.date.getDay()]++); return c.indexOf(Math.max(...c)); })()];
  const insight = monthInsight(monthNights, prevMonthCount, busiestDay, level);
  let streak = 0;
  for (let i = nights.length - 1; i >= 0 && !nights[i].over; i--) streak++;

  const squadRecap = allMembers
    .map((m) => ({ m, peak: peakFor(m, alerts), over: peakFor(m, alerts) >= num(m.bac_limit) || alerts.some((a) => a.subject_member_id === m.id && a.resolution !== 'superseded') }))
    .sort((a, b) => b.peak - a.peak);

  return (
    <main className="screen" style={{ gap: 16 }}>
      <div className="stack" style={{ gap: 4 }}>
        <span className="eyebrow">{squad.name} · the morning after</span>
        <h1 className="h-display h1">Your aftermath</h1>
      </div>

      <div className="seg" role="tablist" aria-label="Time range">
        {[['night', 'Last night'], ['week', 'This week'], ['month', 'Past month']].map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={range === k} className={range === k ? 'on' : ''} onClick={() => setRange(k)}>{l}</button>
        ))}
      </div>

      {range === 'night' && (
        <>
          <section className="card stack reveal" key="n1" style={{ gap: 10 }}>
            <span className="muted small">{fmtDay(last.date)} · planned: {level.label}</span>
            <div className="row" style={{ alignItems: 'baseline', gap: 12 }}>
              <span className="h-display" style={{ fontSize: 56, lineHeight: 1, color: last.over ? 'var(--red)' : 'var(--text)' }}>{fmtBac(last.peak)}</span>
              <span className="muted">peak BAC</span>
            </div>
            {last.over
              ? <span className="badge over">! Over your limit{last.firstHit ? ` at ${fmtTime(last.firstHit)}` : ''}</span>
              : <span className="badge ok">✓ Stayed under your limit</span>}
            <NightCurve n={last} />
          </section>
          <div className="stats">
            <Stat label="Est. drinks" value={`~${last.drinks}`} />
            <Stat label="Times you hit your limit" value={last.timesHit} tone={last.timesHit ? 'over' : null} />
            <Stat label="Friends who came for you" value={last.cameFor.length ? last.cameFor.join(', ') : '—'} />
            <Stat label="You went to find" value={last.wentFor.length ? last.wentFor.join(', ') : '—'} />
          </div>
          <section className="card stack" style={{ gap: 10 }}>
            <b>Your squad last night</b>
            <ul className="list" style={{ border: 'none' }}>
              {squadRecap.map(({ m, peak, over }) => (
                <li key={m.id} style={{ padding: 0, minHeight: 44 }}>
                  <span className="grow" style={{ fontWeight: 600 }}>{m.id === me.id ? 'You' : m.name}</span>
                  {m.has_band ? <span style={{ fontWeight: 700, color: over ? 'var(--red-soft)' : 'var(--soft)' }}>{fmtBac(peak)}{over ? ' · hit limit' : ''}</span> : <span className="muted small">no device</span>}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      {range === 'week' && (
        <>
          <section className="card stack reveal" key="w1" style={{ gap: 6 }}>
            <span className="h-display" style={{ fontSize: 26 }}>You went out {weekNights.length} {weekNights.length === 1 ? 'night' : 'nights'} this week</span>
            <span className="soft">{weekNights.filter((n) => n.over).length} over your limit · about {weekNights.reduce((a, n) => a + n.drinks, 0)} drinks · last week: {prevWeekCount}</span>
          </section>
          <section className="card stack" style={{ gap: 8 }}>
            <span className="muted small">
              {weekDays[selIdx]?.night
                ? `${fmtDay(weekDays[selIdx].date)} · peak ${fmtBac(weekDays[selIdx].night.peak)} · ~${weekDays[selIdx].night.drinks} drinks${weekDays[selIdx].night.over ? ' · over your limit' : ''}`
                : 'Tap a bar to see that night'}
            </span>
            <WeekBars days={weekDays} limit={last.limit} selected={selIdx >= 0 ? selIdx : null} onSelect={setSel} />
          </section>
        </>
      )}

      {range === 'month' && (
        <>
          <MonthInsight insight={insight} key="m0" />
          <div className="stats">
            <Stat label="Nights out, past 4 weeks" value={monthNights.length} />
            <Stat label="Over your limit" value={monthNights.filter((n) => n.over).length} tone={monthNights.some((n) => n.over) ? 'over' : null} />
          </div>
          <section className="card stack" style={{ gap: 8 }}>
            <b>Nights out per week</b>
            <WeeksLine weeks={weeks} />
          </section>
          <section className="card stack" style={{ gap: 12 }}>
            <b>Every night, past 4 weeks</b>
            <Calendar days={calDays} />
          </section>
          <div className="stats">
            <Stat label="Nights in a row under your limit" value={streak} />
            <Stat label="Busiest night" value={['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][(() => { const c = Array(7).fill(0); nights.forEach((n) => c[n.date.getDay()]++); return c.indexOf(Math.max(...c)); })()]} />
          </div>
        </>
      )}

      <p className="muted" style={{ fontSize: 12, textAlign: 'center' }}>
        Last night is from tonight’s session. Earlier nights are sample data for this demo.
      </p>
      <Link to="/" className="btn btn-ghost">Back to start</Link>
    </main>
  );
}
