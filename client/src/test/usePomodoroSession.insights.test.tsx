import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePomodoroSession } from '../hooks/usePomodoroSession';
import {
  createSession,
  endSession,
  getAdaptationSummary,
  getTodaySessions,
  postSamples,
  updateSessionMood,
} from '../lib/api';
import {
  armDistractionOverlay,
  closeDistractionOverlay,
  isDistractionOverlayOpen,
  showDistractionOverlay,
  supportsDistractionOverlay,
} from '../lib/distractionOverlay';
import type { AdaptationSummary, Session } from '../types';
import { DEFAULT_SETTINGS } from '../types';

vi.mock('../lib/api', () => ({
  createSession: vi.fn(),
  endSession: vi.fn(),
  getAdaptationSummary: vi.fn(),
  getTodaySessions: vi.fn(),
  postSamples: vi.fn(),
  updateSessionMood: vi.fn(),
}));

vi.mock('../lib/distractionOverlay', () => ({
  armDistractionOverlay: vi.fn(),
  closeDistractionOverlay: vi.fn(),
  isDistractionOverlayOpen: vi.fn(),
  showDistractionOverlay: vi.fn(),
  supportsDistractionOverlay: vi.fn(),
}));

function buildFinalizedSession(state: 'completed' | 'abandoned' | 'break_taken'): Session {
  return {
    _id: `session-${state}`,
    userId: 'test-user',
    startTime: new Date().toISOString(),
    endTime: new Date().toISOString(),
    plannedDuration: 1_500_000,
    actualDuration: 600_000,
    state,
    extensionReason: state === 'completed' ? 'flow' : null,
    distractionEvents: 2,
    focusScore: 82,
    avgActivityRate: 0.62,
    sessionNumber: 1,
    mood: null,
    moodOverrideDuration: null,
  };
}

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    value: state,
  });
}

function buildAdaptationSummary(overrides: Partial<AdaptationSummary> = {}): AdaptationSummary {
  return {
    lastMood: null,
    recentMoodCounts: {
      stressed: 0,
      tired: 0,
      neutral: 0,
      good: 0,
      energized: 0,
    },
    recentMoodStreak: { mood: null, count: 0 },
    rollingSummary: {
      last7Days: {
        stressed: 0,
        tired: 0,
        neutral: 0,
        good: 0,
        energized: 0,
      },
    },
    activeTemporaryOverride: null,
    recommendations: [],
    tunedGuidanceContext: {
      recentStressBias: false,
      recentFatigueBias: false,
    },
    ...overrides,
  };
}

describe('usePomodoroSession insights callback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setVisibility('visible');
    vi.mocked(createSession).mockResolvedValue({ _id: 'session-1' } as any);
    vi.mocked(getAdaptationSummary).mockResolvedValue(buildAdaptationSummary());
    vi.mocked(postSamples).mockResolvedValue(undefined);
    vi.mocked(updateSessionMood).mockResolvedValue({
      ...buildFinalizedSession('completed'),
      mood: 'stressed',
      moodOverrideDuration: 15 * 60 * 1000,
    });
    vi.mocked(getTodaySessions).mockResolvedValue([]);
    vi.mocked(armDistractionOverlay).mockResolvedValue(true);
    vi.mocked(closeDistractionOverlay).mockImplementation(() => {});
    vi.mocked(isDistractionOverlayOpen).mockReturnValue(false);
    vi.mocked(supportsDistractionOverlay).mockReturnValue(false);
    vi.mocked(showDistractionOverlay).mockResolvedValue(true);
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.clearAllMocks();
    setVisibility('visible');
  });

  it('emits finalized abandoned session after stopping an active pomodoro', async () => {
    const finalized = buildFinalizedSession('abandoned');
    vi.mocked(endSession).mockResolvedValue(finalized);
    const onSessionFinalized = vi.fn();

    const { result, unmount } = renderHook(() =>
      usePomodoroSession(DEFAULT_SETTINGS, { onSessionFinalized })
    );

    await act(async () => {
      await result.current.start();
    });

    await act(async () => {
      await result.current.stop();
    });

    expect(endSession).toHaveBeenCalledWith(
      'session-1',
      expect.objectContaining({ state: 'abandoned' })
    );
    expect(onSessionFinalized).toHaveBeenCalledWith(finalized);
    unmount();
  });

  it('finalizes on natural timer end and emits insights on break confirmation', async () => {
    const finalized = buildFinalizedSession('completed');
    vi.mocked(endSession).mockResolvedValue(finalized);
    const onSessionFinalized = vi.fn();
    const settings = { ...DEFAULT_SETTINGS, workDuration: 1, distractionOverlayEnabled: false };

    const { result, unmount } = renderHook(() =>
      usePomodoroSession(settings, { onSessionFinalized })
    );

    await act(async () => {
      await result.current.start();
    });

    await act(async () => {
      vi.advanceTimersByTime(1_000);
      await Promise.resolve();
    });

    expect(result.current.phase).toBe('break_pending');
    expect(endSession).toHaveBeenCalledWith(
      'session-1',
      expect.objectContaining({ state: 'completed' })
    );
    expect(onSessionFinalized).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.confirmBreak();
    });

    expect(endSession).toHaveBeenCalledTimes(1);
    expect(onSessionFinalized).toHaveBeenCalledWith(finalized);
    unmount();
  });

  it('emits finalized break_taken session when break is confirmed from distraction prompt', async () => {
    const finalized = buildFinalizedSession('break_taken');
    vi.mocked(endSession).mockResolvedValue(finalized);
    const onSessionFinalized = vi.fn();
    const settings = { ...DEFAULT_SETTINGS, distractionThreshold: 0, distractionOverlayEnabled: false };

    const { result, unmount } = renderHook(() =>
      usePomodoroSession(settings, { onSessionFinalized })
    );

    await act(async () => {
      await result.current.start();
    });

    await act(async () => {
      setVisibility('hidden');
      document.dispatchEvent(new Event('visibilitychange'));
      vi.advanceTimersByTime(40_000);
      await Promise.resolve();
    });

    expect(result.current.phase).toBe('distraction_prompt');

    await act(async () => {
      await result.current.confirmBreak();
    });

    expect(endSession).toHaveBeenCalledWith(
      'session-1',
      expect.objectContaining({ state: 'break_taken' })
    );
    expect(onSessionFinalized).toHaveBeenCalledWith(finalized);
    unmount();
  });

  it('applies a mood override to an active break after the user selects a mood', async () => {
    const finalized = buildFinalizedSession('completed');
    vi.mocked(endSession).mockResolvedValue(finalized);
    const settings = { ...DEFAULT_SETTINGS, workDuration: 1, distractionOverlayEnabled: false };

    const { result, unmount } = renderHook(() =>
      usePomodoroSession(settings)
    );

    await act(async () => {
      await result.current.start();
    });

    await act(async () => {
      vi.advanceTimersByTime(1_000);
      await Promise.resolve();
    });

    await act(async () => {
      await result.current.confirmBreak();
    });

    expect(result.current.phase).toBe('break');
    expect(result.current.timeRemaining).toBe(DEFAULT_SETTINGS.shortBreak);

    await act(async () => {
      await (result.current as any).selectMood('stressed');
    });

    expect(updateSessionMood).toHaveBeenCalledWith('session-1', 'stressed');
    expect(result.current.pendingBreakDuration).toBe(15 * 60 * 1000);
    expect(result.current.timeRemaining).toBe(15 * 60 * 1000);
    unmount();
  });

  it('starts future work sessions with a temporary work-duration override from adaptation', async () => {
    vi.mocked(getAdaptationSummary).mockResolvedValue(buildAdaptationSummary({
      lastMood: 'tired',
      recentMoodCounts: {
        stressed: 0,
        tired: 2,
        neutral: 0,
        good: 0,
        energized: 0,
      },
      recentMoodStreak: { mood: 'tired', count: 2 },
      rollingSummary: {
        last7Days: {
          stressed: 0,
          tired: 3,
          neutral: 0,
          good: 0,
          energized: 0,
        },
      },
      activeTemporaryOverride: {
        workDurationOverride: 20 * 60 * 1000,
        reason: 'Applied because recent moods were tired.',
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      },
      tunedGuidanceContext: {
        recentStressBias: false,
        recentFatigueBias: true,
      },
    }));

    const { result, unmount } = renderHook(() => usePomodoroSession(DEFAULT_SETTINGS));

    await act(async () => {
      await result.current.start();
    });

    expect(createSession).toHaveBeenCalledWith(20 * 60 * 1000);
    unmount();
  });

  it('applies a temporary short break override to the next pending break', async () => {
    vi.mocked(endSession).mockResolvedValue(buildFinalizedSession('completed'));
    vi.mocked(getAdaptationSummary).mockResolvedValue(buildAdaptationSummary({
      activeTemporaryOverride: {
        shortBreakOverride: 10 * 60 * 1000,
        reason: 'Applied because recent moods were stressed.',
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      },
    }));

    const settings = { ...DEFAULT_SETTINGS, workDuration: 1, distractionOverlayEnabled: false };
    const { result, unmount } = renderHook(() => usePomodoroSession(settings));

    await act(async () => {
      await result.current.start();
    });

    await act(async () => {
      vi.advanceTimersByTime(1_000);
      await Promise.resolve();
    });

    expect(result.current.phase).toBe('break_pending');
    expect(result.current.pendingBreakDuration).toBe(10 * 60 * 1000);
    unmount();
  });

  it('applies a temporary long break override to the next scheduled long break', async () => {
    vi.mocked(endSession).mockResolvedValue(buildFinalizedSession('completed'));
    vi.mocked(getAdaptationSummary).mockResolvedValue(buildAdaptationSummary({
      activeTemporaryOverride: {
        longBreakOverride: 20 * 60 * 1000,
        reason: 'Applied because recent moods were stressed.',
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      },
    }));

    const settings = {
      ...DEFAULT_SETTINGS,
      workDuration: 1,
      distractionOverlayEnabled: false,
      longBreakInterval: 1,
    };
    const { result, unmount } = renderHook(() => usePomodoroSession(settings));

    await act(async () => {
      await result.current.start();
    });

    await act(async () => {
      vi.advanceTimersByTime(1_000);
      await Promise.resolve();
    });

    expect(result.current.phase).toBe('break_pending');
    expect(result.current.pendingBreakDuration).toBe(20 * 60 * 1000);
    unmount();
  });

  it('falls back to base settings when no active temporary override exists', async () => {
    vi.mocked(endSession).mockResolvedValue(buildFinalizedSession('completed'));
    const settings = { ...DEFAULT_SETTINGS, workDuration: 1, distractionOverlayEnabled: false };
    const { result, unmount } = renderHook(() => usePomodoroSession(settings));

    await act(async () => {
      await result.current.start();
    });

    expect(createSession).toHaveBeenCalledWith(settings.workDuration);

    await act(async () => {
      vi.advanceTimersByTime(1_000);
      await Promise.resolve();
    });

    expect(result.current.phase).toBe('break_pending');
    expect(result.current.pendingBreakDuration).toBe(DEFAULT_SETTINGS.shortBreak);
    unmount();
  });

  it('refreshes adaptation on start when the initial fetch has not settled yet', async () => {
    const deferred = new Promise(() => {});
    vi.mocked(getAdaptationSummary)
      .mockReturnValueOnce(deferred as Promise<any>)
      .mockResolvedValueOnce(buildAdaptationSummary({
        activeTemporaryOverride: {
          workDurationOverride: 20 * 60 * 1000,
          reason: 'Applied because recent moods were tired.',
          expiresAt: new Date(Date.now() + 60_000).toISOString(),
        },
      }));

    const { result, unmount } = renderHook(() => usePomodoroSession(DEFAULT_SETTINGS));

    await act(async () => {
      await result.current.start();
    });

    expect(getAdaptationSummary).toHaveBeenCalledTimes(2);
    expect(createSession).toHaveBeenCalledWith(20 * 60 * 1000);
    unmount();
  });
});
