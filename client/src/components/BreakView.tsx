import { useEffect, useRef, useState } from 'react';
import { MoodCheckIn } from './MoodCheckIn';
import type { SessionMood } from '../types';

const RADIUS = 84;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const BREAK_COLOR = '#3B82F6';

function ringOffset(timeRemaining: number, total: number): number {
  if (total === 0) return 0;
  return CIRCUMFERENCE * (1 - timeRemaining / total);
}

function formatTime(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function getSuggestion(breakDuration: number): string {
  if (breakDuration >= 15 * 60 * 1000) return 'Step outside for a few minutes and breathe.';
  if (breakDuration >= 10 * 60 * 1000) return 'Drink some water and stretch your back.';
  return 'Look away from the screen and relax your eyes.';
}

interface Props {
  timeRemaining: number;
  breakDuration: number;
  currentMood: SessionMood | null;
  tunedGuidance: string | null;
  onStop: () => void;
  onMoodSelect?: (mood: SessionMood) => void;
  onResumeEarly?: () => void;
}

const BREATHING_PHASES: Array<{ label: string; duration: number }> = [
  { label: 'Inhale...', duration: 4000 },
  { label: 'Hold...', duration: 7000 },
  { label: 'Exhale...', duration: 8000 },
];

const CYCLE_DURATION = 19000; // 4 + 7 + 8 seconds

function BreathingGuide() {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function scheduleNext(index: number) {
      const current = BREATHING_PHASES[index];
      timeoutRef.current = setTimeout(() => {
        const next = (index + 1) % BREATHING_PHASES.length;
        setPhaseIndex(next);
        scheduleNext(next);
      }, current.duration);
    }

    setPhaseIndex(0);
    scheduleNext(0);

    return () => {
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    };
  }, []);

  const label = BREATHING_PHASES[phaseIndex].label;

  return (
    <div className="flex flex-col items-center gap-3 mt-6">
      <style>{`
        @keyframes breathe {
          0%   { width: 48px; height: 48px; }
          21%  { width: 80px; height: 80px; }  /* end of inhale (4/19) */
          58%  { width: 80px; height: 80px; }  /* end of hold (11/19)  */
          100% { width: 48px; height: 48px; }  /* end of exhale        */
        }
      `}</style>
      <div
        aria-label="Breathing guide"
        style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: 'rgba(59,130,246,0.08)',
          border: '2px solid rgba(59,130,246,0.5)',
          animation: `breathe ${CYCLE_DURATION}ms ease-in-out infinite`,
        }}
      />
      <span
        aria-live="polite"
        className="text-sm text-tempo-muted"
        style={{ color: 'rgba(59,130,246,0.8)' }}
      >
        {label}
      </span>
    </div>
  );
}

export function BreakView({
  timeRemaining,
  breakDuration,
  currentMood,
  tunedGuidance,
  onStop,
  onMoodSelect,
  onResumeEarly,
}: Props) {
  const offset = ringOffset(timeRemaining, breakDuration);
  const isLong = breakDuration >= 15 * 60 * 1000;
  const suggestion = tunedGuidance ?? getSuggestion(breakDuration);

  return (
    <div className="flex flex-col items-center text-center pt-12 pb-8 px-4">

      {/* Break type badge */}
      <div
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mb-8"
        style={{
          background: 'rgba(59,130,246,0.08)',
          border: '1px solid rgba(59,130,246,0.22)',
          color: BREAK_COLOR,
        }}
      >
        <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: BREAK_COLOR }} />
        {isLong ? 'Long break' : 'Short break'}
      </div>

      {/* Ring */}
      <div className="relative flex items-center justify-center" style={{ width: 220, height: 220 }}>

        {/* Glow */}
        <div
          className="absolute rounded-full"
          style={{ inset: 20, background: 'rgba(59,130,246,0.1)', filter: 'blur(28px)' }}
        />

        <svg width="220" height="220" className="absolute inset-0" aria-hidden="true">
          <g transform="rotate(-90 110 110)">
            <circle cx="110" cy="110" r={RADIUS}
              fill="none" stroke="rgb(var(--tempo-border) / 0.2)" strokeWidth="8" />
            <circle cx="110" cy="110" r={RADIUS}
              fill="none"
              stroke={BREAK_COLOR}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 1s linear' }}
            />
          </g>
        </svg>

        <div
          aria-label={`${formatTime(timeRemaining)} break remaining`}
          className="relative z-10 font-mono font-bold text-tempo-text"
          style={{
            fontSize: '3.5rem',
            letterSpacing: '-1.5px',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {formatTime(timeRemaining)}
        </div>
      </div>

      {/* Suggestion card */}
      <div className="mt-8 w-full max-w-xs bg-tempo-surface/70 border border-tempo-border/20 rounded-2xl px-5 py-4">
        <p className="text-tempo-muted text-sm leading-relaxed">{suggestion}</p>
      </div>

      {currentMood === 'stressed' && <BreathingGuide />}

      {currentMood === 'energized' && onResumeEarly && (
        <button
          type="button"
          onClick={onResumeEarly}
          className="mt-4 bg-transparent text-tempo-text border border-tempo-border/30 rounded-2xl px-8 py-3 text-[0.95rem] font-medium"
        >
          Resume early
        </button>
      )}

      <button
        onClick={onStop}
        aria-label="Stop break"
        className="mt-6 bg-transparent text-tempo-red border border-tempo-red/40 rounded-2xl px-11 py-3.5 text-[0.95rem] font-medium"
      >
        Stop
      </button>

      <MoodCheckIn onSelect={onMoodSelect} />
    </div>
  );
}
