import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../App';
import { DEFAULT_SETTINGS, type Settings } from '../types';

vi.mock('../hooks/usePomodoroSession', () => ({
  usePomodoroSession: () => ({
    phase: 'idle',
    timeRemaining: DEFAULT_SETTINGS.workDuration,
    behaviorState: 'normal',
    distractionCount: 0,
    completedToday: 0,
    pendingBreakDuration: DEFAULT_SETTINGS.shortBreak,
    showNudge: false,
    start: vi.fn(),
    stop: vi.fn(),
    stopBreak: vi.fn(),
    confirmBreak: vi.fn(),
    dismissNudge: vi.fn(),
    dismissDistractionPrompt: vi.fn(),
  }),
}));

let settingsState: Settings;
let requestPermissionMock = vi.fn(async () => 'granted' as NotificationPermission);

function mockNotification(permission: NotificationPermission) {
  requestPermissionMock = vi.fn(async () => 'granted' as NotificationPermission);

  class MockNotification {
    static permission = permission;
    static requestPermission = requestPermissionMock;
  }

  vi.stubGlobal('Notification', MockNotification as unknown as typeof Notification);
}

beforeEach(() => {
  settingsState = { ...DEFAULT_SETTINGS, hasSeenWelcome: true };
  localStorage.clear();

  global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';

    if (url.endsWith('/api/settings') && method === 'GET') {
      return {
        ok: true,
        json: async () => settingsState,
      } as Response;
    }

    if (url.endsWith('/api/settings') && method === 'PUT') {
      const payload = JSON.parse(String(init?.body ?? '{}')) as Partial<Settings>;
      settingsState = { ...settingsState, ...payload };
      return {
        ok: true,
        json: async () => settingsState,
      } as Response;
    }

    throw new Error(`Unexpected fetch call: ${method} ${url}`);
  }) as unknown as typeof fetch;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('notification permission prompt on app load', () => {
  it('requests notification permission when setting is enabled and permission is default', async () => {
    settingsState = { ...DEFAULT_SETTINGS, hasSeenWelcome: true, promptNotificationPermissionOnLoad: true };
    mockNotification('default');

    render(<App />);

    await screen.findByRole('button', { name: /what is tempo\?/i });
    await waitFor(() => expect(requestPermissionMock).toHaveBeenCalledTimes(1));
  });

  it('does not request notification permission when setting is disabled', async () => {
    settingsState = { ...DEFAULT_SETTINGS, hasSeenWelcome: true, promptNotificationPermissionOnLoad: false };
    mockNotification('default');

    render(<App />);

    await screen.findByRole('button', { name: /what is tempo\?/i });
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(requestPermissionMock).not.toHaveBeenCalled();
  });
});
