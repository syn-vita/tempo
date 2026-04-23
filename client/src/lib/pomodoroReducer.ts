import type { Settings, BehaviorState, PomodoroPhase } from '../types';

export interface PomodoroMachineState {
  phase: PomodoroPhase;
  timeRemaining: number;
  completedToday: number;
  distractionCount: number;
  flowExtended: boolean;
  behaviorState: BehaviorState;
  pendingBreakDuration: number;
  sessionId: string | null;
  sessionStartTime: number | null;
  extensionReason: 'flow' | null;
}

export type PomodoroAction =
  | { type: 'START' }
  | { type: 'TICK' }
  | { type: 'TIMER_END' }
  | { type: 'DISTRACTION' }
  | { type: 'CONFIRM_BREAK' }
  | { type: 'DISMISS_DISTRACTION_PROMPT' }
  | { type: 'BREAK_END' }
  | { type: 'STOP' }
  | { type: 'UPDATE_BEHAVIOR'; payload: BehaviorState }
  | { type: 'SESSION_CREATED'; payload: string };

export const initialState: PomodoroMachineState = {
  phase: 'idle',
  timeRemaining: 0,
  completedToday: 0,
  distractionCount: 0,
  flowExtended: false,
  behaviorState: 'normal',
  pendingBreakDuration: 0,
  sessionId: null,
  sessionStartTime: null,
  extensionReason: null,
};

function pendingBreakFor(completedToday: number, settings: Settings): number {
  return (completedToday + 1) % settings.longBreakInterval === 0
    ? settings.longBreak
    : settings.shortBreak;
}

export function pomodoroReducer(
  state: PomodoroMachineState,
  action: PomodoroAction,
  settings: Settings
): PomodoroMachineState {
  switch (action.type) {
    case 'START':
      if (state.phase !== 'idle') return state;
      return {
        ...state,
        phase: 'working',
        timeRemaining: settings.workDuration,
        distractionCount: 0,
        flowExtended: false,
        behaviorState: 'normal',
        extensionReason: null,
        sessionStartTime: Date.now(),
      };

    case 'TICK':
      if (state.phase !== 'working' && state.phase !== 'distraction_prompt' && state.phase !== 'break') return state;
      return { ...state, timeRemaining: Math.max(0, state.timeRemaining - 1000) };

    case 'TIMER_END': {
      if (state.phase !== 'working') return state;
      if (state.behaviorState === 'flow' && !state.flowExtended) {
        return {
          ...state,
          timeRemaining: 5 * 60 * 1000,
          flowExtended: true,
          extensionReason: 'flow',
        };
      }
      return {
        ...state,
        phase: 'break_pending',
        pendingBreakDuration: pendingBreakFor(state.completedToday, settings),
      };
    }

    case 'DISTRACTION': {
      if (state.phase !== 'working') return state;
      const newCount = state.distractionCount + 1;
      if (newCount >= 2) {
        return {
          ...state,
          distractionCount: newCount,
          phase: 'distraction_prompt',
          pendingBreakDuration: settings.shortBreak,
        };
      }
      return { ...state, distractionCount: newCount };
    }

    case 'CONFIRM_BREAK':
      if (state.phase !== 'break_pending' && state.phase !== 'distraction_prompt') return state;
      return {
        ...state,
        phase: 'break',
        timeRemaining: state.pendingBreakDuration,
        completedToday: state.completedToday + 1,
      };

    case 'DISMISS_DISTRACTION_PROMPT':
      if (state.phase !== 'distraction_prompt') return state;
      return {
        ...state,
        phase: 'working',
        behaviorState: 'normal',
      };

    case 'BREAK_END':
      if (state.phase !== 'break') return state;
      return {
        ...state,
        phase: 'idle',
        timeRemaining: settings.workDuration,
        sessionId: null,
        sessionStartTime: null,
      };

    case 'STOP':
      if (state.phase !== 'working' && state.phase !== 'distraction_prompt' && state.phase !== 'break_pending') return state;
      return {
        ...state,
        phase: 'idle',
        sessionId: null,
        sessionStartTime: null,
      };

    case 'UPDATE_BEHAVIOR':
      return { ...state, behaviorState: action.payload };

    case 'SESSION_CREATED':
      return { ...state, sessionId: action.payload };

    default:
      return state;
  }
}
