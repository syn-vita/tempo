import type { BehaviorState } from '../types';

const RADIUS = 84;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function ringOffset(timeRemaining: number, totalDuration: number): number {
  if (totalDuration === 0) return 0;
  return CIRCUMFERENCE * (1 - timeRemaining / totalDuration);
}

function formatTime(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

const STATE_CFG: Record<BehaviorState, { label: string; color: string; glow: string; ring: string }> = {
  flow:       { label: 'In flow',    color: '#10B981', glow: 'rgba(16,185,129,0.18)',  ring: '#10B981' },
  distracted: { label: 'Distracted', color: '#F59E0B', glow: 'rgba(245,158,11,0.18)', ring: '#F59E0B' },
  normal:     { label: 'Focused',    color: '#7C3AED', glow: 'rgba(124,58,237,0.18)', ring: '#7C3AED' },
};

interface Props {
  timeRemaining: number;
  totalDuration: number;
  behaviorState: BehaviorState;
  completedToday: number;
  longBreakInterval: number;
  onStart: () => void;
  onStop: () => void;
  isRunning: boolean;
}

export function TimerView({
  timeRemaining, totalDuration, behaviorState, completedToday,
  longBreakInterval, onStart, onStop, isRunning,
}: Props) {
  const cfg = STATE_CFG[behaviorState];
  const offset = ringOffset(timeRemaining, totalDuration);
  const doneInCycle = completedToday % longBreakInterval;
  const ringColor = isRunning ? cfg.ring : 'rgba(124,58,237,0.4)';

  return (
    <div className="flex flex-col items-center text-center pt-12 pb-8 px-4">

      {/* Session dots */}
      <div className="flex items-center gap-2 mb-8">
        {Array.from({ length: longBreakInterval }, (_, i) => {
          const done = i < doneInCycle;
          const current = i === doneInCycle;
          return (
            <span
              key={i}
              className="inline-block rounded-full transition-all duration-300"
              style={{
                width:      current ? 10 : 7,
                height:     current ? 10 : 7,
                background: done    ? '#7C3AED'
                          : current ? (isRunning ? cfg.color : '#7C3AED')
                          : 'rgba(255,255,255,0.1)',
                boxShadow: current && isRunning ? `0 0 8px ${cfg.color}` : 'none',
              }}
            />
          );
        })}
        <span className="text-tempo-faint text-xs ml-1.5">
          {doneInCycle + 1} of {longBreakInterval}
        </span>
      </div>

      {/* Timer ring */}
      <div className="relative flex items-center justify-center" style={{ width: 220, height: 220 }}>

        {/* Ambient glow */}
        <div
          className="absolute rounded-full transition-all duration-700"
          style={{
            inset: 20,
            background: isRunning ? cfg.glow : 'rgba(124,58,237,0.06)',
            filter: 'blur(28px)',
          }}
        />

        {/* SVG ring */}
        <svg width="220" height="220" className="absolute inset-0" aria-hidden="true">
          <g transform="rotate(-90 110 110)">
            <circle cx="110" cy="110" r={RADIUS}
              fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
            <circle cx="110" cy="110" r={RADIUS}
              fill="none"
              stroke={ringColor}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 1s linear, stroke 600ms ease' }}
            />
          </g>
        </svg>

        {/* Digits */}
        <div
          aria-label={`${formatTime(timeRemaining)} remaining`}
          className="relative z-10 font-mono font-bold transition-colors duration-300"
          style={{
            fontSize: '3.5rem',
            letterSpacing: '-1.5px',
            color: isRunning ? '#F1F5F9' : '#94A3B8',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {formatTime(timeRemaining)}
        </div>
      </div>

      {/* Behavior badge */}
      <div className="h-8 flex items-center mt-5">
        {isRunning && (
          <div
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] text-xs font-medium transition-all duration-500"
            style={{ border: `1px solid ${cfg.color}40`, color: cfg.color }}
          >
            <span
              className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: cfg.color, boxShadow: `0 0 6px ${cfg.color}` }}
            />
            {cfg.label}
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="mt-7 flex gap-3 justify-center">
        {!isRunning ? (
          <button
            onClick={onStart}
            aria-label="Start focus session"
            className="text-white font-semibold rounded-2xl px-11 py-3.5 text-base"
            style={{
              background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
              boxShadow: '0 4px 20px rgba(124,58,237,0.4)',
            }}
          >
            Start
          </button>
        ) : (
          <button
            onClick={onStop}
            aria-label="Stop session"
            className="bg-transparent text-tempo-red border border-tempo-red/40 rounded-2xl px-11 py-3.5 text-[0.95rem] font-medium"
          >
            Stop
          </button>
        )}
      </div>
    </div>
  );
}
