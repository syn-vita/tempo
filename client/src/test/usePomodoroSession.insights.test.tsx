import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePomodoroSession } from '../hooks/usePomodoroSession';
import { createSession, endSession, postSamples } from '../lib/api';
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
  postSamples: vi.fn(),
}));

vi.mock('../lib/distractionOverlay', () => ({
  armDistractionOverlay: vi.fn(),
  closeDistractionOverlay: vi.fn(),
  isDistractionOverlayOpen: vi.fn(),
  showDistractionOverlay: vi.fn(),
  supportsDistractionOverlay: vi.fn(),
}));

function buildFinalizedSession(state: 'completed' | 'abandoned'): Session {
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
    moodOverrideDuration: null,
  };
}

describe('usePomodoroSession insights callback', () => {
  beforeEach(() => {
    vi.mocked(createSession).mockResolvedValue({ _id: 'session-1' } as any);
    vi.mocked(postSamples).mockResolvedValue(undefined);
    vi.mocked(armDistractionOverlay).mockResolvedValue(true);
    vi.mocked(closeDistractionOverlay).mockImplementation(() => {});
    vi.mocked(isDistractionOverlayOpen).mockReturnValue(false);
    vi.mocked(supportsDistractionOverlay).mockReturnValue(false);
    vi.mocked(showDistractionOverlay).mockResolvedValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('emits finalized abandoned session after stopping an active pomodoro', async () => {
    const finalized = buildFinalizedSession('abandoned');
    vi.mocked(endSession).mockResolvedValue(finalized);
    const onSessionFinalized = vi.fn();

    const { result } = renderHook(() =>
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
  });

  it('emits finalized completed session when break is confirmed', async () => {
    const finalized = buildFinalizedSession('completed');
    vi.mocked(endSession).mockResolvedValue(finalized);
    const onSessionFinalized = vi.fn();

    const { result } = renderHook(() =>
      usePomodoroSession(DEFAULT_SETTINGS, { onSessionFinalized })
    );

    await act(async () => {
      await result.current.start();
    });

    await act(async () => {
      await result.current.confirmBreak();
    });

    expect(endSession).toHaveBeenCalledWith(
      'session-1',
      expect.objectContaining({ state: 'completed' })
    );
    expect(onSessionFinalized).toHaveBeenCalledWith(finalized);
  });
});
