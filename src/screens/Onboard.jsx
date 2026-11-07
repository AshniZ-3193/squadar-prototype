import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { TopBar } from '../components/Bits.jsx';
import * as I from '../components/Icons.jsx';
import { createSquad, findSquad, addMember } from '../lib/actions.js';
import { setMemberId, getMemberId } from '../lib/storage.js';
import { unlockAudio } from '../lib/audio.js';
import { LEVELS } from '../lib/logic.js';

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
  const [level, setLevel] = useState(null);
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

  const pct = Math.min(step - 1, 4) * 25;

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

  const pickLevel = (l) => { setLevel(l); later(() => setStep(4), 450); };

  const pair = () => {
    if (pairing !== 'idle') return;
    setPairing('searching');
    later(() => setPairing('paired'), 2500);
  };

  const finish = async () => {
    unlockAudio();
    setErr(''); setBusy(true);
    try {
      const hasBand = pairing !== 'skipped';
      const limit = level?.limit ?? 0.08;
      let s = squad; let member;
      if (isCreate) {
        const r = await createSquad({ squadName, name, limit, hasBand });
        s = r.squad; member = r.member;
      } else {
        member = await addMember(squad.id, { name, limit, hasBand });
      }
      setMemberId(s.code, member.id);
      nav(`/s/${s.code}`, { replace: true });
    } catch {
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
        {step > 3 && <Done n={3}>Tonight: <b>{level?.label}</b> <span className="muted">· {level?.hint}</span></Done>}
      </div>

      {step === 1 && (
        <section className="card stack reveal" key="s1">
          <span className="eyebrow">Step 1 of 4</span>
          {isCreate ? (
            <>
              <label className="h-display h2" htmlFor="squad">Name tonight’s squad</label>
              <input id="squad" className="input" value={squadName} onChange={(e) => setSquadName(e.target.value)} maxLength={40} />
              <p className="muted small">The squad only lasts tonight.</p>
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
          <span className="eyebrow">Step 2 of 4</span>
          <label className="h-display h2" htmlFor="name">Your name</label>
          <input id="name" className="input" placeholder="First name" value={name} autoFocus maxLength={24} autoComplete="given-name"
            onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && name.trim() && setStep(3)} />
          <p className="muted small">This is how you’ll show up to your squad.</p>
          <button type="button" className="btn btn-primary" disabled={!name.trim()} onClick={() => setStep(3)}>Next</button>
        </section>
      )}

      {step === 3 && (
        <section className="card stack reveal" key="s3">
          <span className="eyebrow">Step 3 of 4</span>
          <h2 className="h-display h2">How much are you planning to drink tonight?</h2>
          <div className="stack" role="radiogroup" aria-label="Drinking plan" style={{ gap: 8 }}>
            {LEVELS.map((l, i) => (
              <button type="button" key={l.key} role="radio" aria-checked={level?.key === l.key}
                className={`level${level?.key === l.key ? ' on' : ''}`} onClick={() => pickLevel(l)}>
                <span className="level-bar" aria-hidden="true">
                  {LEVELS.map((_, j) => <span key={j} className={j <= i ? 'fill' : ''} />)}
                </span>
                <span className="grow" style={{ fontWeight: 700 }}>{l.label}</span>
                <span className="muted small">{l.hint}</span>
              </button>
            ))}
          </div>
          <p className="soft" style={{ fontSize: 15 }}>
            This becomes your limit. If you go past it, your two closest friends get pinged to come find you.
          </p>
        </section>
      )}

      {step === 4 && (
        <section className="card stack reveal" key="s4" style={{ gap: 14 }}>
          <span className="eyebrow">Step 4 of 4</span>
          <h2 className="h-display h2">Pair your device</h2>
          <div className="row" style={{ gap: 16 }}>
            <I.Band />
            <ol className="soft" style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 15, lineHeight: 1.35 }}>
              <li>Turn on Bluetooth</li>
              <li>Hold the button on your device for 3 seconds</li>
              <li>When it blinks, tap Pair</li>
            </ol>
          </div>
          {pairing === 'idle' && (
            <>
              <button type="button" className="btn btn-primary" onClick={pair}>Pair device</button>
              <button type="button" className="btn-text" onClick={() => setPairing('skipped')}>No device? Continue without one</button>
            </>
          )}
          {pairing === 'searching' && <div role="status" className="btn btn-ghost" style={{ cursor: 'default' }}><span className="spinner" />Looking for your device…</div>}
          {(pairing === 'paired' || pairing === 'skipped') && (
            <>
              <div role="status" className="btn btn-ghost reveal" style={{ cursor: 'default', ...(pairing === 'paired' ? { borderColor: 'var(--cyan)', color: 'var(--cyan-soft)' } : {}) }}>
                {pairing === 'paired' ? '✓ Device paired' : 'No device · your meter stays empty'}
              </div>
              {err && <p className="error">{err}</p>}
              <button type="button" className="btn btn-primary big reveal" disabled={busy} onClick={finish}>
                {busy ? <span className="spinner" /> : isCreate ? 'Create squad' : 'Join squad'}
              </button>
            </>
          )}
        </section>
      )}
    </main>
  );
}
