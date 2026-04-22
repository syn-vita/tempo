import { MoodCheckIn } from './MoodCheckIn';

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
  onMoodSelect?: (mood: number) => void;
}

export function BreakView({ timeRemaining, breakDuration, onMoodSelect }: Props) {
  const offset = ringOffset(timeRemaining, breakDuration);
  const isLong = breakDuration >= 15 * 60 * 1000;

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
              fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
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
      <div className="mt-8 w-full max-w-xs bg-white/[0.03] border border-white/[0.07] rounded-2xl px-5 py-4">
        <p className="text-tempo-muted text-sm leading-relaxed">{getSuggestion(breakDuration)}</p>
      </div>

      <MoodCheckIn onSelect={onMoodSelect} />
    </div>
  );
}
