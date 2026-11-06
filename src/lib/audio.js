// Alarm sound for the alert takeover. Browsers only allow sound after the
// person has tapped something, so we unlock audio on the first tap.
let ctx = null;

export function unlockAudio() {
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
  } catch { /* no audio */ }
}

if (typeof window !== 'undefined') {
  const once = () => { unlockAudio(); window.removeEventListener('pointerdown', once); };
  window.addEventListener('pointerdown', once);
}

export function playAlarm() {
  try {
    if (navigator.vibrate) navigator.vibrate([300, 120, 300, 120, 600]);
    if (!ctx) return;
    const start = ctx.currentTime + 0.05;
    for (let i = 0; i < 6; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = i % 2 === 0 ? 880 : 660;
      const t = start + i * 0.28;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.27);
    }
  } catch { /* ignore */ }
}

export function playChime() {
  try {
    if (navigator.vibrate) navigator.vibrate([80, 60, 80]);
    if (!ctx) return;
    const t = ctx.currentTime + 0.02;
    [660, 990].forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.0001, t + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.2, t + i * 0.15 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.15 + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t + i * 0.15);
      osc.stop(t + i * 0.15 + 0.32);
    });
  } catch { /* ignore */ }
}
