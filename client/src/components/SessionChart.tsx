import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { Session } from '../types';

interface Props {
  sessions: Session[];
}

export function SessionChart({ sessions }: Props) {
  const data = sessions.map((s, i) => ({
    name: `#${i + 1}`,
    score: s.focusScore,
  }));

  function barColor(score: number): string {
    if (score >= 75) return '#22c55e';
    if (score >= 50) return '#eab308';
    return '#ef4444';
  }

  if (data.length === 0) {
    return <p style={{ color: '#94a3b8', textAlign: 'center' }}>No sessions today yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
        <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} />
        <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 12 }} />
        <Tooltip
          contentStyle={{ background: '#1e1e2e', border: 'none', borderRadius: '8px' }}
          labelStyle={{ color: '#e2e8f0' }}
          formatter={(v: number) => [`${v}`, 'Focus Score']}
        />
        <Bar dataKey="score" radius={[6, 6, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={barColor(d.score)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
