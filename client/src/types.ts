export type SessionMood = 'stressed' | 'tired' | 'neutral' | 'good' | 'energized';

export type AdaptationActionType =
  | 'apply_longer_breaks_today'
  | 'apply_shorter_work_sessions_today'
  | 'apply_shorter_breaks_today'
  | 'clear_today_override';

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

export interface AdaptationRecommendation {
  id: string;
  title: string;
  reason: string;
  actionLabel: string;
  actionType: AdaptationActionType;
}

export interface TemporaryOverride {
  workDurationOverride?: number;
  shortBreakOverride?: number;
  longBreakOverride?: number;
  reason: string;
  expiresAt: string;
}

export interface AdaptationSummary {
  lastMood: SessionMood | null;
  recentMoodCounts: Record<SessionMood, number>;
  recentMoodStreak: {
    mood: SessionMood | null;
    count: number;
  };
  rollingSummary: {
    last7Days: Record<SessionMood, number>;
  };
  activeTemporaryOverride: TemporaryOverride | null;
  recommendations: AdaptationRecommendation[];
  tunedGuidanceContext: {
    recentStressBias: boolean;
    recentFatigueBias: boolean;
  };
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
