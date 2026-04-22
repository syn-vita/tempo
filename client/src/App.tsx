import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { NavBar } from './components/NavBar';
import { Home } from './pages/Home';
import { DashboardPage } from './pages/DashboardPage';
import { SettingsPage } from './pages/SettingsPage';
import { useSettings } from './hooks/useSettings';
import { usePomodoroSession } from './hooks/usePomodoroSession';

function AppRoutes() {
  const { settings, loading } = useSettings();
  const session = usePomodoroSession(settings);

  return (
    <div className="min-h-dvh bg-tempo-bg text-tempo-text font-sans">
      <NavBar />
      <main className="pb-12">
        <Routes>
          <Route path="/" element={<Home session={session} settings={settings} settingsLoading={loading} />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
