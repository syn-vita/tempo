import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePomodoroSession } from '../hooks/usePomodoroSession';
import { createSession, endSession, getTodaySessions, postSamples, updateSessionMood } from '../lib/api';
import {
  armDistractionOverlay,
  closeDistractionOverlay,
  isDistractionOverlayOpen,
  showDistractionOverlay,
  supportsDistractionOverlay,
} from '../lib/distractionOverlay';
import type { Session } from '../types';
import { DEFAULT_SETTINGS } from '../types';

vi.mock('../lib/api', () => ({
  createSession: vi.fn(),
  endSession: vi.fn(),
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

describe('usePomodoroSession insights callback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setVisibility('visible');
    vi.mocked(createSession).mockResolvedValue({ _id: 'session-1' } as any);
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
});
