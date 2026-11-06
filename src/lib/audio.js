// Alarm sound for the alert takeover.
// Browsers only allow a site to make sound after the person has tapped it.
// iPhones only count touchend/click (not touch-down) as that tap, and need a
// sound actually started inside it, so we play a silent blip on every tap.
let ctx = null;

export function unlockAudio() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!ctx) ctx = new AC();
    if (ctx.state !== 'running') ctx.resume();
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
  } catch { /* no audio */ }
}

if (typeof window !== 'undefined') {
  ['touchend', 'click', 'keydown'].forEach((ev) => window.addEventListener(ev, unlockAudio, { passive: true }));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && ctx && ctx.state !== 'running') ctx.resume().catch(() => {});
  });
}

// On iPhone (iOS 16.4+), "playback" lets the alarm sound even with the silent switch on.
function loudSession(on) {
  try {
    if (navigator.audioSession) navigator.audioSession.type = on ? 'playback' : 'auto';
  } catch { /* unsupported */ }
}

function beep(t, freq, len, type = 'square', vol = 0.3) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + len);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + len + 0.02);
}

export function playAlarm() {
  try {
    if (navigator.vibrate) navigator.vibrate([300, 120, 300, 120, 600]);
    if (!ctx) return;
    loudSession(true);
    if (ctx.state !== 'running') ctx.resume().catch(() => {});
    const start = ctx.currentTime + 0.05;
    for (let i = 0; i < 8; i++) beep(start + i * 0.28, i % 2 === 0 ? 880 : 660, 0.26);
    setTimeout(() => loudSession(false), 3000);
  } catch { /* ignore */ }
}

export function playChime() {
  try {
    if (navigator.vibrate) navigator.vibrate([80, 60, 80]);
    if (!ctx) return;
    if (ctx.state !== 'running') ctx.resume().catch(() => {});
    const t = ctx.currentTime + 0.02;
    beep(t, 660, 0.3, 'sine', 0.2);
    beep(t + 0.15, 990, 0.3, 'sine', 0.2);
  } catch { /* ignore */ }
}

export const audioReady = () => Boolean(ctx && ctx.state === 'running');
