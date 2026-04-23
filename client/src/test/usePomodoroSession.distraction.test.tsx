import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePomodoroSession } from '../hooks/usePomodoroSession';
import { createSession, postSamples } from '../lib/api';
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
  postSamples: vi.fn(),
}));

vi.mock('../lib/distractionOverlay', () => ({
  armDistractionOverlay: vi.fn(),
  closeDistractionOverlay: vi.fn(),
  isDistractionOverlayOpen: vi.fn(),
  showDistractionOverlay: vi.fn(),
  supportsDistractionOverlay: vi.fn(),
}));

const notificationCtor = vi.fn();
const requestPermissionMock = vi.fn(async () => 'granted' as NotificationPermission);

class MockNotification {
  static permission: NotificationPermission = 'granted';
  static requestPermission = requestPermissionMock;

  constructor(title: string, options?: NotificationOptions) {
    notificationCtor(title, options);
  }
}

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    value: state,
  });
}

async function flushMicrotasks() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe('usePomodoroSession distraction surfacing', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('Notification', MockNotification as unknown as typeof Notification);

    setVisibility('visible');
    notificationCtor.mockClear();
    requestPermissionMock.mockClear();

    vi.mocked(createSession).mockResolvedValue({ _id: 'session-1' } as any);
    vi.mocked(postSamples).mockResolvedValue(undefined);
    vi.mocked(armDistractionOverlay).mockResolvedValue(true);
    vi.mocked(closeDistractionOverlay).mockImplementation(() => {});
    vi.mocked(isDistractionOverlayOpen).mockReturnValue(false);
    vi.mocked(supportsDistractionOverlay).mockReturnValue(true);
    vi.mocked(showDistractionOverlay).mockResolvedValue(true);
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    setVisibility('visible');
  });

  it('uses PiP distraction overlay when enabled and supported', async () => {
    const settings = { ...DEFAULT_SETTINGS, distractionThreshold: 0, distractionOverlayEnabled: true };
    const { result, unmount } = renderHook(() => usePomodoroSession(settings));

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.phase).toBe('working');
    await flushMicrotasks();

    act(() => {
      setVisibility('hidden');
      document.dispatchEvent(new Event('visibilitychange'));
      vi.advanceTimersByTime(10_000);
    });

    await flushMicrotasks();
    expect(showDistractionOverlay).toHaveBeenCalledWith({ tabSwitchCount: 1 });
    expect(notificationCtor).not.toHaveBeenCalled();

    unmount();
  });

  it('falls back to Notification when PiP overlay cannot open', async () => {
    vi.mocked(showDistractionOverlay).mockResolvedValue(false);

    const settings = { ...DEFAULT_SETTINGS, distractionThreshold: 0, distractionOverlayEnabled: true };
    const { result, unmount } = renderHook(() => usePomodoroSession(settings));

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.phase).toBe('working');
    await flushMicrotasks();

    act(() => {
      setVisibility('hidden');
      document.dispatchEvent(new Event('visibilitychange'));
      vi.advanceTimersByTime(10_000);
    });

    await flushMicrotasks();
    expect(showDistractionOverlay).toHaveBeenCalledTimes(1);
    expect(notificationCtor).toHaveBeenCalledWith(
      'Tempo: Focus check',
      expect.objectContaining({ tag: 'tempo-distraction' })
    );

    unmount();
  });

  it('uses Notification directly when overlay setting is disabled', async () => {
    const settings = { ...DEFAULT_SETTINGS, distractionThreshold: 0, distractionOverlayEnabled: false };
    const { result, unmount } = renderHook(() => usePomodoroSession(settings));

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.phase).toBe('working');
    await flushMicrotasks();

    act(() => {
      setVisibility('hidden');
      document.dispatchEvent(new Event('visibilitychange'));
      vi.advanceTimersByTime(10_000);
    });

    await flushMicrotasks();
    expect(notificationCtor).toHaveBeenCalledWith(
      'Tempo: Focus check',
      expect.objectContaining({ tag: 'tempo-distraction' })
    );
    expect(showDistractionOverlay).not.toHaveBeenCalled();

    unmount();
  });

  it('keeps overlay armed when returning to visible tab during active session', async () => {
    const settings = { ...DEFAULT_SETTINGS, distractionThreshold: 0, distractionOverlayEnabled: true };
    const { result, unmount } = renderHook(() => usePomodoroSession(settings));

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.phase).toBe('working');
    vi.mocked(closeDistractionOverlay).mockClear();

    act(() => {
      setVisibility('visible');
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(closeDistractionOverlay).not.toHaveBeenCalled();

    unmount();
  });
});
