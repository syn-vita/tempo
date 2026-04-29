import { useMemo, useState } from 'react';
import type { Settings } from '../types';
import type { usePomodoroSession } from '../hooks/usePomodoroSession';
import { TimerView } from '../components/TimerView';
import { BreakView } from '../components/BreakView';
import { NudgeOverlay } from '../components/NudgeOverlay';
import { DistractionModal } from '../components/DistractionModal';
import { ConfirmActionModal } from '../components/ConfirmActionModal';

type SessionState = ReturnType<typeof usePomodoroSession>;

interface Props {
  session: SessionState;
  settings: Settings;
  settingsLoading: boolean;
}

export function Home({ session, settings, settingsLoading }: Props) {
  const [stopTarget, setStopTarget] = useState<'pomodoro' | 'break' | null>(null);

  const {
    phase, timeRemaining, behaviorState,
    distractionCount, completedToday,
    pendingBreakDuration, showNudge, overlayArmed,
    start, stop, stopBreak, confirmBreak, dismissNudge, dismissDistractionPrompt, selectMood,
  } = session;

  function handleStopPomodoro() {
    setStopTarget('pomodoro');
  }

  function handleStopBreak() {
    setStopTarget('break');
  }

  function handleCancelStopConfirmation() {
    setStopTarget(null);
  }

  function handleConfirmStop() {
    if (stopTarget === 'pomodoro') {
      setStopTarget(null);
      void stop();
      return;
    }

    if (stopTarget === 'break') {
      setStopTarget(null);
      stopBreak();
    }
  }

  const stopConfirmationCopy = useMemo(() => {
    if (stopTarget === 'pomodoro') {
      return {
        title: 'Stop focus session?',
        description: 'Stopping now will end this pomodoro and discard current progress.',
        confirmLabel: 'Yes, stop session',
        cancelLabel: 'Keep focusing',
      };
    }

    if (stopTarget === 'break') {
      return {
        title: 'Stop break early?',
        description: 'You will return to idle and can start a new focus session whenever you are ready.',
        confirmLabel: 'Yes, end break',
        cancelLabel: 'Continue break',
      };
    }

    return null;
  }, [stopTarget]);

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="text-tempo-faint text-sm">Loading...</span>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto pt-2">

      {(phase === 'idle' || phase === 'working' || phase === 'distraction_prompt') && (
        <TimerView
          timeRemaining={timeRemaining}
          totalDuration={settings.workDuration}
          behaviorState={behaviorState}
          completedToday={completedToday}
          longBreakInterval={settings.longBreakInterval}
          onStart={start}
          onStop={handleStopPomodoro}
          isRunning={phase === 'working' || phase === 'distraction_prompt'}
        />
      )}

      {(phase === 'working' || phase === 'distraction_prompt') && settings.distractionOverlayEnabled && !overlayArmed && (
        <div className="mt-4 rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-3">
          <p className="text-xs text-amber-200 leading-snug">
            Floating overlay is not armed. Open Settings and use <span className="font-semibold">Arm overlay now</span>
            {' '}to keep distraction alerts visible while Tempo is in the background.
          </p>
        </div>
      )}

      {phase === 'break_pending' && (
        <div className="flex flex-col items-center text-center px-6 pt-16 pb-8">
          {/* Checkmark */}
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6"
            style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
              stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-tempo-text mb-2">Session complete</h2>
          <p className="text-tempo-muted text-sm mb-10">Take a well-deserved break</p>
          <button
            onClick={confirmBreak}
            aria-label="Start break"
            className="text-white font-semibold rounded-2xl px-11 py-3.5 text-base"
            style={{
              background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
              boxShadow: '0 4px 20px rgba(59,130,246,0.4)',
            }}
          >
            Start break
          </button>
        </div>
      )}

      {phase === 'break' && (
        <BreakView
          timeRemaining={timeRemaining}
          breakDuration={pendingBreakDuration}
          onStop={handleStopBreak}
          onMoodSelect={selectMood}
        />
      )}

      {showNudge && (
        <NudgeOverlay
          switchCount={distractionCount}
          onTakeBreak={confirmBreak}
          onDismiss={dismissNudge}
        />
      )}

      {phase === 'distraction_prompt' && (
        <DistractionModal
          switchCount={distractionCount}
          onTakeBreak={confirmBreak}
          onKeepFocusing={dismissDistractionPrompt}
        />
      )}

      <ConfirmActionModal
        open={stopConfirmationCopy !== null}
        title={stopConfirmationCopy?.title ?? ''}
        description={stopConfirmationCopy?.description ?? ''}
        confirmLabel={stopConfirmationCopy?.confirmLabel ?? ''}
        cancelLabel={stopConfirmationCopy?.cancelLabel ?? ''}
        onConfirm={handleConfirmStop}
        onCancel={handleCancelStopConfirmation}
      />
    </div>
  );
}
