import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { Session } from '../types';

interface Props {
  sessions: Session[];
}

function barColor(score: number): string {
  if (score >= 75) return '#10B981';
  if (score >= 50) return '#F59E0B';
  return '#EF4444';
}

export function SessionChart({ sessions }: Props) {
  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3">
        <div className="w-11 h-11 rounded-xl bg-tempo-surface/70 border border-tempo-border/20 flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="#475569" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18M9 21V9" />
          </svg>
        </div>
        <p className="text-tempo-faint text-sm">No completed sessions yet</p>
      </div>
    );
  }

  const data = sessions.map((s, i) => ({ name: `#${i + 1}`, score: s.focusScore }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <XAxis
          dataKey="name"
          tick={{ fill: 'rgb(var(--tempo-faint))', fontSize: 11 }}
          axisLine={{ stroke: 'rgb(var(--tempo-border) / 0.2)' }}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fill: 'rgb(var(--tempo-faint))', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            background: 'rgb(var(--tempo-elevated))',
            border: '1px solid rgb(var(--tempo-border) / 0.25)',
            borderRadius: '10px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          }}
          labelStyle={{ color: 'rgb(var(--tempo-muted))', fontSize: '0.8rem' }}
          itemStyle={{ color: 'rgb(var(--tempo-text))', fontSize: '0.875rem' }}
          formatter={(v: number) => [`${v}`, 'Focus Score']}
          cursor={{ fill: 'rgb(var(--tempo-border) / 0.1)' }}
        />
        <Bar dataKey="score" radius={[5, 5, 0, 0]} maxBarSize={40}>
          {data.map((d, i) => (
            <Cell key={i} fill={barColor(d.score)} opacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
