import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { TopBar } from '../components/Bits.jsx';
import * as I from '../components/Icons.jsx';
import { createSquad, findSquad, addMember } from '../lib/actions.js';
import { getPositionOnce, requestOrientationPermission } from '../lib/device.js';
import { setMemberId, setLocationConsent, getMemberId } from '../lib/storage.js';
import { unlockAudio } from '../lib/audio.js';

const LIMITS = ['0.04', '0.06', '0.08', 'Custom'];

export default function Onboard({ mode }) {
  const isCreate = mode === 'create';
  const nav = useNavigate();
  const params = useParams();
  const linkCode = (params.code || '').toUpperCase();

  const [step, setStep] = useState(isCreate ? 1 : linkCode ? 0 : 1);
  const [squadName, setSquadName] = useState('Fri night squad');
  const [code, setCode] = useState(linkCode);
  const [squad, setSquad] = useState(null);
  const [name, setName] = useState('');
  const [limitChoice, setLimitChoice] = useState(null);
  const [custom, setCustom] = useState('0.07');
  const [pairing, setPairing] = useState('idle'); // idle | searching | paired | skipped
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));

  // Opened via invite link: look the squad up straight away.
  useEffect(() => {
    if (isCreate || !linkCode) return;
    findSquad(linkCode).then((s) => {
      if (s && s.status !== 'ended') {
        if (getMemberId(s.code)) { nav(`/s/${s.code}`, { replace: true }); return; }
        setSquad(s); setStep(2);
      } else { setStep(1); setErr('That squad link has expired. Ask for the code.'); }
    }).catch(() => { setStep(1); });
  }, [isCreate, linkCode, nav]);

  const limit = limitChoice === 'Custom' ? Number(custom) || 0.08 : Number(limitChoice || '0.08');
  const pct = Math.min(step - 1, 5) * 20;

  const checkCode = async () => {
    setErr(''); setBusy(true);
    try {
      const s = await findSquad(code);
      if (!s) setErr('No squad with that code. Check the letters and try again.');
      else if (s.status === 'ended') setErr('That squad’s night has already ended.');
      else if (getMemberId(s.code)) nav(`/s/${s.code}`);
      else { setSquad(s); setStep(2); }
    } catch { setErr('Couldn’t reach the server. Check your connection.'); }
    setBusy(false);
  };

  const pickLimit = (v) => {
    setLimitChoice(v);
    if (v !== 'Custom') later(() => setStep(4), 450);
  };

  const pair = () => {
    if (pairing !== 'idle') return;
    setPairing('searching');
    later(() => { setPairing('paired'); later(() => setStep(5), 900); }, 2500);
  };

  const finish = async () => {
    unlockAudio();
    const orient = requestOrientationPermission(); // must start inside the tap (iPhone)
    setErr(''); setBusy(true);
    const [loc] = await Promise.all([getPositionOnce(), orient]);
    try {
      const hasBand = pairing !== 'skipped';
      let s = squad; let member;
      if (isCreate) {
        const r = await createSquad({ squadName, name, limit, hasBand, loc });
        s = r.squad; member = r.member;
      } else {
        member = await addMember(squad.id, { name, limit, hasBand, loc });
      }
      setMemberId(s.code, member.id);
      setLocationConsent(s.code);
      nav(`/s/${s.code}`, { replace: true, state: { locDenied: !loc.ok && loc.reason === 'denied' } });
    } catch (e) {
      setErr('Something went wrong saving that. Try again.');
      setBusy(false);
    }
  };

  const Done = ({ n, children }) => (
    <button type="button" className="done-row" onClick={() => { setPairing('idle'); setStep(n); }}>
      <span className="tick">✓</span><span>{children}</span><span className="edit">Edit</span>
    </button>
  );

  if (step === 0) {
    return <main className="screen center"><div className="spinner" /><p className="muted">Opening invite…</p></main>;
  }

  return (
    <main className="screen">
      <TopBar title={isCreate ? 'Create a squad' : 'Join a squad'} onBack={() => nav('/')} />
      <div className="progress" aria-hidden="true"><div style={{ width: `${pct}%` }} /></div>

      <div className="stack" style={{ gap: 10 }}>
        {step > 1 && (isCreate
          ? <Done n={1}><b>{squadName}</b></Done>
          : <Done n={1}>Squad <b>{squad?.code}</b> · {squad?.name}</Done>)}
        {step > 2 && <Done n={2}>You’re <b>{name || 'friend'}</b>{isCreate ? ' · host' : ''}</Done>}
        {step > 3 && <Done n={3}>Limit tonight <b>{limit.toFixed(2)}</b></Done>}
        {step > 4 && (
          <div className="done-row" style={{ cursor: 'default' }}>
            <span className="tick">✓</span><span>{pairing === 'skipped' ? 'No band · sharing location only' : 'Wristband paired'}</span>
          </div>
        )}
      </div>

      {step === 1 && (
        <section className="card stack reveal" key="s1">
          <span className="eyebrow">Step 1 of 5</span>
          {isCreate ? (
            <>
              <label className="h-display h2" htmlFor="squad">Name tonight’s squad</label>
              <input id="squad" className="input" value={squadName} onChange={(e) => setSquadName(e.target.value)} maxLength={40} />
              <p className="muted small">The squad only lasts tonight. It ends at 6:00 AM.</p>
              <button type="button" className="btn btn-primary" disabled={!squadName.trim()} onClick={() => setStep(2)}>Next</button>
            </>
          ) : (
            <>
              <label className="h-display h2" htmlFor="code">Enter the squad code</label>
              <input id="code" className="input code" value={code} autoCapitalize="characters" autoComplete="off"
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))} placeholder="ABC123" />
              <p className="muted small">Opened an invite link? It’s already filled in.</p>
              {err && <p className="error">{err}</p>}
              <button type="button" className="btn btn-primary" disabled={code.length < 6 || busy} onClick={checkCode}>
                {busy ? <span className="spinner" /> : 'Next'}
              </button>
            </>
          )}
        </section>
      )}

      {step === 2 && (
        <section className="card stack reveal" key="s2">
          <span className="eyebrow">Step 2 of 5</span>
          <label className="h-display h2" htmlFor="name">What should your squad call you?</label>
          <input id="name" className="input" placeholder="Your first name" value={name} autoFocus maxLength={24}
            onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && name.trim() && setStep(3)} />
          <button type="button" className="btn btn-primary" disabled={!name.trim()} onClick={() => setStep(3)}>Next</button>
        </section>
      )}

      {step === 3 && (
        <section className="card stack reveal" key="s3">
          <span className="eyebrow">Step 3 of 5</span>
          <h2 className="h-display h2">Your limit tonight</h2>
          <div className="choice-grid" role="radiogroup" aria-label="Your limit">
            {LIMITS.map((v) => (
              <button type="button" key={v} role="radio" aria-checked={limitChoice === v}
                className={`choice${limitChoice === v ? ' on' : ''}`} onClick={() => pickLimit(v)}>{v}</button>
            ))}
          </div>
          {limitChoice === 'Custom' && (
            <div className="row reveal">
              <label className="muted" htmlFor="custom">BAC</label>
              <input id="custom" className="input" type="number" inputMode="decimal" step="0.01" min="0.02" max="0.15"
                value={custom} onChange={(e) => setCustom(e.target.value)} style={{ flex: 1 }} />
              <button type="button" className="btn btn-primary" style={{ width: 'auto' }} onClick={() => setStep(4)}>Set</button>
            </div>
          )}
          <p className="soft" style={{ fontSize: 15 }}>
            Measured as BAC. Most people pick 0.08. When your band reads this, your two closest friends get pinged to come find you.
          </p>
        </section>
      )}

      {step === 4 && (
        <section className="card stack reveal" key="s4" style={{ gap: 14 }}>
          <span className="eyebrow">Step 4 of 5</span>
          <h2 className="h-display h2">Pair your wristband</h2>
          <div className="row" style={{ gap: 16 }}>
            <I.Band />
            <ol className="soft" style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 15, lineHeight: 1.35 }}>
              <li>Turn on Bluetooth</li>
              <li>Hold the button on your band for 3 seconds</li>
              <li>When it blinks, tap Pair</li>
            </ol>
          </div>
          {pairing === 'idle' && <button type="button" className="btn btn-primary" onClick={pair}>Pair band</button>}
          {pairing === 'searching' && <div role="status" className="btn btn-ghost" style={{ cursor: 'default' }}><span className="spinner" />Looking for your band…</div>}
          {pairing === 'paired' && <div role="status" className="btn btn-ghost" style={{ borderColor: 'var(--cyan)', color: 'var(--cyan-soft)', cursor: 'default' }}>✓ Paired</div>}
          <button type="button" className="btn-text" onClick={() => { timers.current.forEach(clearTimeout); setPairing('skipped'); setStep(5); }}>
            No band? Continue with location only
          </button>
        </section>
      )}

      {step === 5 && (
        <section className="card stack reveal" key="s5" style={{ gap: 14 }}>
          <span className="eyebrow">Step 5 of 5</span>
          <h2 className="h-display h2">Share your location for tonight</h2>
          <ul className="soft" style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8, fontSize: 15, lineHeight: 1.35 }}>
            <li><b style={{ color: 'var(--text)' }}>What:</b> your location{pairing !== 'skipped' ? ' and your band’s BAC reading' : ''}</li>
            <li><b style={{ color: 'var(--text)' }}>Who:</b> only the people in {isCreate ? squadName : squad?.name}</li>
            <li><b style={{ color: 'var(--text)' }}>Until:</b> 6:00 AM, or when the night ends</li>
          </ul>
          <p className="muted small">Your phone will ask to use your location (and on iPhone, motion &amp; orientation for the compass). Tap Allow. Keep this app open during the night.</p>
          {err && <p className="error">{err}</p>}
          <button type="button" className="btn btn-primary" disabled={busy} onClick={finish}>
            {busy ? <><span className="spinner" />Setting up…</> : isCreate ? 'Turn on location & create squad' : 'Turn on location & join'}
          </button>
        </section>
      )}
    </main>
  );
}
