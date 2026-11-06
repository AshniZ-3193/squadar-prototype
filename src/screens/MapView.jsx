import LiveMap from '../components/LiveMap.jsx';
import { MeterRow } from '../components/Bits.jsx';
import { byId, fmtBac, namesList, meter } from '../lib/logic.js';
import { distanceM, formatDistance, hasLoc } from '../lib/geo.js';
import { joinGoing } from '../lib/actions.js';
import { supabase } from '../lib/supabase.js';
import { getPositionOnce, requestOrientationPermission } from '../lib/device.js';
import { useState } from 'react';

export default function MapView({ squad, members, me, alert, subject, iAmGoing, onNavigate, onMe, locDenied }) {
  const [busy, setBusy] = useState(false);
  const [locState, setLocState] = useState(locDenied ? 'denied' : 'idle'); // idle | asking | denied
  const going = alert ? alert.going_ids.map((id) => byId(members, id)).filter(Boolean) : [];
  const goingNames = going.map((m) => (m.id === me.id ? 'You' : m.name));
  const iAmSubject = alert && subject && subject.id === me.id;
  const overCount = members.filter((m) => meter(m).level === 'over').length;
  const located = members.filter(hasLoc).length;

  const help = async () => { setBusy(true); await joinGoing(alert.id, me.id); setBusy(false); };

  return (
    <main className="map-screen">
      <div className="map-fill">
        <LiveMap members={members} meId={me.id} subjectId={subject?.id} goingIds={alert?.going_ids || []}
          fitPadding={{ paddingTopLeft: [50, alert ? 200 : 110], paddingBottomRight: [50, 250] }} fitKey={alert?.id} />
      </div>

      <div className="map-top">
        <div className="row">
          <div className="glass grow stack" style={{ gap: 2 }}>
            <span className="eyebrow" style={{ fontSize: 12 }}>{squad.name}</span>
            <span className="h-display" style={{ fontSize: 16, fontWeight: 700 }}>
              {members.length} out{overCount > 0 && <span style={{ color: '#FF5A68' }}> · {overCount} at limit</span>}
            </span>
          </div>
          <button type="button" onClick={onMe} aria-label="Me and settings"
            style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--text)', color: 'var(--bg)', border: 'none', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
            Me
          </button>
        </div>

        {alert && subject && !iAmSubject && (
          <div className="banner-red row" role="status">
            <span className="h-display" style={{ fontSize: 20, color: 'var(--red)' }}>{fmtBac(alert.bac)}</span>
            <span className="grow" style={{ fontSize: 15, lineHeight: 1.3 }}>
              <b>{subject.name} hit their limit</b><br />
              <span className="soft">
                {goingNames.length ? `${namesList(goingNames)} ${goingNames.length === 1 && goingNames[0] !== 'You' ? 'is' : 'are'} going` : 'Waiting for a friend to go'}
                {hasLoc(me) && hasLoc(subject) ? ` · ${formatDistance(distanceM(me, subject))} away` : ''}
              </span>
            </span>
            <button type="button" className="btn btn-primary" style={{ width: 'auto', minHeight: 44, fontSize: 15, padding: '0 14px', boxShadow: 'none' }}
              disabled={busy} onClick={iAmGoing ? onNavigate : help}>{iAmGoing ? 'Navigate' : 'I’ll go'}</button>
          </div>
        )}

        {iAmSubject && (
          <div className="banner-cyan" role="status">
            <b>Your squad’s been pinged.</b>{' '}
            <span className="soft">
              {goingNames.length ? `${namesList(goingNames)} ${goingNames.length === 1 ? 'is' : 'are'} coming to find you.` : 'Your closest friends are being asked to come find you.'}
            </span>
          </div>
        )}

        {!hasLoc(me) && me.location_source !== 'manual' && (
          <div className="glass stack small" style={{ gap: 8 }}>
            {locState === 'denied' ? (
              <>
                <b>Location is blocked on this phone.</b>
                <span className="soft">iPhone: Settings → Privacy &amp; Security → Location Services → on, and Safari Websites → While Using. Then Settings → Apps → Safari → Location → Ask. Reload this page.</span>
                <span className="soft">Android: Chrome → ⋮ → Settings → Site settings → Location → allow this site.</span>
              </>
            ) : (
              <span className="soft">{located < 1 ? 'Waiting for locations…' : 'Your location isn’t on the map yet.'}</span>
            )}
            <button type="button" className="btn btn-primary" style={{ minHeight: 44, fontSize: 15, boxShadow: 'none' }} disabled={locState === 'asking'}
              onClick={async () => {
                requestOrientationPermission();
                setLocState('asking');
                const r = await getPositionOnce();
                if (r.ok) {
                  await supabase.from('members').update({ lat: r.lat, lng: r.lng, accuracy_m: r.accuracy, location_source: 'gps', location_updated_at: new Date().toISOString() }).eq('id', me.id);
                  setLocState('idle');
                } else setLocState('denied');
              }}>
              {locState === 'asking' ? 'Asking…' : 'Turn on location'}
            </button>
          </div>
        )}
      </div>

      <div className="sheet">
        <div className="grabber" />
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
          <h2 className="h-display" style={{ fontSize: 17, fontWeight: 700 }}>Drunk-o-meter</h2>
          <span className="muted" style={{ fontSize: 13 }}>fills to each person’s limit</span>
        </div>
        <MeterRow members={members} meId={me.id} />
      </div>
    </main>
  );
}
