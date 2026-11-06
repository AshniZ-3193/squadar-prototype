import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { meter, fmtBac, initial } from '../lib/logic.js';
import { hasLoc, DEFAULT_CENTER } from '../lib/geo.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function pinHtml(m, { meId, subjectId, goingIds }) {
  const isMe = m.id === meId;
  const isSubject = m.id === subjectId;
  const isGoing = goingIds.includes(m.id);
  const { ratio, level } = meter(m);
  const av = `<div class="pin-av${isMe ? ' me' : ''}${isGoing ? ' going' : ''}${isSubject ? ' subject' : ''}">${isMe ? 'You' : esc(initial(m.name))}</div>`;
  const bar = m.has_band
    ? `<div class="pin-meter"><div class="lvl-${level}" style="height:${Math.max(6, ratio * 100)}%"></div></div>`
    : '';
  const label = isSubject
    ? `${esc(m.name)} ${fmtBac(m.bac)}`
    : isGoing ? `${isMe ? 'You' : esc(m.name)} · going`
    : `${isMe ? 'You' : esc(m.name)}${m.has_band ? ' ' + fmtBac(m.bac) : ''}`;
  return `<div class="pin"><div class="pin-row">${isSubject ? '<div class="pin-ring"></div>' : ''}${av}${bar}</div><span class="pin-tag${isSubject ? ' subject' : isGoing ? ' going' : ''}">${label}</span></div>`;
}

// Real map (dark tiles) with each friend's pin + drunk-o-meter.
export default function LiveMap({
  members, meId, subjectId = null, goingIds = [], onMapClick, selectedId, fitKey,
  fitPadding = { paddingTopLeft: [50, 60], paddingBottomRight: [50, 60] },
}) {
  const el = useRef(null);
  const map = useRef(null);
  const layer = useRef(null);
  const fitted = useRef('');
  const clickRef = useRef(onMapClick);
  clickRef.current = onMapClick;

  useEffect(() => {
    map.current = L.map(el.current, { zoomControl: false, attributionControl: true }).setView([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], 16);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
      attribution: '&copy; OpenStreetMap &copy; CARTO',
    }).addTo(map.current);
    layer.current = L.layerGroup().addTo(map.current);
    map.current.on('click', (e) => clickRef.current && clickRef.current(e.latlng));
    const ro = new ResizeObserver(() => map.current && map.current.invalidateSize());
    ro.observe(el.current);
    return () => { ro.disconnect(); map.current.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    if (!map.current) return;
    layer.current.clearLayers();
    const located = members.filter((m) => m.status === 'active' && hasLoc(m));
    located.forEach((m) => {
      const icon = L.divIcon({ className: '', html: pinHtml(m, { meId, subjectId, goingIds }), iconSize: [0, 0] });
      const mk = L.marker([m.lat, m.lng], { icon, zIndexOffset: m.id === subjectId ? 1000 : m.id === selectedId ? 900 : 0 });
      mk.addTo(layer.current);
    });
    const key = `${located.map((m) => m.id).sort().join(',')}|${fitKey ?? ''}`;
    if (located.length && fitted.current !== key) {
      fitted.current = key;
      if (located.length === 1) map.current.setView([located[0].lat, located[0].lng], 17);
      else map.current.fitBounds(L.latLngBounds(located.map((m) => [m.lat, m.lng])), { ...fitPadding, maxZoom: 18 });
    }
  }, [members, meId, subjectId, goingIds, selectedId, fitKey]);

  return <div ref={el} style={{ position: 'absolute', inset: 0 }} />;
}
