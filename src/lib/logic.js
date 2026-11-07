import { walkFeet, hasPos } from './floor.js';

export const num = (v) => (v == null ? 0 : Number(v));
export const fmtBac = (v) => num(v).toFixed(2).replace(/^0/, '0');

// How full someone's meter is, relative to their own limit.
export function meter(m) {
  if (!m.has_band) return { ratio: 0, level: 'none' };
  const limit = num(m.bac_limit) || 0.08;
  const ratio = Math.max(0, Math.min(1, num(m.bac) / limit));
  const level = ratio >= 1 ? 'over' : ratio >= 0.6 ? 'close' : 'ok';
  return { ratio, level };
}

export const activeMembers = (members) => members.filter((m) => m.status === 'active');

export function openAlert(alerts) {
  const open = alerts.filter((a) => a.status === 'open');
  return open.length ? open[open.length - 1] : null;
}

export function recentResolved(alerts, ms = 90000) {
  const r = alerts
    .filter((a) => a.status === 'resolved' && a.resolved_at && Date.now() - new Date(a.resolved_at).getTime() < ms)
    .sort((a, b) => new Date(b.resolved_at) - new Date(a.resolved_at));
  return r[0] || null;
}

// Members closest to the subject, best first. Falls back to join order without locations.
export function rankHelpers(members, subject, exclude = []) {
  return activeMembers(members)
    .filter((m) => m.id !== subject.id && !exclude.includes(m.id))
    .filter((m) => !(m.has_band && meter(m).level === 'over'))
    .map((m, i) => ({ m, d: hasPos(m) && hasPos(subject) ? walkFeet(m, subject) : 1e9 + i }))
    .sort((a, b) => a.d - b.d)
    .map((x) => x.m);
}

export const byId = (members, id) => members.find((m) => m.id === id) || null;

export function namesList(names) {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(', ')} + ${names[names.length - 1]}`;
}

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function newCode() {
  let s = '';
  for (let i = 0; i < 6; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return s;
}

export const initial = (name) => (name || '?').trim().charAt(0).toUpperCase();

// "How much are you planning to drink tonight?" Each choice sets a simulated BAC limit.
export const LEVELS = [
  { key: 'none', label: 'Not drinking', hint: '0 drinks', limit: 0.02 },
  { key: 'tipsy', label: 'Tipsy', hint: 'about 1–2 drinks', limit: 0.04 },
  { key: 'buzzed', label: 'Buzzed', hint: 'about 3–4 drinks', limit: 0.06 },
  { key: 'drunk', label: 'Drunk', hint: 'about 5–6 drinks', limit: 0.08 },
  { key: 'wasted', label: 'Wasted', hint: '7+ drinks', limit: 0.12 },
];
export function levelFor(limit) {
  const l = num(limit);
  return LEVELS.reduce((best, x) => (Math.abs(x.limit - l) < Math.abs(best.limit - l) ? x : best), LEVELS[0]);
}
// Rough drinks estimate from a peak BAC (about 0.018 per standard drink).
export const drinksFrom = (bac) => Math.max(0, Math.round(num(bac) / 0.018));
