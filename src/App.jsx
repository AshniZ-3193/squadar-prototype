import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { configured } from './lib/supabase.js';
import Welcome from './screens/Welcome.jsx';
import Onboard from './screens/Onboard.jsx';
import SquadApp from './screens/SquadApp.jsx';
import Facilitator from './screens/Facilitator.jsx';

export default function App() {
  if (!configured) {
    return (
      <main className="screen center">
        <h1 className="h-display h1">Almost there</h1>
        <p className="soft">Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY as environment variables, then redeploy.</p>
      </main>
    );
  }
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/create" element={<Onboard mode="create" key="create" />} />
        <Route path="/join" element={<Onboard mode="join" key="join" />} />
        <Route path="/j/:code" element={<Onboard mode="join" key="link" />} />
        <Route path="/s/:code" element={<SquadApp />} />
        <Route path="/facilitator" element={<Facilitator />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
