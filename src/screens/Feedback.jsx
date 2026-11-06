import { useState } from 'react';
import { submitFeedback } from '../lib/actions.js';
import { setFeedbackDone } from '../lib/storage.js';
import { byId } from '../lib/logic.js';

const Q = {
  q1: ['Find My', 'Life360', 'Snap Map', 'Group chat', 'We stick together', 'Nothing'],
  q3: ['Less useful', 'About the same', 'More useful'],
  q5: ['Fine with it', 'Only with close friends', 'Not OK'],
  q6: ['Fine with it', 'Only once I hit my limit', 'Not OK'],
  q7: ['Love it', 'It’s fine', 'Feels too personal'],
  q8: ['I’d wear it', 'Only if it looks good', 'I wouldn’t'],
  q9: ['Yes', 'No'],
  q11: ['BAC, default 0.08', 'BAC I choose', 'Number of drinks', 'Heart rate', 'Something else'],
  q12: ['Closest 2 friends', 'Everyone', 'Let the squad choose'],
  q13: ['Helpful', 'Not needed'],
  q14: ['Needed', 'Not needed'],
  q15: ['Yes', 'No', 'Only if a friend confirms'],
};

function Chips({ options, value, onChange, multi }) {
  const isOn = (o) => (multi ? (value || []).includes(o) : value === o);
  const toggle = (o) => {
    if (!multi) return onChange(value === o ? null : o);
    const cur = value || [];
    onChange(cur.includes(o) ? cur.filter((x) => x !== o) : [...cur, o]);
  };
  return (
    <div className="chips">
      {options.map((o) => (
        <button type="button" key={o} className={`chip${isOn(o) ? ' on' : ''}`} aria-pressed={isOn(o)} onClick={() => toggle(o)}>{o}</button>
      ))}
    </div>
  );
}

function Scale({ value, onChange, low, high }) {
  return (
    <>
      <div className="scale">
        {[1, 2, 3, 4, 5].map((n) => (
          <button type="button" key={n} className={value === n ? 'on' : ''} aria-pressed={value === n} onClick={() => onChange(value === n ? null : n)}>{n}</button>
        ))}
      </div>
      <div className="scale-ends"><span>{low}</span><span>{high}</span></div>
    </>
  );
}

export default function Feedback({ squad, allMembers, alerts, me, isHost, onDone }) {
  const [a, setA] = useState({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (v) => setA((s) => ({ ...s, [k]: v }));
  const host = byId(allMembers, squad.host_member_id);

  const role = alerts.some((x) => x.subject_member_id === me.id) ? 'at limit'
    : alerts.some((x) => x.going_ids.includes(me.id)) ? 'went to find'
    : alerts.some((x) => x.responder_ids.includes(me.id)) ? 'alerted'
    : 'watched';

  const send = async () => {
    setBusy(true); setErr('');
    try {
      await submitFeedback({
        squad_code: squad.code,
        member_name: me.name,
        was_host: isHost,
        test_role: role,
        q1_track_friends_now: (a.q1 || []).join('; ') || null,
        q2_would_use_1to5: a.q2 ?? null,
        q3_vs_current: a.q3 ?? null,
        q4_vs_current_why: a.q4?.trim() || null,
        q5_share_location: a.q5 ?? null,
        q6_share_bac: a.q6 ?? null,
        q7_see_friends_meters: a.q7 ?? null,
        q8_wristband: a.q8 ?? null,
        q9_notify_own_limit: a.q9 ?? null,
        q10_like_own_limit_1to5: a.q10 ?? null,
        q11_limit_based_on: a.q11 ?? null,
        q12_full_screen_alert_who: a.q12 ?? null,
        q13_see_who_is_searching: a.q13 ?? null,
        q14_found_her_update: a.q14 ?? null,
        q15_im_good_option: a.q15 ?? null,
        q16_liked: a.q16?.trim() || null,
        q17_disliked: a.q17?.trim() || null,
        q18_features_wanted: a.q18?.trim() || null,
        q19_other_feedback: a.q19?.trim() || null,
        q20_follow_up_contact: a.q20?.trim() || null,
      });
      setFeedbackDone(squad.code);
      onDone();
    } catch {
      setErr('Couldn’t send. Check your connection and try again.');
      setBusy(false);
    }
  };

  const T = ({ k, label, placeholder }) => (
    <label className="q">
      <span className="q-label">{label}</span>
      <textarea className="textarea" placeholder={placeholder} value={a[k] || ''} onChange={(e) => set(k)(e.target.value)} />
    </label>
  );

  return (
    <main className="screen" style={{ gap: 22 }}>
      <div className="stack" style={{ gap: 8 }}>
        <span className="eyebrow">{squad.status === 'ended' ? `${host && host.id !== me.id ? host.name : 'You'} ended the night` : 'You left the squad'}</span>
        <h1 className="h-display" style={{ fontSize: 28 }}>How was Squadar?</h1>
        <p className="soft" style={{ fontSize: 16 }}>About 4 minutes, mostly taps. Be honest. We’re testing the idea, not you. Skip anything.</p>
      </div>

      <h2 className="section-title">THE IDEA</h2>
      <div className="q"><span className="q-label">1. How do you keep track of friends on a night out now? <span className="muted">(pick any)</span></span>
        <Chips multi options={Q.q1} value={a.q1} onChange={set('q1')} /></div>
      <div className="q"><span className="q-label">2. Would you use something like Squadar on a night out?</span>
        <Scale value={a.q2} onChange={set('q2')} low="Never" high="Every time" /></div>
      <div className="q"><span className="q-label">3. Compared with what you use now, Squadar is…</span>
        <Chips options={Q.q3} value={a.q3} onChange={set('q3')} /></div>
      {T({ k: 'q4', label: '4. Why? (optional)', placeholder: 'e.g. Life360 already does…' })}

      <h2 className="section-title">SHARING</h2>
      <div className="q"><span className="q-label">5. Sharing your location with your squad, just for the night</span>
        <Chips options={Q.q5} value={a.q5} onChange={set('q5')} /></div>
      <div className="q"><span className="q-label">6. Sharing your BAC with your squad through the night</span>
        <Chips options={Q.q6} value={a.q6} onChange={set('q6')} /></div>
      <div className="q"><span className="q-label">7. Seeing your friends’ drunk-o-meters</span>
        <Chips options={Q.q7} value={a.q7} onChange={set('q7')} /></div>
      <div className="q"><span className="q-label">8. Wearing a wristband paired with the app</span>
        <Chips options={Q.q8} value={a.q8} onChange={set('q8')} /></div>

      <h2 className="section-title">LIMITS &amp; ALERTS</h2>
      <div className="q"><span className="q-label">9. Want a notification when <i>you</i> reach your limit?</span>
        <Chips options={Q.q9} value={a.q9} onChange={set('q9')} /></div>
      <div className="q"><span className="q-label">10. How much do you like setting your own limit?</span>
        <Scale value={a.q10} onChange={set('q10')} low="Not at all" high="A lot" /></div>
      <div className="q"><span className="q-label">11. Your limit should be based on…</span>
        <Chips options={Q.q11} value={a.q11} onChange={set('q11')} /></div>
      <div className="q"><span className="q-label">12. When someone hits their limit, who should get the full-screen alert?</span>
        <Chips options={Q.q12} value={a.q12} onChange={set('q12')} /></div>
      <div className="q"><span className="q-label">13. Seeing who’s already going to find someone is…</span>
        <Chips options={Q.q13} value={a.q13} onChange={set('q13')} /></div>
      <div className="q"><span className="q-label">14. Telling the squad someone was found is…</span>
        <Chips options={Q.q14} value={a.q14} onChange={set('q14')} /></div>
      <div className="q"><span className="q-label">15. Should the person who hit their limit be able to say “I’m good, no help needed”?</span>
        <Chips options={Q.q15} value={a.q15} onChange={set('q15')} /></div>

      <h2 className="section-title">IN YOUR WORDS</h2>
      {T({ k: 'q16', label: '16. One thing you really liked' })}
      {T({ k: 'q17', label: '17. One thing you really didn’t like' })}
      {T({ k: 'q18', label: '18. Any feature you’d want?' })}
      {T({ k: 'q19', label: '19. Anything else: the idea, the screens, the experience, questions' })}
      <label className="q">
        <span className="q-label">20. Name and email or phone, if we can follow up <span className="muted">(optional)</span></span>
        <input className="input" style={{ fontSize: 16, fontWeight: 500 }} placeholder="Name · contact" value={a.q20 || ''} onChange={(e) => set('q20')(e.target.value)} />
      </label>

      {err && <p className="error">{err}</p>}
      <button type="button" className="btn btn-primary big" disabled={busy} onClick={send}>{busy ? 'Sending…' : 'Send feedback'}</button>
    </main>
  );
}
