import { useState } from 'react';
import type { SessionMood } from '../types';

const MOOD_OPTIONS: Array<{ mood: SessionMood; emoji: string; label: string }> = [
  { mood: 'stressed', emoji: '😰', label: 'Stressed' },
  { mood: 'tired', emoji: '😴', label: 'Tired' },
  { mood: 'neutral', emoji: '😐', label: 'Neutral' },
  { mood: 'good', emoji: '🙂', label: 'Good' },
  { mood: 'energized', emoji: '😊', label: 'Energized' },
];

export function MoodCheckIn({ onSelect }: { onSelect?: (mood: SessionMood) => void }) {
  const [selectedMood, setSelectedMood] = useState<SessionMood | null>(null);

  function handleSelect(mood: SessionMood) {
    setSelectedMood(mood);
    onSelect?.(mood);
  }

  return (
    <section className="mt-8 w-full max-w-sm rounded-3xl border border-tempo-border/20 bg-tempo-surface/60 px-4 py-4">
      <div className="mb-3 text-left">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-tempo-faint">
          Mood check-in
        </p>
        <p className="mt-1 text-sm text-tempo-muted">
          How are you feeling right now? Tempo will adapt the rest of your break.
        </p>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {MOOD_OPTIONS.map((option) => {
          const isSelected = selectedMood === option.mood;
          return (
            <button
              key={option.mood}
              type="button"
              aria-pressed={isSelected}
              aria-label={option.label}
              onClick={() => handleSelect(option.mood)}
              className="flex flex-col items-center rounded-2xl border px-2 py-3 transition-colors"
              style={{
                borderColor: isSelected ? 'rgba(59,130,246,0.5)' : 'rgba(148,163,184,0.2)',
                background: isSelected ? 'rgba(59,130,246,0.14)' : 'rgba(15,23,42,0.22)',
              }}
            >
              <span className="text-2xl leading-none">{option.emoji}</span>
              <span className="mt-2 text-[0.68rem] font-medium text-tempo-muted">{option.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
