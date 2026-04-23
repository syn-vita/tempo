import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Home } from '../pages/Home';
import { DEFAULT_SETTINGS } from '../types';

function createSession(phase: 'working' | 'break') {
  return {
    phase,
    timeRemaining: phase === 'working' ? DEFAULT_SETTINGS.workDuration : DEFAULT_SETTINGS.shortBreak,
    behaviorState: 'normal' as const,
    distractionCount: 0,
    completedToday: 0,
    pendingBreakDuration: DEFAULT_SETTINGS.shortBreak,
    showNudge: false,
    overlayArmed: true,
    start: vi.fn(),
    stop: vi.fn(),
    stopBreak: vi.fn(),
    confirmBreak: vi.fn(),
    dismissNudge: vi.fn(),
    dismissDistractionPrompt: vi.fn(),
  };
}

describe('Home stop confirmation', () => {
  it('opens a stop-session modal before ending an active pomodoro', async () => {
    const session = createSession('working');

    render(<Home session={session} settings={DEFAULT_SETTINGS} settingsLoading={false} />);
    await userEvent.click(screen.getByRole('button', { name: /stop session/i }));

    expect(screen.getByRole('dialog', { name: /stop focus session\?/i })).not.toBeNull();
    expect(screen.getByText(/discard current progress/i)).not.toBeNull();
    expect(session.stop).not.toHaveBeenCalled();
  });

  it('does not stop an active pomodoro when modal is cancelled', async () => {
    const session = createSession('working');

    render(<Home session={session} settings={DEFAULT_SETTINGS} settingsLoading={false} />);
    await userEvent.click(screen.getByRole('button', { name: /stop session/i }));
    await userEvent.click(screen.getByRole('button', { name: /keep focusing/i }));

    expect(session.stop).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog', { name: /stop focus session\?/i })).toBeNull();
  });

  it('confirms and stops an active pomodoro when modal action is approved', async () => {
    const session = createSession('working');

    render(<Home session={session} settings={DEFAULT_SETTINGS} settingsLoading={false} />);
    await userEvent.click(screen.getByRole('button', { name: /stop session/i }));
    await userEvent.click(screen.getByRole('button', { name: /yes, stop session/i }));

    expect(session.stop).toHaveBeenCalledTimes(1);
  });

  it('opens break-stop modal and stops break on approval', async () => {
    const session = createSession('break');

    render(<Home session={session} settings={DEFAULT_SETTINGS} settingsLoading={false} />);
    await userEvent.click(screen.getByRole('button', { name: /stop break/i }));
    expect(screen.getByRole('dialog', { name: /stop break early\?/i })).not.toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /yes, end break/i }));

    expect(session.stopBreak).toHaveBeenCalledTimes(1);
  });
});
