import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Home } from '../pages/Home';
import { DEFAULT_SETTINGS } from '../types';

function createBreakSession() {
  return {
    phase: 'break' as const,
    timeRemaining: DEFAULT_SETTINGS.shortBreak,
    behaviorState: 'normal' as const,
    distractionCount: 0,
    completedToday: 1,
    pendingBreakDuration: DEFAULT_SETTINGS.shortBreak,
    showNudge: false,
    overlayArmed: true,
    start: vi.fn(),
    stop: vi.fn(),
    stopBreak: vi.fn(),
    confirmBreak: vi.fn(),
    dismissNudge: vi.fn(),
    dismissDistractionPrompt: vi.fn(),
    selectMood: vi.fn(),
  };
}

describe('Home mood selection', () => {
  it('forwards break-time mood selection to the session controller', async () => {
    const session = createBreakSession();

    render(<Home session={session as any} settings={DEFAULT_SETTINGS} settingsLoading={false} />);

    await userEvent.click(screen.getByRole('button', { name: /stressed/i }));

    expect(session.selectMood).toHaveBeenCalledWith('stressed');
  });
});
