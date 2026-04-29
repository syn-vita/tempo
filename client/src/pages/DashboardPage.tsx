import { useState } from 'react';
import { SessionInsightsModal } from '../components/SessionInsightsModal';
import { useSessions } from '../hooks/useSessions';
import { SessionChart } from '../components/SessionChart';
import type { Session, SessionMood } from '../types';

function stateColor(state: string): string {
  if (state === 'completed') return '#10B981';
  if (state === 'break_taken') return '#F59E0B';
  if (state === 'abandoned') return '#EF4444';
  return '#64748B';
}

function stateLabel(state: Session['state']): string {
  if (state === 'break_taken') return 'Took a break';
  return state.replace('_', ' ');
}

function scoreColor(score: number): string {
  if (score >= 75) return '#10B981';
  if (score >= 50) return '#F59E0B';
  return '#EF4444';
}

function scoreAccent(score: number, hasData: boolean): string {
  if (!hasData) return '#475569';
  if (score >= 75) return '#10B981';
  if (score >= 50) return '#F59E0B';
  return '#EF4444';
}

function moodMeta(mood: SessionMood): { emoji: string; label: string; accent: string } {
  if (mood === 'stressed') return { emoji: '😰', label: 'Stressed', accent: '#F97316' };
  if (mood === 'tired') return { emoji: '😴', label: 'Tired', accent: '#6366F1' };
  if (mood === 'neutral') return { emoji: '😐', label: 'Neutral', accent: '#64748B' };
  if (mood === 'good') return { emoji: '🙂', label: 'Good', accent: '#10B981' };
  return { emoji: '😊', label: 'Energized', accent: '#F59E0B' };
}

function breakDurationLabel(duration: number | null): string {
  if (duration === null) return 'Standard break';
  return `${Math.round(duration / 60_000)} min break`;
}

interface StatCardProps {
  label: string;
  value: string;
  unit?: string;
  accent: string;
}

function StatCard({ label, value, unit, accent }: StatCardProps) {
  return (
    <div className="bg-tempo-surface/70 border border-tempo-border/20 rounded-2xl p-4">
      <div className="text-[1.6rem] font-bold leading-tight" style={{ color: accent, fontVariantNumeric: 'tabular-nums' }}>
        {value}
        {unit && <span className="text-sm font-medium text-tempo-faint ml-1">{unit}</span>}
      </div>
      <div className="text-xs text-tempo-muted font-medium mt-1">{label}</div>
    </div>
  );
}

export function DashboardPage() {
  const { sessions, loading } = useSessions();
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  const completed = sessions.filter(s => s.state === 'completed');
  const avgScore = completed.length
    ? Math.round(completed.reduce((sum, s) => sum + s.focusScore, 0) / completed.length)
    : 0;
  const totalDistractions = sessions.reduce((sum, s) => sum + s.distractionEvents, 0);
  const totalMinutes = Math.round(
    completed.reduce((sum, s) => sum + s.actualDuration, 0) / 60_000
  );
  const moodSessions = sessions.filter((session) => session.mood !== null);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="text-tempo-faint text-sm">Loading...</span>
      </div>
    );
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  return (
    <div className="max-w-2xl mx-auto px-5 py-8">

      {/* Header */}
      <div className="mb-7">
        <h2 className="text-[1.375rem] font-bold text-tempo-text mb-1">Today's overview</h2>
        <p className="text-tempo-faint text-sm">{today}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard label="Sessions"      value={completed.length.toString()} accent="#7C3AED" />
        <StatCard label="Avg focus"     value={completed.length ? `${avgScore}` : '—'} unit="/100" accent={scoreAccent(avgScore, completed.length > 0)} />
        <StatCard label="Focus time"    value={totalMinutes.toString()} unit="min" accent="#3B82F6" />
        <StatCard label="Distractions"  value={totalDistractions.toString()} accent={totalDistractions > 5 ? '#F59E0B' : '#64748B'} />
      </div>

      {/* Chart */}
      <div className="bg-tempo-surface/70 border border-tempo-border/20 rounded-2xl p-5 mb-5">
        <p className="text-[0.7rem] font-semibold text-tempo-muted uppercase tracking-widest mb-4">
          Focus Score per Session
        </p>
        <SessionChart sessions={completed} />
      </div>

      {moodSessions.length > 0 && (
        <section
          aria-label="Mood history"
          className="mb-5 rounded-2xl border border-tempo-border/20 bg-tempo-surface/70 p-5"
        >
          <p className="text-[0.7rem] font-semibold uppercase tracking-widest text-tempo-muted mb-4">
            Mood history
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {moodSessions.map((session) => {
              const mood = moodMeta(session.mood!);

              return (
                <div
                  key={`mood-${session._id}`}
                  className="rounded-2xl border border-tempo-border/20 bg-tempo-bg/35 px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-tempo-faint">
                        Session #{session.sessionNumber}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-2xl" aria-hidden="true">{mood.emoji}</span>
                        <span className="text-base font-semibold" style={{ color: mood.accent }}>
                          {mood.label}
                        </span>
                      </div>
                    </div>
                    <span
                      className="rounded-full px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-wide"
                      style={{
                        color: mood.accent,
                        background: `${mood.accent}1A`,
                        border: `1px solid ${mood.accent}33`,
                      }}
                    >
                      {breakDurationLabel(session.moodOverrideDuration)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Session list */}
      {sessions.length > 0 ? (
        <div>
          <p className="text-[0.7rem] font-semibold text-tempo-muted uppercase tracking-widest mb-3">
            All sessions
          </p>
          <div className="flex flex-col gap-1.5">
            {sessions.map(s => (
              <div
                key={s._id}
                className="flex items-center gap-4 px-4 py-3 bg-tempo-surface/65 border border-tempo-border/20 rounded-xl"
                style={{ borderLeft: `3px solid ${stateColor(s.state)}` }}
              >
                <span className="text-tempo-muted text-sm min-w-[90px]">
                  Session #{s.sessionNumber}
                </span>
                <span className="flex-1 text-[0.78rem] font-medium capitalize"
                  style={{ color: stateColor(s.state) }}>
                  {stateLabel(s.state)}
                </span>
                <span className="font-bold text-[0.95rem]"
                  style={{ color: scoreColor(s.focusScore), fontVariantNumeric: 'tabular-nums' }}>
                  {s.focusScore}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedSession(s)}
                  className="rounded-lg border border-tempo-border/30 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-tempo-muted transition-colors hover:text-tempo-text"
                  aria-label={`View insights for session #${s.sessionNumber}`}
                >
                  View insights
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center py-16 gap-3">
          <div className="w-14 h-14 rounded-2xl bg-tempo-surface/70 border border-tempo-border/20 flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
              stroke="#475569" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <p className="text-tempo-faint text-sm">No sessions today</p>
          <p className="text-tempo-muted text-xs">Start the timer to begin tracking</p>
        </div>
      )}
      <SessionInsightsModal
        open={selectedSession !== null}
        session={selectedSession}
        onClose={() => setSelectedSession(null)}
      />
    </div>
  );
}
