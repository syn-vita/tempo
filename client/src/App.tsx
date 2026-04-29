import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useRef, useState } from 'react';
import { NavBar } from './components/NavBar';
import { WelcomeModal } from './components/WelcomeModal';
import { TempoGuideModal } from './components/TempoGuideModal';
import { SessionInsightsModal } from './components/SessionInsightsModal';
import { Home } from './pages/Home';
import { DashboardPage } from './pages/DashboardPage';
import { SettingsPage } from './pages/SettingsPage';
import { useSettings } from './hooks/useSettings';
import { SettingsContext } from './hooks/useSettingsContext';
import { usePomodoroSession } from './hooks/usePomodoroSession';
import { setDistractionOverlayFocusHandler } from './lib/distractionOverlay';
import type { Session } from './types';

function scoreColor(score: number): string {
  if (score >= 75) return '#4ade80'; // green-400
  if (score >= 50) return '#fbbf24'; // amber-400
  return '#f87171'; // red-400
}

function ScoreFlash({ session }: { session: Session }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Mount with opacity-0, then flip to visible after one frame
    const showTimer = window.setTimeout(() => setVisible(true), 100);
    // Begin fade-out at 1800ms
    const hideTimer = window.setTimeout(() => setVisible(false), 1800);
    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  const score = session.focusScore;
  const color = scoreColor(score);

  return (
    <div
      className="fixed inset-0 z-[130] flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm"
      style={{
        opacity: visible ? 1 : 0,
        transition: 'opacity 300ms ease-in-out',
      }}
    >
      <span
        className="text-xs font-semibold tracking-widest uppercase mb-4"
        style={{ color }}
      >
        Focus score
      </span>
      <span
        className="font-bold tabular-nums leading-none"
        style={{ fontSize: '6rem', color }}
      >
        {score}
      </span>
    </div>
  );
}

function AppRoutes() {
  const navigate = useNavigate();
  const { settings, loading, update } = useSettings();
  const [insightSession, setInsightSession] = useState<Session | null>(null);
  const [flashSession, setFlashSession] = useState<Session | null>(null);
  const handleSessionFinalized = useCallback((finalizedSession: Session) => {
    setFlashSession(finalizedSession);
    window.setTimeout(() => {
      setFlashSession(null);
      setInsightSession(finalizedSession);
    }, 2200);
  }, []);
  const session = usePomodoroSession(settings, { onSessionFinalized: handleSessionFinalized });
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
        {flashSession && <ScoreFlash session={flashSession} />}
        <SessionInsightsModal
          open={insightSession !== null}
          session={insightSession}
          onClose={() => setInsightSession(null)}
        />
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
