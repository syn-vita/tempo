export type SessionMood = 'stressed' | 'tired' | 'neutral' | 'good' | 'energized';

export interface Session {
  _id: string;
  userId: string;
  startTime: string;
  endTime: string | null;
  plannedDuration: number;
  actualDuration: number;
  state: 'active' | 'completed' | 'abandoned' | 'extended' | 'break_taken';
  extensionReason: 'flow' | null;
  distractionEvents: number;
  focusScore: number;
  avgActivityRate?: number;
  sessionNumber: number;
  mood: SessionMood | null;
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
  distractionOverlayEnabled: boolean;
  promptNotificationPermissionOnLoad: boolean;
  timerEndSoundEnabled: boolean;
  timerEndSoundVolume: number;
  theme: 'dark' | 'light' | 'system';
}

export const DEFAULT_SETTINGS: Settings = {
  workDuration: 25 * 60 * 1000,
  shortBreak: 5 * 60 * 1000,
  longBreak: 15 * 60 * 1000,
  longBreakInterval: 4,
  flowThreshold: 0.5,
  distractionThreshold: 3,
  hasSeenWelcome: false,
  distractionOverlayEnabled: true,
  promptNotificationPermissionOnLoad: true,
  timerEndSoundEnabled: true,
  timerEndSoundVolume: 0.6,
  theme: 'system',
};

export type PomodoroPhase = 'idle' | 'working' | 'distraction_prompt' | 'break_pending' | 'break';
export type BehaviorState = 'normal' | 'flow' | 'distracted';
