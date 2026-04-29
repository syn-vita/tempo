import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardPage } from '../pages/DashboardPage';
import type { Session } from '../types';

vi.mock('../hooks/useSessions', () => ({
  useSessions: vi.fn(),
}));

vi.mock('../components/SessionChart', () => ({
  SessionChart: () => null,
}));

import { useSessions } from '../hooks/useSessions';

function buildSession(overrides: Partial<Session>): Session {
  return {
    _id: 'session-default',
    userId: 'user-1',
    startTime: new Date().toISOString(),
    endTime: new Date().toISOString(),
    plannedDuration: 1_500_000,
    actualDuration: 1_200_000,
    state: 'completed',
    extensionReason: null,
    distractionEvents: 0,
    focusScore: 70,
    avgActivityRate: 0.5,
    sessionNumber: 1,
    mood: null,
    moodOverrideDuration: null,
    ...overrides,
  };
}

describe('Dashboard session insights', () => {
  it('opens insights for the clicked session only', async () => {
    vi.mocked(useSessions).mockReturnValue({
      loading: false,
      refresh: vi.fn(),
      sessions: [
        buildSession({
          _id: 'session-1',
          sessionNumber: 1,
          focusScore: 42,
          avgActivityRate: 0.24,
          distractionEvents: 3,
        }),
        buildSession({
          _id: 'session-2',
          sessionNumber: 2,
          focusScore: 88,
          avgActivityRate: 0.8,
          distractionEvents: 1,
          extensionReason: 'flow',
        }),
      ],
    });

    render(<DashboardPage />);

    await userEvent.click(screen.getByRole('button', { name: /view insights for session #2/i }));

    expect(screen.getByRole('heading', { name: /session #2/i })).toBeTruthy();
    expect(screen.getByText('88/100')).toBeTruthy();
    expect(screen.getByText('0.80/s')).toBeTruthy();
    expect(screen.queryByRole('heading', { name: /session #1/i })).toBeNull();
  });
});
