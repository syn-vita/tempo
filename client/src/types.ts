export interface Session {
  _id: string;
  userId: string;
  startTime: string;
  endTime: string | null;
  plannedDuration: number;
  actualDuration: number;
  state: 'active' | 'completed' | 'abandoned' | 'extended';
  extensionReason: 'flow' | null;
  distractionEvents: number;
  focusScore: number;
  sessionNumber: number;
  moodOverrideDuration: number | null;
}

export interface Settings {
  userId?: string;
  workDuration: number;
  shortBreak: number;
  longBreak: number;
  longBreakInterval: number;
  flowThreshold: number;
  distractionThreshold: number;
  hasSeenWelcome: boolean;
  theme: 'dark' | 'light';
}

export const DEFAULT_SETTINGS: Settings = {
  workDuration: 25 * 60 * 1000,
  shortBreak: 5 * 60 * 1000,
  longBreak: 15 * 60 * 1000,
  longBreakInterval: 4,
  flowThreshold: 0.5,
  distractionThreshold: 3,
  hasSeenWelcome: false,
  theme: 'dark',
};

export type PomodoroPhase = 'idle' | 'working' | 'break_pending' | 'break';
export type BehaviorState = 'normal' | 'flow' | 'distracted';
