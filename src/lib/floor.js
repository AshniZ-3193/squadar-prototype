// Staged floor plan of Tangen Hall, 4th floor (schematic, not to scale).
// Units are roughly feet. x right, y down. People are placed at landmarks;
// a member's spot is stored in members.lng (x) and members.lat (y).

export const PLAN = { w: 150, h: 230 };

export const ROOMS = [
  { key: 'classroom', label: 'Classroom', x: 8, y: 52, w: 44, h: 46 },
  { key: 'offices', label: '', x: 96, y: 8, w: 46, h: 92 },
  { key: 'conference', label: 'Conference', x: 8, y: 106, w: 44, h: 62 },
  { key: 'bathrooms', label: 'Bathrooms', x: 96, y: 108, w: 46, h: 52 },
  { key: 'elevators', label: 'Elevators', x: 96, y: 168, w: 46, h: 52 },
];

// Walkable space: the main corridor and the hallway off its far end.
export const HALLS = [
  { x: 58, y: 18, w: 32, h: 204 }, // main corridor
  { x: 8, y: 18, w: 82, h: 28 }, // hallway to the classroom
];

// Where people stand. `node` is where the landmark meets the walking route.
export const LANDMARKS = {
  elevators: { label: 'Elevators', short: 'Elevators', x: 119, y: 196, node: 0, at: 'by the elevators' },
  bathrooms: { label: 'Bathrooms', short: 'Bathrooms', x: 119, y: 137, node: 1, at: 'outside the bathrooms' },
  conference: { label: 'Conference room', short: 'Conference', x: 30, y: 140, node: 1, at: 'in the conference room, across from the bathrooms' },
  hallway: { label: 'Hallway', short: 'Hallway', x: 40, y: 32, node: 3, at: 'in the hallway' },
  classroom: { label: 'Classroom', short: 'Classroom', x: 30, y: 79, node: 4, at: 'at the classroom entrance' },
};
export const LANDMARK_KEYS = Object.keys(LANDMARKS);

// Walking route, in order: elevators → bathrooms → corridor end → hallway → classroom door.
const NODES = [
  { x: 74, y: 194 },
  { x: 74, y: 136 },
  { x: 74, y: 32 },
  { x: 40, y: 32 },
  { x: 24, y: 32 },
];
const FORWARD = [
  'Head up the corridor from the elevators',
  'Keep going past the bathrooms and the conference room',
  'At the end of the corridor, turn left into the hallway',
  'Follow the hallway to the end',
];
const BACKWARD = [
  'Walk down the corridor to the elevators',
  'Walk down the corridor toward the bathrooms',
  'At the end of the hallway, turn right into the corridor',
  'Walk back along the hallway',
];
const LEAVE = {
  conference: 'Step out of the conference room into the corridor',
  classroom: 'Step out of the classroom into the hallway',
};

const SLOTS = [[0, 0], [-11, -8], [11, -8], [-11, 9], [11, 9], [0, -16], [0, 16], [-20, 0], [20, 0]];

export const hasPos = (m) => m && m.lat != null && m.lng != null;
export const posOf = (m) => (hasPos(m) ? { x: Number(m.lng), y: Number(m.lat) } : null);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export function landmarkOf(m) {
  const p = posOf(m);
  if (!p) return null;
  let best = null;
  let bestD = Infinity;
  for (const k of LANDMARK_KEYS) {
    const d = dist(p, LANDMARKS[k]);
    if (d < bestD) { bestD = d; best = k; }
  }
  return best;
}

// Spot for the next person at a landmark, so pins don't sit on top of each other.
export function spotAt(key, othersAtLandmark) {
  const L = LANDMARKS[key];
  const [dx, dy] = SLOTS[othersAtLandmark % SLOTS.length];
  return { lat: L.y + dy, lng: L.x + dx };
}

// Route between two people: points to draw, walking distance and step-by-step text.
export function route(fromMember, toMember, toName = 'They') {
  const a = landmarkOf(fromMember);
  const b = landmarkOf(toMember);
  const pa = posOf(fromMember);
  const pb = posOf(toMember);
  if (!a || !b) return null;
  const na = LANDMARKS[a].node;
  const nb = LANDMARKS[b].node;
  const pts = [pa];
  const steps = [];
  if (a === b) {
    steps.push(`${toName} is right here, ${LANDMARKS[b].at}`);
    pts.push(pb);
    return { pts, steps, feet: Math.round(dist(pa, pb)), same: true };
  }
  if (LEAVE[a]) steps.push(LEAVE[a]);
  pts.push(NODES[na]);
  if (na === nb) {
    steps.push('Cross the corridor');
  } else if (na < nb) {
    for (let i = na; i < nb; i++) { steps.push(FORWARD[i]); pts.push(NODES[i + 1]); }
  } else {
    for (let i = na; i > nb; i--) { steps.push(BACKWARD[i - 1]); pts.push(NODES[i - 1]); }
  }
  pts.push(pb);
  steps.push(`${toName} is ${LANDMARKS[b].at}`);
  let feet = 0;
  for (let i = 1; i < pts.length; i++) feet += dist(pts[i - 1], pts[i]);
  return { pts, steps, feet: Math.round(feet), same: false };
}

export const walkFeet = (a, b) => {
  const r = route(a, b);
  return r ? r.feet : null;
};

export const formatFeet = (ft) => (ft == null ? '—' : `${Math.max(5, Math.round(ft / 5) * 5)} ft`);
