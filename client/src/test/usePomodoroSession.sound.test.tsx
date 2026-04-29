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
import { playTimerEndSound, primeTimerEndSound } from '../lib/timerEndSound';
import { DEFAULT_SETTINGS } from '../types';
import type { Session } from '../types';

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

vi.mock('../lib/timerEndSound', () => ({
  playTimerEndSound: vi.fn(),
  primeTimerEndSound: vi.fn(),
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
    distractionEvents: 1,
    focusScore: 75,
    avgActivityRate: 0.4,
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

describe('usePomodoroSession timer end sounds', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setVisibility('visible');

    vi.mocked(createSession).mockResolvedValue({ _id: 'session-1' } as any);
    vi.mocked(endSession).mockResolvedValue(buildFinalizedSession('completed'));
    vi.mocked(getTodaySessions).mockResolvedValue([]);
    vi.mocked(postSamples).mockResolvedValue(undefined);
    vi.mocked(updateSessionMood).mockResolvedValue(buildFinalizedSession('completed'));
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

  it('plays sound when focus timer completes naturally', async () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      workDuration: 1,
      distractionOverlayEnabled: false,
    };
    const { result, unmount } = renderHook(() => usePomodoroSession(settings));

    await act(async () => {
      await result.current.start();
    });

    expect(primeTimerEndSound).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(1_000);
    });

    expect(result.current.phase).toBe('break_pending');
    expect(playTimerEndSound).toHaveBeenCalledTimes(1);
    expect(playTimerEndSound).toHaveBeenCalledWith({ volume: settings.timerEndSoundVolume });
    expect(endSession).toHaveBeenCalledWith(
      'session-1',
      expect.objectContaining({ state: 'completed' })
    );
    unmount();
  });

  it('plays sound when user manually stops an active session', async () => {
    vi.mocked(endSession).mockResolvedValue(buildFinalizedSession('abandoned'));

    const { result, unmount } = renderHook(() =>
      usePomodoroSession(DEFAULT_SETTINGS)
    );

    await act(async () => {
      await result.current.start();
    });

    await act(async () => {
      await result.current.stop();
    });

    expect(playTimerEndSound).toHaveBeenCalledTimes(1);
    expect(playTimerEndSound).toHaveBeenCalledWith({ volume: DEFAULT_SETTINGS.timerEndSoundVolume });
    expect(endSession).toHaveBeenCalledWith(
      'session-1',
      expect.objectContaining({ state: 'abandoned' })
    );
    unmount();
  });

  it('plays sound when break is taken from distraction prompt', async () => {
    vi.mocked(endSession).mockResolvedValue(buildFinalizedSession('break_taken'));
    const settings = {
      ...DEFAULT_SETTINGS,
      distractionThreshold: 0,
      distractionOverlayEnabled: false,
    };
    const { result, unmount } = renderHook(() => usePomodoroSession(settings));

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

    expect(playTimerEndSound).toHaveBeenCalledTimes(1);
    expect(playTimerEndSound).toHaveBeenCalledWith({ volume: settings.timerEndSoundVolume });
    expect(endSession).toHaveBeenCalledWith(
      'session-1',
      expect.objectContaining({ state: 'break_taken' })
    );
    unmount();
  });

  it('does not play sound when timer-end sound is disabled', async () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      timerEndSoundEnabled: false,
      workDuration: 1,
      distractionOverlayEnabled: false,
    };
    const { result, unmount } = renderHook(() => usePomodoroSession(settings));

    await act(async () => {
      await result.current.start();
    });

    expect(primeTimerEndSound).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1_000);
    });

    expect(result.current.phase).toBe('break_pending');
    expect(playTimerEndSound).not.toHaveBeenCalled();
    unmount();
  });
});
