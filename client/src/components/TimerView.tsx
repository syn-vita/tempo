import type { BehaviorState } from '../types';

function formatTime(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

const BADGE: Record<BehaviorState, { label: string; color: string }> = {
  flow: { label: '🟢 In flow', color: '#22c55e' },
  distracted: { label: '🟡 Distracted', color: '#eab308' },
  normal: { label: '⚪ Focused', color: '#94a3b8' },
};

interface Props {
  timeRemaining: number;
  behaviorState: BehaviorState;
  completedToday: number;
  longBreakInterval: number;
  onStart: () => void;
  onStop: () => void;
  isRunning: boolean;
}

export function TimerView({
  timeRemaining, behaviorState, completedToday,
  longBreakInterval, onStart, onStop, isRunning,
}: Props) {
  const badge = BADGE[behaviorState];
  const sessionInCycle = (completedToday % longBreakInterval) + 1;

  return (
    <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
      <p style={{ color: '#94a3b8', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
        Session {sessionInCycle} of {longBreakInterval}
      </p>
      <div style={{ fontSize: '5rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums', letterSpacing: '-2px' }}>
        {formatTime(timeRemaining)}
      </div>
      <p style={{ color: badge.color, marginTop: '0.75rem', fontSize: '0.85rem' }}>
        {badge.label}
      </p>
      <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        {!isRunning ? (
          <button onClick={onStart} style={{
            background: '#7c3aed', color: '#fff', border: 'none',
            borderRadius: '12px', padding: '0.85rem 2.5rem',
            fontSize: '1rem', cursor: 'pointer',
          }}>
            Start
          </button>
        ) : (
          <button onClick={onStop} style={{
            background: 'transparent', color: '#ef4444', border: '1px solid #ef4444',
            borderRadius: '12px', padding: '0.85rem 2.5rem',
            fontSize: '1rem', cursor: 'pointer',
          }}>
            Stop
          </button>
        )}
      </div>
    </div>
  );
}
