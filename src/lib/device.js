import { useEffect, useRef, useState } from 'react';
import { supabase } from './supabase.js';

// ---- Compass heading (for the arrow on Finding screen) ----
export function requestOrientationPermission() {
  // iOS needs this to be called directly inside a tap.
  try {
    const D = window.DeviceOrientationEvent;
    if (D && typeof D.requestPermission === 'function') {
      return D.requestPermission().catch(() => 'denied');
    }
  } catch { /* ignore */ }
  return Promise.resolve('granted');
}

export function useHeading() {
  const [heading, setHeading] = useState(null);
  useEffect(() => {
    const onAbs = (e) => {
      if (e.alpha != null) setHeading((360 - e.alpha) % 360);
    };
    const onRel = (e) => {
      if (typeof e.webkitCompassHeading === 'number') setHeading(e.webkitCompassHeading);
    };
    window.addEventListener('deviceorientationabsolute', onAbs);
    window.addEventListener('deviceorientation', onRel);
    return () => {
      window.removeEventListener('deviceorientationabsolute', onAbs);
      window.removeEventListener('deviceorientation', onRel);
    };
  }, []);
  return heading;
}

// ---- One-off location request (used in the consent step) ----
export function getPositionOnce(timeoutMs = 9000) {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve({ ok: false, reason: 'unsupported' });
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ ok: true, lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      (err) => resolve({ ok: false, reason: err.code === 1 ? 'denied' : 'unavailable' }),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 10000 }
    );
  });
}

// ---- Keep this phone's location up to date while the app is open ----
export function useLocationReporter(me, enabled) {
  const last = useRef({ t: 0, lat: null, lng: null });
  const [status, setStatus] = useState('idle'); // idle | watching | denied | unsupported
  const meId = me?.id;
  const manual = me?.location_source === 'manual';
  const hasFix = me?.lat != null; // restart watching once a retry gets a first fix

  useEffect(() => {
    if (!enabled || !meId) return undefined;
    if (!('geolocation' in navigator)) { setStatus('unsupported'); return undefined; }
    setStatus('watching');
    const id = navigator.geolocation.watchPosition(
      async (p) => {
        if (manual) return; // the facilitator placed this person by hand
        const { latitude: lat, longitude: lng, accuracy } = p.coords;
        const now = Date.now();
        const moved = last.current.lat == null ? Infinity
          : Math.hypot((lat - last.current.lat) * 111320, (lng - last.current.lng) * 85000);
        if (now - last.current.t < 4000 && moved < 8) return;
        last.current = { t: now, lat, lng };
        await supabase.from('members').update({
          lat, lng, accuracy_m: accuracy, location_source: 'gps', location_updated_at: new Date().toISOString(),
        }).eq('id', meId);
      },
      (err) => setStatus(err.code === 1 ? 'denied' : 'watching'),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [enabled, meId, manual, hasFix]);

  return status;
}

// ---- Keep the screen awake during the session (where supported) ----
export function useWakeLock(enabled) {
  useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) return undefined;
    let lock = null;
    const get = () => navigator.wakeLock.request('screen').then((l) => { lock = l; }).catch(() => {});
    get();
    const onVis = () => { if (document.visibilityState === 'visible') get(); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      if (lock) lock.release().catch(() => {});
    };
  }, [enabled]);
}
