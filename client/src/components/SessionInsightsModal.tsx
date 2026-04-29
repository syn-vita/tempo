import { useEffect, useRef, useState } from 'react';
import type { Session, SessionMood } from '../types';

interface SessionInsightsModalProps {
  open: boolean;
  session: Session | null;
  onClose: () => void;
}

function formatDuration(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
}

function insightValueClass(value: number, mode: 'focus' | 'activity' | 'neutral'): string {
  if (mode === 'focus') {
    if (value >= 75) return 'text-emerald-400';
    if (value >= 50) return 'text-amber-300';
    return 'text-rose-400';
  }

  if (mode === 'activity') {
    if (value >= 0.75) return 'text-emerald-400';
    if (value >= 0.35) return 'text-amber-300';
    return 'text-slate-300';
  }

  return 'text-slate-100';
}

function formatMoodLabel(mood: SessionMood): string {
  return mood.charAt(0).toUpperCase() + mood.slice(1);
}

function formatBreakLabel(durationMs: number | null): string {
  if (durationMs === null) return 'Standard break';
  return `${Math.round(durationMs / 60_000)} min break`;
}

export function SessionInsightsModal({ open, session, onClose }: SessionInsightsModalProps) {
  const finalFocusScore = session ? Math.round(session.focusScore) : 0;
  const [animatedScore, setAnimatedScore] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (!open || !session) {
      setAnimatedScore(0);
      return;
    }

    const target = finalFocusScore;
    const duration = 800;
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic: 1 - (1 - t)^3
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(eased * target));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
      }
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [open, session, finalFocusScore]);

  if (!open || !session) return null;

  const flowBonus = session.extensionReason === 'flow' ? 10 : 0;
  const avgActivityRate = session.avgActivityRate ?? 0;
  const moodLabel = session.mood ? formatMoodLabel(session.mood) : null;
  const moodBreakMinutes =
    session.moodOverrideDuration === null ? null : Math.round(session.moodOverrideDuration / 60_000);
  const moodBreakLabel = formatBreakLabel(session.moodOverrideDuration);
  const focusScoreTone = insightValueClass(session.focusScore, 'focus');
  const metrics = [
    {
      label: 'Focus score',
      animated: true,
      animatedValue: animatedScore,
      finalValue: finalFocusScore,
      tone: focusScoreTone,
    },
    {
      label: 'Duration',
      value: formatDuration(session.actualDuration),
      tone: insightValueClass(session.actualDuration, 'neutral'),
    },
    {
      label: 'Distractions',
      value: session.distractionEvents.toString(),
      tone: insightValueClass(session.distractionEvents, 'neutral'),
    },
    {
      label: 'Flow bonus',
      value: flowBonus > 0 ? `+${flowBonus}` : '0',
      tone: insightValueClass(flowBonus, 'neutral'),
    },
    {
      label: 'Activity rate',
      value: `${avgActivityRate.toFixed(2)}/s`,
      tone: insightValueClass(avgActivityRate, 'activity'),
    },
  ];

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        aria-label="Close session insights"
        onClick={onClose}
        className="absolute inset-0 cursor-pointer bg-black/70 backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-insights-title"
        className="relative w-full max-w-lg rounded-2xl border border-tempo-border/30 bg-tempo-bg/95 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.35)]"
      >
        <div className="mb-4">
          <p className="text-[0.68rem] uppercase tracking-[0.2em] text-tempo-faint">Session insights</p>
          <h2 id="session-insights-title" className="mt-2 text-xl font-semibold text-tempo-text">
            Session #{session.sessionNumber}
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {metrics.map((metric) => {
            if ('animated' in metric && metric.animated) {
              return (
                <div
                  key={metric.label}
                  aria-label={`${metric.label}: ${metric.finalValue}/100`}
                  className="rounded-xl border border-tempo-border/20 bg-tempo-surface/70 px-4 py-3"
                >
                  <p className="text-xs uppercase tracking-wider text-tempo-faint">{metric.label}</p>
                  <p
                    aria-hidden="true"
                    className={`mt-2 text-lg font-semibold ${metric.tone}`}
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {metric.animatedValue}/100
                  </p>
                  <span className="sr-only">{metric.finalValue}/100</span>
                </div>
              );
            }
            return (
              <div key={metric.label} className="rounded-xl border border-tempo-border/20 bg-tempo-surface/70 px-4 py-3">
                <p className="text-xs uppercase tracking-wider text-tempo-faint">{metric.label}</p>
                <p className={`mt-2 text-lg font-semibold ${metric.tone}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {metric.value}
                </p>
              </div>
            );
          })}
        </div>

        {session.mood && (
          <div className="mt-5 rounded-xl border border-tempo-border/20 bg-tempo-surface/70 px-4 py-3">
            <p className="text-xs uppercase tracking-wider text-tempo-faint">Mood adaptation</p>
            <p className="mt-2 text-sm font-semibold text-tempo-text">{moodLabel}</p>
            <p className="mt-1 text-sm text-tempo-muted">{moodBreakLabel}</p>
            <p className="mt-2 text-sm text-tempo-muted">
              {moodBreakMinutes === null
                ? 'Tempo recorded a mood-based break adjustment for this session.'
                : `Tempo extended this break to ${moodBreakMinutes} min because you reported feeling ${session.mood}.`}
            </p>
          </div>
        )}

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-tempo-border/30 px-4 py-2.5 text-sm font-medium text-tempo-muted transition-colors hover:text-tempo-text"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
