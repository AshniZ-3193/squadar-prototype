import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { getPin, setPin } from '../lib/storage.js';

// Simple PIN screen for the facilitator and results pages.
export default function PinGate({ title, children }) {
  const [pin, setPinState] = useState('');
  const [ok, setOk] = useState(null);
  const [err, setErr] = useState('');

  const check = async (p) => {
    const { data, error } = await supabase.rpc('check_pin', { pin: p });
    if (error) { setErr('Could not reach the database. Did you run the setup SQL?'); setOk(false); return; }
    if (data) { setPin(p); setOk(true); } else { setErr('Wrong PIN'); setOk(false); }
  };

  useEffect(() => { const saved = getPin(); if (saved) check(saved); else setOk(false); }, []);

  if (ok) return children(getPin());
  if (ok === null) return <main className="screen center"><div className="spinner" /></main>;
  return (
    <main className="screen center" style={{ gap: 16 }}>
      <h1 className="h-display h1">{title}</h1>
      <form className="stack" style={{ width: '100%', maxWidth: 320 }} onSubmit={(e) => { e.preventDefault(); setErr(''); check(pin); }}>
        <label className="field">
          <span className="muted">Facilitator PIN</span>
          <input className="input code" inputMode="numeric" value={pin} onChange={(e) => setPinState(e.target.value)} autoFocus />
        </label>
        {err && <p className="error">{err}</p>}
        <button className="btn btn-primary" type="submit">Unlock</button>
      </form>
    </main>
  );
}
