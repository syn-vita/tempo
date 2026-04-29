import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardPage } from '../pages/DashboardPage';
import type { AdaptationSummary, Session } from '../types';

vi.mock('../hooks/useSessions', () => ({
  useSessions: vi.fn(),
}));

vi.mock('../lib/api', () => ({
  getAdaptationSummary: vi.fn(),
  applyAdaptationAction: vi.fn(),
}));

vi.mock('../components/SessionChart', () => ({
  SessionChart: () => null,
}));

import { useSessions } from '../hooks/useSessions';
import { applyAdaptationAction, getAdaptationSummary } from '../lib/api';

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

function buildAdaptationSummary(overrides: Partial<AdaptationSummary> = {}): AdaptationSummary {
  return {
    lastMood: 'stressed',
    recentMoodCounts: {
      stressed: 2,
      tired: 0,
      neutral: 0,
      good: 0,
      energized: 0,
    },
    recentMoodStreak: { mood: 'stressed', count: 2 },
    rollingSummary: {
      last7Days: {
        stressed: 2,
        tired: 0,
        neutral: 0,
        good: 0,
        energized: 0,
      },
    },
    activeTemporaryOverride: null,
    recommendations: [],
    tunedGuidanceContext: {
      recentStressBias: true,
      recentFatigueBias: false,
    },
    ...overrides,
  };
}

describe('Dashboard session insights', () => {
  beforeEach(() => {
    vi.mocked(getAdaptationSummary).mockResolvedValue(buildAdaptationSummary());
    vi.mocked(applyAdaptationAction).mockResolvedValue(buildAdaptationSummary());
  });

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

  it('renders a mood history section for sessions with recorded moods', async () => {
    vi.mocked(useSessions).mockReturnValue({
      loading: false,
      refresh: vi.fn(),
      sessions: [
        buildSession({
          _id: 'session-1',
          sessionNumber: 1,
          mood: 'stressed',
          moodOverrideDuration: 15 * 60 * 1000,
        }),
        buildSession({
          _id: 'session-2',
          sessionNumber: 2,
          mood: null,
        }),
        buildSession({
          _id: 'session-3',
          sessionNumber: 3,
          mood: 'energized',
          moodOverrideDuration: 3 * 60 * 1000,
        }),
      ],
    });

    render(<DashboardPage />);

    const moodHistory = screen.getByLabelText(/mood history/i);

    expect(within(moodHistory).getByText(/session #1/i)).toBeTruthy();
    expect(within(moodHistory).getByText('Stressed')).toBeTruthy();
    expect(within(moodHistory).getByText(/15 min break/i)).toBeTruthy();
    expect(within(moodHistory).getByText(/session #3/i)).toBeTruthy();
    expect(within(moodHistory).getByText('Energized')).toBeTruthy();
    expect(within(moodHistory).getByText(/3 min break/i)).toBeTruthy();
    expect(within(moodHistory).queryByText(/session #2/i)).toBeNull();

    await screen.findByLabelText(/mood trends/i);
  });

  it('renders adaptation recommendations and applies an action from the dashboard', async () => {
    vi.mocked(useSessions).mockReturnValue({
      loading: false,
      refresh: vi.fn(),
      sessions: [
        buildSession({
          _id: 'session-1',
          sessionNumber: 1,
          mood: 'stressed',
          focusScore: 42,
        }),
        buildSession({
          _id: 'session-2',
          sessionNumber: 2,
          mood: 'stressed',
          focusScore: 38,
        }),
        buildSession({
          _id: 'session-3',
          sessionNumber: 3,
          mood: 'good',
          focusScore: 84,
        }),
      ],
    });

    vi.mocked(getAdaptationSummary).mockResolvedValue(
      buildAdaptationSummary({
        recentMoodCounts: {
          stressed: 2,
          tired: 0,
          neutral: 0,
          good: 1,
          energized: 0,
        },
        recentMoodStreak: { mood: 'stressed', count: 2 },
        rollingSummary: {
          last7Days: {
            stressed: 2,
            tired: 0,
            neutral: 0,
            good: 1,
            energized: 0,
          },
        },
        recommendations: [
          {
            id: 'stressed-longer-breaks',
            title: 'Take longer breaks today',
            reason: 'Recent sessions were frequently marked stressed.',
            actionLabel: 'Apply longer breaks today',
            actionType: 'apply_longer_breaks_today',
          },
        ],
      })
    );

    vi.mocked(applyAdaptationAction).mockResolvedValue(
      buildAdaptationSummary({
        activeTemporaryOverride: {
          shortBreakOverride: 10 * 60 * 1000,
          longBreakOverride: 20 * 60 * 1000,
          reason: 'Applied because recent moods were stressed.',
          expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        },
        recommendations: [],
      })
    );

    render(<DashboardPage />);

    expect(await screen.findByText(/take longer breaks today/i)).toBeTruthy();
    expect(screen.getByText(/most common mood/i)).toBeTruthy();

    const moodTrends = screen.getByLabelText(/mood trends/i);
    expect(within(moodTrends).getByText(/^stressed$/i)).toBeTruthy();

    await userEvent.click(screen.getByRole('button', { name: /apply longer breaks today/i }));

    expect(applyAdaptationAction).toHaveBeenCalledWith('apply_longer_breaks_today');
    expect(await screen.findByText(/active override/i)).toBeTruthy();
    expect(await screen.findByText(/short break override: 10 min/i)).toBeTruthy();
  });

  it('keeps recommendation UI stable when applying an adaptation action fails', async () => {
    vi.mocked(useSessions).mockReturnValue({
      loading: false,
      refresh: vi.fn(),
      sessions: [
        buildSession({
          _id: 'session-1',
          sessionNumber: 1,
          mood: 'stressed',
          focusScore: 42,
        }),
      ],
    });

    vi.mocked(getAdaptationSummary).mockResolvedValue(
      buildAdaptationSummary({
        recommendations: [
          {
            id: 'stressed-longer-breaks',
            title: 'Take longer breaks today',
            reason: 'Recent sessions were frequently marked stressed.',
            actionLabel: 'Apply longer breaks today',
            actionType: 'apply_longer_breaks_today',
          },
        ],
      })
    );
    vi.mocked(applyAdaptationAction).mockRejectedValueOnce(new Error('network failed'));

    render(<DashboardPage />);

    expect(await screen.findByText(/take longer breaks today/i)).toBeTruthy();

    await userEvent.click(screen.getByRole('button', { name: /apply longer breaks today/i }));

    expect(applyAdaptationAction).toHaveBeenCalledWith('apply_longer_breaks_today');
    expect(screen.getByRole('button', { name: /apply longer breaks today/i })).toBeTruthy();
    expect(screen.queryByLabelText(/temporary override/i)).toBeNull();
    expect(screen.getByLabelText(/mood trends/i)).toBeTruthy();
  });

  it('renders base dashboard content when the adaptation summary fetch fails on mount', async () => {
    vi.mocked(useSessions).mockReturnValue({
      loading: false,
      refresh: vi.fn(),
      sessions: [
        buildSession({
          _id: 'session-1',
          sessionNumber: 1,
          mood: 'good',
          focusScore: 84,
        }),
      ],
    });

    vi.mocked(getAdaptationSummary).mockRejectedValueOnce(new Error('offline'));

    render(<DashboardPage />);

    expect(screen.getByText(/today's overview/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /view insights for session #1/i })).toBeTruthy();
    expect(screen.getByLabelText(/mood trends/i)).toBeTruthy();
    expect(screen.queryByLabelText(/adaptation recommendations/i)).toBeNull();
    expect(screen.queryByLabelText(/temporary override/i)).toBeNull();
  });

  it('shows mood adaptation details in session insights', async () => {
    vi.mocked(useSessions).mockReturnValue({
      loading: false,
      refresh: vi.fn(),
      sessions: [
        buildSession({
          _id: 'session-1',
          sessionNumber: 1,
          mood: 'stressed',
          moodOverrideDuration: 15 * 60 * 1000,
        }),
      ],
    });

    render(<DashboardPage />);

    await userEvent.click(screen.getByRole('button', { name: /view insights for session #1/i }));

    const insights = screen.getByRole('dialog', { name: /session #1/i });

    expect(within(insights).getByText('Stressed')).toBeTruthy();
    expect(within(insights).getByText(/15 min break/i)).toBeTruthy();
    expect(
      within(insights).getByText(/tempo extended this break to 15 min because you reported feeling stressed/i)
    ).toBeTruthy();
  });

  it('shows fallback mood adaptation content when no override duration is recorded', async () => {
    vi.mocked(useSessions).mockReturnValue({
      loading: false,
      refresh: vi.fn(),
      sessions: [
        buildSession({
          _id: 'session-1',
          sessionNumber: 1,
          mood: 'tired',
          moodOverrideDuration: null,
        }),
      ],
    });

    render(<DashboardPage />);

    await userEvent.click(screen.getByRole('button', { name: /view insights for session #1/i }));

    const insights = screen.getByRole('dialog', { name: /session #1/i });

    expect(within(insights).getByText('Tired')).toBeTruthy();
    expect(within(insights).getByText(/standard break/i)).toBeTruthy();
    expect(
      within(insights).getByText(/tempo recorded a mood-based break adjustment for this session/i)
    ).toBeTruthy();
  });

  it('clears the modal between close and reopen interactions', async () => {
    vi.mocked(useSessions).mockReturnValue({
      loading: false,
      refresh: vi.fn(),
      sessions: [
        buildSession({
          _id: 'session-1',
          sessionNumber: 1,
          mood: 'stressed',
          moodOverrideDuration: 15 * 60 * 1000,
        }),
        buildSession({
          _id: 'session-2',
          sessionNumber: 2,
          mood: 'energized',
          moodOverrideDuration: 3 * 60 * 1000,
        }),
      ],
    });

    render(<DashboardPage />);

    await userEvent.click(screen.getByRole('button', { name: /view insights for session #1/i }));
    const firstInsights = screen.getByRole('dialog', { name: /session #1/i });
    expect(firstInsights).toBeTruthy();
    expect(within(firstInsights).getByText(/15 min break/i)).toBeTruthy();

    await userEvent.click(screen.getByRole('button', { name: /close session insights/i }));
    expect(screen.queryByRole('dialog', { name: /session #1/i })).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: /view insights for session #2/i }));

    const reopenedInsights = screen.getByRole('dialog', { name: /session #2/i });

    expect(within(reopenedInsights).getByText('Energized')).toBeTruthy();
    expect(within(reopenedInsights).getByText(/3 min break/i)).toBeTruthy();
    expect(within(reopenedInsights).queryByText(/15 min break/i)).toBeNull();
  });
});
