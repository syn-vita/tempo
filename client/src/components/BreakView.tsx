import { MoodCheckIn } from './MoodCheckIn';

function formatTime(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function getSuggestion(breakDuration: number): string {
  if (breakDuration >= 15 * 60 * 1000) return 'Step outside for a few minutes';
  if (breakDuration >= 10 * 60 * 1000) return 'Drink some water and stretch';
  return 'Stretch your arms and look away from the screen';
}

interface Props {
  timeRemaining: number;
  breakDuration: number;
  onMoodSelect?: (mood: number) => void;
}

export function BreakView({ timeRemaining, breakDuration, onMoodSelect }: Props) {
  return (
    <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
      <p style={{ color: '#94a3b8', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Break time</p>
      <div style={{ fontSize: '5rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums', letterSpacing: '-2px' }}>
        {formatTime(timeRemaining)}
      </div>
      <div style={{
        marginTop: '2rem', padding: '1.25rem 2rem',
        background: '#1e1e2e', borderRadius: '12px',
        display: 'inline-block', maxWidth: '340px',
      }}>
        <p style={{ margin: 0, color: '#e2e8f0', fontSize: '1rem' }}>
          {getSuggestion(breakDuration)}
        </p>
      </div>
      <MoodCheckIn onSelect={onMoodSelect} />
    </div>
  );
}
