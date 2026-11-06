const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };

export const Back = () => (<svg width="22" height="22" viewBox="0 0 24 24" {...base}><path d="M15 5l-7 7 7 7" /></svg>);
export const Share = () => (<svg width="22" height="22" viewBox="0 0 24 24" {...base}><path d="M12 3v12M7 8l5-5 5 5" /><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" /></svg>);
export const Copy = () => (<svg width="20" height="20" viewBox="0 0 24 24" {...base}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a1 1 0 0 1 1-1h9" /></svg>);
export const Send = () => (<svg width="20" height="20" viewBox="0 0 24 24" {...base}><path d="M4 12h12M12 6l6 6-6 6" /></svg>);
export const Nav = () => (<svg width="22" height="22" viewBox="0 0 24 24" {...base} strokeWidth="2.4"><path d="M3 11l18-8-8 18-2-8-8-2z" /></svg>);
export const Check = ({ size = 34 }) => (<svg width={size} height={size} viewBox="0 0 24 24" {...base} strokeWidth="2.6"><path d="M5 12l5 5 9-10" /></svg>);
export const Band = () => (
  <svg width="64" height="84" viewBox="0 0 64 84" fill="none" aria-hidden="true">
    <rect x="14" y="2" width="36" height="80" rx="14" stroke="#4A3F66" strokeWidth="3" />
    <rect x="22" y="28" width="20" height="28" rx="6" fill="#221836" stroke="#F4EEFF" strokeWidth="2" />
    <circle className="blink" cx="32" cy="42" r="5" fill="#3DE0FF" />
  </svg>
);
export const Logo = () => (
  <div style={{ width: 96, height: 96, borderRadius: '50%', border: '2px solid var(--cyan)', boxShadow: '0 0 32px rgba(61,224,255,0.45), inset 0 0 22px rgba(61,224,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--text)' }} />
  </div>
);
