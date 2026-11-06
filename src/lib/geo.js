const R = 6371000;
const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;

export const hasLoc = (m) => m && m.lat != null && m.lng != null;

export function distanceM(a, b) {
  if (!hasLoc(a) || !hasLoc(b)) return null;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function bearingDeg(a, b) {
  if (!hasLoc(a) || !hasLoc(b)) return null;
  const y = Math.sin(rad(b.lng - a.lng)) * Math.cos(rad(b.lat));
  const x = Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) - Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lng - a.lng));
  return (deg(Math.atan2(y, x)) + 360) % 360;
}

export function formatDistance(m) {
  if (m == null) return '—';
  const feet = m * 3.28084;
  if (feet < 500) return `${Math.max(10, Math.round(feet / 10) * 10)} ft`;
  const mi = m / 1609.34;
  return `${mi < 10 ? mi.toFixed(1) : Math.round(mi)} mi`;
}

export function walkMinutes(m) {
  if (m == null) return null;
  return Math.max(1, Math.round(m / 80)); // ~80 m per minute
}

const DIRS = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];
export const compassWord = (b) => (b == null ? '' : DIRS[Math.round(b / 45) % 8]);

// Move a point by meters east/north (for demo positions).
export function offset(center, eastM, northM) {
  return {
    lat: center.lat + northM / 111320,
    lng: center.lng + eastM / (111320 * Math.cos(rad(center.lat))),
  };
}

export const DEFAULT_CENTER = { lat: 39.9522, lng: -75.1932 }; // Penn campus
