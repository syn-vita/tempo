import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { NavBar } from './components/NavBar';
import { WelcomeModal } from './components/WelcomeModal';
import { TempoGuideModal } from './components/TempoGuideModal';
import { Home } from './pages/Home';
import { DashboardPage } from './pages/DashboardPage';
import { SettingsPage } from './pages/SettingsPage';
import { useSettings } from './hooks/useSettings';
import { usePomodoroSession } from './hooks/usePomodoroSession';

function AppRoutes() {
  const { settings, loading, update } = useSettings();
  const session = usePomodoroSession(settings);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    if (!loading && settings.hasSeenWelcome === false) {
      setShowWelcome(true);
    }
  }, [loading, settings.hasSeenWelcome]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
  }, [settings.theme]);

  async function markWelcomeSeen() {
    if (!settings.hasSeenWelcome) await update({ hasSeenWelcome: true });
  }

  async function handleSkipWelcome() {
    setShowWelcome(false);
    await markWelcomeSeen();
  }

  async function handleShowMeAround() {
    setShowWelcome(false);
    setShowGuide(true);
    await markWelcomeSeen();
  }

  return (
    <div className="min-h-dvh bg-tempo-bg text-tempo-text font-sans">
      <NavBar onOpenGuide={() => setShowGuide(true)} />
      <main className="pb-12">
        <Routes>
          <Route path="/" element={<Home session={session} settings={settings} settingsLoading={loading} />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
      {showWelcome && <WelcomeModal onSkip={handleSkipWelcome} onShowMeAround={handleShowMeAround} />}
      {showGuide && <TempoGuideModal onClose={() => setShowGuide(false)} />}
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
