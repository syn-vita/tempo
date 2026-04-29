import { act, fireEvent, render, screen, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BreakView } from '../components/BreakView';
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

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    value: state,
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  setVisibility('visible');
  vi.mocked(createSession).mockResolvedValue({ _id: 'session-1' } as any);
  vi.mocked(endSession).mockResolvedValue({
    _id: 'session-1',
    userId: 'test-user',
    startTime: new Date().toISOString(),
    endTime: new Date().toISOString(),
    plannedDuration: DEFAULT_SETTINGS.workDuration,
    actualDuration: DEFAULT_SETTINGS.workDuration,
    state: 'completed',
    extensionReason: null,
    distractionEvents: 0,
    focusScore: 100,
    sessionNumber: 1,
    mood: null,
    moodOverrideDuration: null,
  } as any);
  vi.mocked(getAdaptationSummary).mockResolvedValue(null);
  vi.mocked(getTodaySessions).mockResolvedValue([]);
  vi.mocked(postSamples).mockResolvedValue(undefined);
  vi.mocked(updateSessionMood).mockResolvedValue({
    _id: 'session-1',
    userId: 'test-user',
    startTime: new Date().toISOString(),
    endTime: new Date().toISOString(),
    plannedDuration: DEFAULT_SETTINGS.workDuration,
    actualDuration: DEFAULT_SETTINGS.workDuration,
    state: 'completed',
    extensionReason: null,
    distractionEvents: 0,
    focusScore: 100,
    sessionNumber: 1,
    mood: 'stressed',
    moodOverrideDuration: null,
  } as any);
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

describe('BreakView mood guidance', () => {
  it('renders tuned guidance and calls resume early when requested', async () => {
    const onResumeEarly = vi.fn();

    render(
      <BreakView
        timeRemaining={15 * 60 * 1000}
        breakDuration={15 * 60 * 1000}
        currentMood="energized"
        tunedGuidance="Step outside and breathe more slowly."
        onStop={vi.fn()}
        onMoodSelect={vi.fn()}
        onResumeEarly={onResumeEarly}
      />
    );

    expect(screen.getByText(/step outside and breathe more slowly/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /resume early/i }));

    expect(onResumeEarly).toHaveBeenCalledTimes(1);
  });

  it('omits the resume early button for non-energized moods', () => {
    render(
      <BreakView
        timeRemaining={3 * 60 * 1000}
        breakDuration={3 * 60 * 1000}
        currentMood="neutral"
        tunedGuidance="Use a quick recharge, then jump back in when ready."
        onStop={vi.fn()}
        onMoodSelect={vi.fn()}
        onResumeEarly={vi.fn()}
      />
    );

    expect(screen.queryByRole('button', { name: /resume early/i })).toBeNull();
  });

  it('renders fallback guidance when tuned guidance is absent', () => {
    render(
      <BreakView
        timeRemaining={10 * 60 * 1000}
        breakDuration={10 * 60 * 1000}
        currentMood={null}
        tunedGuidance={null}
        onStop={vi.fn()}
        onMoodSelect={vi.fn()}
      />
    );

    expect(screen.getByText(/drink some water and stretch your back/i)).toBeTruthy();
  });
});

describe('usePomodoroSession break behavior', () => {
  it('returns to idle when resumeEarly is used during an active break', async () => {
    const settings = { ...DEFAULT_SETTINGS, workDuration: 1, distractionOverlayEnabled: false };
    const { result } = renderHook(() => usePomodoroSession(settings));

    await act(async () => {
      await result.current.start();
    });

    expect(createSession).toHaveBeenCalledWith(1);

    await act(async () => {
      vi.advanceTimersByTime(1_000);
      await Promise.resolve();
    });

    expect(result.current.phase).toBe('break_pending');

    await act(async () => {
      await result.current.confirmBreak();
    });

    expect(result.current.phase).toBe('break');

    act(() => {
      result.current.resumeEarly();
    });

    expect(result.current.phase).toBe('idle');
  });
});
