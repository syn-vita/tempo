import { useSessions } from '../hooks/useSessions';
import { SessionChart } from '../components/SessionChart';

export function DashboardPage() {
  const { sessions, loading } = useSessions();

  const completed = sessions.filter(s => s.state === 'completed');
  const avgScore = completed.length
    ? Math.round(completed.reduce((sum, s) => sum + s.focusScore, 0) / completed.length)
    : 0;
  const totalDistractions = sessions.reduce((sum, s) => sum + s.distractionEvents, 0);

  if (loading) return <p style={{ textAlign: 'center', color: '#94a3b8', paddingTop: '3rem' }}>Loading...</p>;

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '2rem 1rem' }}>
      <h2 style={{ marginBottom: '2rem', color: '#e2e8f0' }}>Today's sessions</h2>

      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
        <StatCard label="Sessions" value={completed.length.toString()} />
        <StatCard label="Avg Focus Score" value={`${avgScore}`} />
        <StatCard label="Distractions" value={totalDistractions.toString()} />
      </div>

      <SessionChart sessions={completed} />

      <div style={{ marginTop: '2.5rem' }}>
        {sessions.map(s => (
          <div key={s._id} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '0.75rem 1rem', background: '#1e1e2e',
            borderRadius: '8px', marginBottom: '0.5rem',
          }}>
            <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
              Session #{s.sessionNumber}
            </span>
            <span style={{ color: stateColor(s.state), fontSize: '0.85rem' }}>
              {s.state}
            </span>
            <span style={{ color: scoreColor(s.focusScore), fontWeight: 600 }}>
              {s.focusScore}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      flex: 1, minWidth: '120px', background: '#1e1e2e',
      borderRadius: '12px', padding: '1.25rem', textAlign: 'center',
    }}>
      <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#e2e8f0' }}>{value}</div>
      <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>{label}</div>
    </div>
  );
}

function stateColor(state: string): string {
  if (state === 'completed') return '#22c55e';
  if (state === 'abandoned') return '#ef4444';
  return '#94a3b8';
}

function scoreColor(score: number): string {
  if (score >= 75) return '#22c55e';
  if (score >= 50) return '#eab308';
  return '#ef4444';
}
