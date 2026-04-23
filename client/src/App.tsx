import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { NavBar } from './components/NavBar';
import { WelcomeModal } from './components/WelcomeModal';
import { TempoGuideModal } from './components/TempoGuideModal';
import { Home } from './pages/Home';
import { DashboardPage } from './pages/DashboardPage';
import { SettingsPage } from './pages/SettingsPage';
import { useSettings } from './hooks/useSettings';
import { SettingsContext } from './hooks/useSettingsContext';
import { usePomodoroSession } from './hooks/usePomodoroSession';
import { setDistractionOverlayFocusHandler } from './lib/distractionOverlay';

function AppRoutes() {
  const navigate = useNavigate();
  const { settings, loading, update } = useSettings();
  const session = usePomodoroSession(settings);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const hasAppliedThemeRef = useRef(false);
  const hasRequestedNotificationPermissionRef = useRef(false);
  const removeThemeTransitionTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setDistractionOverlayFocusHandler(() => {
      navigate('/');
    });

    return () => {
      setDistractionOverlayFocusHandler(null);
    };
  }, [navigate]);

  useEffect(() => {
    if (!loading && settings.hasSeenWelcome === false) {
      setShowWelcome(true);
    }
  }, [loading, settings.hasSeenWelcome]);

  useEffect(() => {
    const root = document.documentElement;
    const shouldAnimate = hasAppliedThemeRef.current;

    if (shouldAnimate) {
      root.classList.add('theme-switching');
      if (removeThemeTransitionTimeoutRef.current !== null) {
        window.clearTimeout(removeThemeTransitionTimeoutRef.current);
      }
    }

    if (settings.theme === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', settings.theme);
    }

    if (shouldAnimate) {
      removeThemeTransitionTimeoutRef.current = window.setTimeout(() => {
        root.classList.remove('theme-switching');
        removeThemeTransitionTimeoutRef.current = null;
      }, 320);
    }

    hasAppliedThemeRef.current = true;

    return () => {
      if (removeThemeTransitionTimeoutRef.current !== null) {
        window.clearTimeout(removeThemeTransitionTimeoutRef.current);
        removeThemeTransitionTimeoutRef.current = null;
      }
      root.classList.remove('theme-switching');
    };
  }, [settings.theme]);

  useEffect(() => {
    if (loading) return;
    if (!settings.promptNotificationPermissionOnLoad) return;
    if (typeof Notification === 'undefined') return;
    if (Notification.permission !== 'default') return;
    if (hasRequestedNotificationPermissionRef.current) return;

    const requestPermission = () => {
      if (hasRequestedNotificationPermissionRef.current) return;
      hasRequestedNotificationPermissionRef.current = true;
      Notification.requestPermission().catch(() => {});
    };

    const onPointerDown = () => requestPermission();
    const onKeyDown = () => requestPermission();

    window.addEventListener('pointerdown', onPointerDown, { once: true });
    window.addEventListener('keydown', onKeyDown, { once: true });

    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [loading, settings.promptNotificationPermissionOnLoad]);

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
    <SettingsContext.Provider value={{ settings, loading, update }}>
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
    </SettingsContext.Provider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
