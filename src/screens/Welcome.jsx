import { Link } from 'react-router-dom';
import { Logo } from '../components/Icons.jsx';

export default function Welcome() {
  return (
    <main className="screen">
      <span className="pill" style={{ alignSelf: 'flex-end' }}>DEMO</span>
      <div className="stack" style={{ alignItems: 'center', textAlign: 'center', gap: 18, marginTop: 56 }}>
        <Logo />
        <h1 className="h-display" style={{ fontSize: 40, letterSpacing: -1 }}>squadar</h1>
        <p className="soft" style={{ fontSize: 17, maxWidth: 300 }}>
          See where your squad is tonight, and who might need a hand getting home.
        </p>
      </div>
      <div className="stack spacer" style={{ gap: 14 }}>
        <Link to="/join" className="btn btn-primary big">Join a squad</Link>
        <Link to="/create" className="btn btn-ghost">Create a squad</Link>
        <p className="muted small" style={{ textAlign: 'center' }}>
          One person creates the squad. Everyone else joins with the code or link.
        </p>
        <p className="muted" style={{ textAlign: 'center', fontSize: 12, lineHeight: 1.45 }}>
          This is a test prototype. The floor map and drink readings are staged by the facilitator.
          We only store the name you enter.
        </p>
      </div>
    </main>
  );
}
