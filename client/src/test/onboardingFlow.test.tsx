import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    overlayArmed: false,
    start: vi.fn(),
    stop: vi.fn(),
    stopBreak: vi.fn(),
    confirmBreak: vi.fn(),
    dismissNudge: vi.fn(),
    dismissDistractionPrompt: vi.fn(),
  }),
}));

let settingsState: Settings;
let putPayloads: Array<Partial<Settings>>;

beforeEach(() => {
  settingsState = { ...DEFAULT_SETTINGS, hasSeenWelcome: false };
  putPayloads = [];
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
      putPayloads.push(payload);
      settingsState = { ...settingsState, ...payload };
      return {
        ok: true,
        json: async () => settingsState,
      } as Response;
    }

    throw new Error(`Unexpected fetch call: ${method} ${url}`);
  }) as unknown as typeof fetch;
});

describe('onboarding flow', () => {
  it('shows welcome modal when hasSeenWelcome is false', async () => {
    render(<App />);

    expect(await screen.findByRole('button', { name: /show me around/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /skip for now/i })).toBeTruthy();
  });

  it('skip closes welcome and sends hasSeenWelcome=true', async () => {
    render(<App />);

    await userEvent.click(await screen.findByRole('button', { name: /skip for now/i }));

    await waitFor(() => {
      expect(putPayloads.some((payload) => payload.hasSeenWelcome === true)).toBe(true);
    });
    expect(screen.queryByRole('button', { name: /show me around/i })).toBeNull();
  });

  it('show me around opens guide and marks welcome as seen', async () => {
    render(<App />);

    await userEvent.click(await screen.findByRole('button', { name: /show me around/i }));

    expect(await screen.findByText(/what tempo does for your focus/i)).toBeTruthy();
    await waitFor(() => {
      expect(putPayloads.some((payload) => payload.hasSeenWelcome === true)).toBe(true);
    });
  });

  it('nav What is Tempo? opens guide even when hasSeenWelcome is true', async () => {
    settingsState = { ...DEFAULT_SETTINGS, hasSeenWelcome: true };
    render(<App />);

    expect(screen.queryByRole('button', { name: /show me around/i })).toBeNull();
    await userEvent.click(await screen.findByRole('button', { name: /what is tempo\\?/i }));
    expect(await screen.findByText(/what tempo does for your focus/i)).toBeTruthy();
  });
});
