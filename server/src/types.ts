export interface ISession {
  userId: string;
  startTime: Date;
  endTime: Date | null;
  plannedDuration: number;
  actualDuration: number;
  state: 'active' | 'completed' | 'abandoned' | 'extended';
  extensionReason: 'flow' | null;
  distractionEvents: number;
  focusScore: number;
  sessionNumber: number;
  moodOverrideDuration: number | null;
}

export interface IBehavioralSample {
  sessionId: string;
  userId: string;
  timestamp: Date;
  activityRate: number;
  tabFocused: boolean;
  tabSwitchCount: number;
}

export interface ISettings {
  userId: string;
  workDuration: number;
  shortBreak: number;
  longBreak: number;
  longBreakInterval: number;
  flowThreshold: number;
  distractionThreshold: number;
  hasSeenWelcome: boolean;
  distractionOverlayEnabled: boolean;
  promptNotificationPermissionOnLoad: boolean;
  theme: 'dark' | 'light' | 'system';
}

export const DEFAULT_SETTINGS: Omit<ISettings, 'userId'> = {
  workDuration: 25 * 60 * 1000,
  shortBreak: 5 * 60 * 1000,
  longBreak: 15 * 60 * 1000,
  longBreakInterval: 4,
  flowThreshold: 0.5,
  distractionThreshold: 3,
  hasSeenWelcome: false,
  distractionOverlayEnabled: true,
  promptNotificationPermissionOnLoad: true,
  theme: 'system',
};
