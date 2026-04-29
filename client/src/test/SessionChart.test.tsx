import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { SessionChart } from '../components/SessionChart';
import type { Session } from '../types';

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  BarChart: ({ data, children }: { data: Array<{ name: string; score: number }>; children: ReactNode }) => (
    <div>
      <div data-testid="chart-data">{JSON.stringify(data)}</div>
      {children}
    </div>
  ),
  Bar: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  Cell: () => null,
}));

function makeSession(sessionNumber: number, focusScore: number): Session {
  return {
    _id: `session-${sessionNumber}`,
    userId: 'user-1',
    startTime: new Date().toISOString(),
    endTime: null,
    plannedDuration: 1_500_000,
    actualDuration: 1_500_000,
    state: 'completed',
    extensionReason: null,
    distractionEvents: 0,
    focusScore,
    avgActivityRate: 0.45,
    sessionNumber,
    mood: null,
    moodOverrideDuration: null,
  };
}

describe('SessionChart', () => {
  it('uses canonical sessionNumber values for chart labels', () => {
    render(
      <SessionChart
        sessions={[
          makeSession(1, 82),
          makeSession(3, 76),
          makeSession(4, 91),
        ]}
      />
    );

    const data = JSON.parse(screen.getByTestId('chart-data').textContent ?? '[]') as Array<{ name: string }>;
    expect(data.map((entry) => entry.name)).toEqual(['#1', '#3', '#4']);
  });
});
