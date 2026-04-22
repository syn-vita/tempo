import type { Settings } from '../types';
import type { usePomodoroSession } from '../hooks/usePomodoroSession';
import { TimerView } from '../components/TimerView';
import { BreakView } from '../components/BreakView';
import { NudgeOverlay } from '../components/NudgeOverlay';

type SessionState = ReturnType<typeof usePomodoroSession>;

interface Props {
  session: SessionState;
  settings: Settings;
  settingsLoading: boolean;
}

export function Home({ session, settings, settingsLoading }: Props) {
  const {
    phase, timeRemaining, behaviorState,
    distractionCount, completedToday,
    pendingBreakDuration, showNudge,
    start, stop, confirmBreak, dismissNudge,
  } = session;

  if (settingsLoading) return <p style={{ textAlign: 'center', color: '#94a3b8', paddingTop: '3rem' }}>Loading...</p>;

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto' }}>
      {(phase === 'idle' || phase === 'working') && (
        <TimerView
          timeRemaining={timeRemaining}
          behaviorState={behaviorState}
          completedToday={completedToday}
          longBreakInterval={settings.longBreakInterval}
          onStart={start}
          onStop={stop}
          isRunning={phase === 'working'}
        />
      )}

      {phase === 'break_pending' && (
        <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <p style={{ color: '#e2e8f0', fontSize: '1.1rem', marginBottom: '2rem' }}>
            Time for a break
          </p>
          <button onClick={confirmBreak} style={{
            background: '#7c3aed', color: '#fff', border: 'none',
            borderRadius: '12px', padding: '0.85rem 2.5rem',
            fontSize: '1rem', cursor: 'pointer',
          }}>
            Start break
          </button>
        </div>
      )}

      {phase === 'break' && (
        <BreakView
          timeRemaining={timeRemaining}
          breakDuration={pendingBreakDuration}
        />
      )}

      {showNudge && (
        <NudgeOverlay
          switchCount={distractionCount}
          onTakeBreak={confirmBreak}
          onDismiss={dismissNudge}
        />
      )}
    </div>
  );
}
