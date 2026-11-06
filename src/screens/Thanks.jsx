import { Link } from 'react-router-dom';
import { Check } from '../components/Icons.jsx';

export default function Thanks() {
  return (
    <main className="screen center" style={{ gap: 18 }}>
      <div style={{ width: 96, height: 96, borderRadius: '50%', border: '2px solid var(--cyan)', boxShadow: '0 0 32px rgba(61,224,255,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cyan)' }}>
        <Check size={44} />
      </div>
      <h1 className="h-display" style={{ fontSize: 30 }}>Thanks!</h1>
      <p className="soft" style={{ fontSize: 17, maxWidth: 300 }}>Your answers went to the Squadar team. Tonight’s locations have been deleted.</p>
      <Link to="/" style={{ fontWeight: 700 }}>Back to start</Link>
    </main>
  );
}
