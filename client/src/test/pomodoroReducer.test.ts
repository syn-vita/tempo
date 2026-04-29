import { describe, it, expect } from 'vitest';
import { pomodoroReducer, initialState } from '../lib/pomodoroReducer';
import type { PomodoroMachineState } from '../lib/pomodoroReducer';
import { DEFAULT_SETTINGS } from '../types';

const S = DEFAULT_SETTINGS;

describe('pomodoroReducer', () => {
  it('START transitions idle -> working', () => {
    const next = pomodoroReducer(initialState, { type: 'START' }, S);
    expect(next.phase).toBe('working');
    expect(next.timeRemaining).toBe(S.workDuration);
    expect(next.distractionCount).toBe(0);
    expect(next.flowExtended).toBe(false);
  });

  it('START is a no-op when already working', () => {
    const working = pomodoroReducer(initialState, { type: 'START' }, S);
    const again = pomodoroReducer(working, { type: 'START' }, S);
    expect(again).toEqual(working);
  });

  it('TICK decrements timeRemaining by 1000ms', () => {
    const working = pomodoroReducer(initialState, { type: 'START' }, S);
    const ticked = pomodoroReducer(working, { type: 'TICK' }, S);
    expect(ticked.timeRemaining).toBe(S.workDuration - 1000);
  });

  it('TICK does not go below 0', () => {
    const state: PomodoroMachineState = {
      ...initialState,
      phase: 'working',
      timeRemaining: 500,
    };
    const next = pomodoroReducer(state, { type: 'TICK' }, S);
    expect(next.timeRemaining).toBe(0);
  });

  it('TICK decrements while in distraction_prompt', () => {
    const state: PomodoroMachineState = {
      ...initialState,
      phase: 'distraction_prompt',
      timeRemaining: 20_000,
    };
    const next = pomodoroReducer(state, { type: 'TICK' }, S);
    expect(next.timeRemaining).toBe(19_000);
  });

  it('TIMER_END transitions working -> break_pending (normal case)', () => {
    const state: PomodoroMachineState = {
      ...initialState,
      phase: 'working',
      timeRemaining: 0,
      behaviorState: 'normal',
    };
    const next = pomodoroReducer(state, { type: 'TIMER_END' }, S);
    expect(next.phase).toBe('break_pending');
    expect(next.pendingBreakDuration).toBe(S.shortBreak);
  });

  it('TIMER_END extends session when flow and not yet extended', () => {
    const state: PomodoroMachineState = {
      ...initialState,
      phase: 'working',
      timeRemaining: 0,
      behaviorState: 'flow',
      flowExtended: false,
    };
    const next = pomodoroReducer(state, { type: 'TIMER_END' }, S);
    expect(next.phase).toBe('working');
    expect(next.timeRemaining).toBe(5 * 60 * 1000);
    expect(next.flowExtended).toBe(true);
  });

  it('TIMER_END goes to break_pending when flow but already extended', () => {
    const state: PomodoroMachineState = {
      ...initialState,
      phase: 'working',
      timeRemaining: 0,
      behaviorState: 'flow',
      flowExtended: true,
    };
    const next = pomodoroReducer(state, { type: 'TIMER_END' }, S);
    expect(next.phase).toBe('break_pending');
  });

  it('TIMER_END sets long break on 4th session', () => {
    const state: PomodoroMachineState = {
      ...initialState,
      phase: 'working',
      timeRemaining: 0,
      completedToday: 3,
      behaviorState: 'normal',
    };
    const next = pomodoroReducer(state, { type: 'TIMER_END' }, S);
    expect(next.pendingBreakDuration).toBe(S.longBreak);
  });

  it('DISTRACTION increments count; at 2 moves to distraction_prompt', () => {
    const state: PomodoroMachineState = {
      ...initialState,
      phase: 'working',
      distractionCount: 1,
    };
    const next = pomodoroReducer(state, { type: 'DISTRACTION' }, S);
    expect(next.phase).toBe('distraction_prompt');
    expect(next.distractionCount).toBe(2);
    expect(next.pendingBreakDuration).toBe(S.shortBreak);
  });

  it('DISTRACTION at 1 stays in working', () => {
    const state: PomodoroMachineState = {
      ...initialState,
      phase: 'working',
      distractionCount: 0,
    };
    const next = pomodoroReducer(state, { type: 'DISTRACTION' }, S);
    expect(next.phase).toBe('working');
    expect(next.distractionCount).toBe(1);
  });

  it('CONFIRM_BREAK transitions break_pending -> break', () => {
    const state: PomodoroMachineState = {
      ...initialState,
      phase: 'break_pending',
      pendingBreakDuration: S.shortBreak,
    };
    const next = pomodoroReducer(state, { type: 'CONFIRM_BREAK' }, S);
    expect(next.phase).toBe('break');
    expect(next.timeRemaining).toBe(S.shortBreak);
    expect(next.completedToday).toBe(1);
  });

  it('CONFIRM_BREAK transitions distraction_prompt -> break', () => {
    const state: PomodoroMachineState = {
      ...initialState,
      phase: 'distraction_prompt',
      pendingBreakDuration: S.shortBreak,
      completedToday: 2,
    };
    const next = pomodoroReducer(state, { type: 'CONFIRM_BREAK' }, S);
    expect(next.phase).toBe('break');
    expect(next.timeRemaining).toBe(S.shortBreak);
    expect(next.completedToday).toBe(3);
  });

  it('DISMISS_DISTRACTION_PROMPT transitions distraction_prompt -> working', () => {
    const state: PomodoroMachineState = {
      ...initialState,
      phase: 'distraction_prompt',
      behaviorState: 'distracted',
    };
    const next = pomodoroReducer(state, { type: 'DISMISS_DISTRACTION_PROMPT' }, S);
    expect(next.phase).toBe('working');
    expect(next.behaviorState).toBe('normal');
  });

  it('BREAK_END transitions break -> idle and resets timer', () => {
    const state: PomodoroMachineState = {
      ...initialState,
      phase: 'break',
      timeRemaining: 0,
    };
    const next = pomodoroReducer(state, { type: 'BREAK_END' }, S);
    expect(next.phase).toBe('idle');
    expect(next.timeRemaining).toBe(S.workDuration);
  });

  it('APPLY_BREAK_OVERRIDE retimes an active break', () => {
    const state: PomodoroMachineState = {
      ...initialState,
      phase: 'break',
      timeRemaining: S.shortBreak,
      pendingBreakDuration: S.shortBreak,
    };

    const next = pomodoroReducer(
      state,
      { type: 'APPLY_BREAK_OVERRIDE', payload: 15 * 60 * 1000 } as any,
      S
    );

    expect(next.pendingBreakDuration).toBe(15 * 60 * 1000);
    expect(next.timeRemaining).toBe(15 * 60 * 1000);
  });

  it('STOP transitions working -> idle', () => {
    const working = pomodoroReducer(initialState, { type: 'START' }, S);
    const stopped = pomodoroReducer(working, { type: 'STOP' }, S);
    expect(stopped.phase).toBe('idle');
  });

  it('STOP transitions distraction_prompt -> idle', () => {
    const state: PomodoroMachineState = {
      ...initialState,
      phase: 'distraction_prompt',
      sessionId: 'abc123',
      sessionStartTime: Date.now() - 5_000,
    };
    const next = pomodoroReducer(state, { type: 'STOP' }, S);
    expect(next.phase).toBe('idle');
    expect(next.sessionId).toBeNull();
    expect(next.sessionStartTime).toBeNull();
  });

  it('UPDATE_BEHAVIOR updates behaviorState', () => {
    const working = pomodoroReducer(initialState, { type: 'START' }, S);
    const next = pomodoroReducer(working, { type: 'UPDATE_BEHAVIOR', payload: 'flow' }, S);
    expect(next.behaviorState).toBe('flow');
  });
});
