import { useReducer, useEffect, useRef, useCallback } from 'react';
import { pomodoroReducer, initialState } from '../lib/pomodoroReducer';
import { createSession, endSession, getTodaySessions, postSamples, updateSessionMood } from '../lib/api';
import {
  armDistractionOverlay,
  closeDistractionOverlay,
  isDistractionOverlayOpen,
  showDistractionOverlay,
  supportsDistractionOverlay,
} from '../lib/distractionOverlay';
import { playTimerEndSound, primeTimerEndSound } from '../lib/timerEndSound';
import type { Settings, BehaviorState, Session, SessionMood } from '../types';

const DISTRACTION_EVENT_COOLDOWN_MS = 30_000;
const NOTIFICATION_COOLDOWN_MS = 60_000;
const STALE_ACTIVE_GRACE_MS = 60_000;

interface UsePomodoroSessionOptions {
  onSessionFinalized?: (session: Session) => void;
}

export function usePomodoroSession(
  settings: Settings,
  options: UsePomodoroSessionOptions = {}
) {
  const { onSessionFinalized } = options;
  const [state, dispatch] = useReducer(
    (s: typeof initialState, a: Parameters<typeof pomodoroReducer>[1]) =>
      pomodoroReducer(s, a, settings),
    { ...initialState, timeRemaining: settings.workDuration }
  );

  // Behavior tracking refs (don't need re-renders)
  const activityCountRef = useRef(0);
  const tabSwitchTimestampsRef = useRef<number[]>([]);
  const sampleBufferRef = useRef<Array<{
    sessionId: string;
    timestamp: string;
    activityRate: number;
    tabFocused: boolean;
    tabSwitchCount: number;
  }>>([]);
  const tabFocusedRef = useRef(true);
  const lastDistractionEventAtRef = useRef(0);
  const lastNotificationAtRef = useRef(0);
  const stateRef = useRef(state);
  const previousPhaseRef = useRef(state.phase);
  const finalizedAtBreakPendingRef = useRef<Session | null>(null);
  const pendingBreakPendingFinalizationRef = useRef<Promise<Session | null> | null>(null);
  stateRef.current = state;

  const maybeNotifyDistraction = useCallback((tabSwitchCount: number) => {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') return;
    if (document.visibilityState === 'visible') return;

    const elapsed = Date.now() - lastNotificationAtRef.current;
    if (elapsed < NOTIFICATION_COOLDOWN_MS) return;

    const showNotification = () => {
      new Notification('Tempo: Focus check', {
        body: `You switched tabs ${tabSwitchCount} times recently. Want to take a short break?`,
        tag: 'tempo-distraction',
      });
      lastNotificationAtRef.current = Date.now();
    };

    if (Notification.permission === 'granted') {
      showNotification();
      return;
    }

    if (Notification.permission === 'default') {
      Notification.requestPermission()
        .then((permission) => {
          if (permission === 'granted') {
            showNotification();
          }
        })
        .catch(() => {});
    }
  }, []);

  const maybeSurfaceDistraction = useCallback((tabSwitchCount: number) => {
    if (document.visibilityState === 'visible') return;

    const shouldTryOverlay = settings.distractionOverlayEnabled && supportsDistractionOverlay();
    if (!shouldTryOverlay) {
      maybeNotifyDistraction(tabSwitchCount);
      return;
    }

    void showDistractionOverlay({ tabSwitchCount }).then((shown) => {
      if (!shown) {
        maybeNotifyDistraction(tabSwitchCount);
      }
    });
  }, [settings.distractionOverlayEnabled, maybeNotifyDistraction]);

  const playConfiguredTimerEndSound = useCallback(() => {
    if (!settings.timerEndSoundEnabled) return;
    playTimerEndSound({ volume: settings.timerEndSoundVolume });
  }, [settings.timerEndSoundEnabled, settings.timerEndSoundVolume]);

  const finalizeCurrentSession = useCallback(async (
    nextState: 'completed' | 'abandoned' | 'break_taken',
    options: { extensionReason: 'flow' | null; emitInsights?: boolean }
  ): Promise<Session | null> => {
    if (!state.sessionId || !state.sessionStartTime) return null;

    const actualDuration = Math.max(0, Date.now() - state.sessionStartTime);
    try {
      const finalizedSession = await endSession(state.sessionId, {
        state: nextState,
        endTime: new Date().toISOString(),
        actualDuration,
        extensionReason: options.extensionReason,
        distractionEvents: state.distractionCount,
      });
      if (options.emitInsights !== false) {
        onSessionFinalized?.(finalizedSession);
      }
      return finalizedSession;
    } catch (e) {
      console.error('Failed to end session', e);
      return null;
    }
  }, [state.sessionId, state.sessionStartTime, state.distractionCount, onSessionFinalized]);

  // Track keyboard and mouse activity
  useEffect(() => {
    if (state.phase !== 'working') return;

    function onInput() { activityCountRef.current++; }
    document.addEventListener('keydown', onInput);
    document.addEventListener('mousemove', onInput);
    return () => {
      document.removeEventListener('keydown', onInput);
      document.removeEventListener('mousemove', onInput);
    };
  }, [state.phase]);

  // Track tab visibility
  useEffect(() => {
    if (state.phase !== 'working') return;

    function onVisibility() {
      tabFocusedRef.current = document.visibilityState === 'visible';
      if (document.visibilityState === 'hidden') {
        tabSwitchTimestampsRef.current.push(Date.now());
      }
    }
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [state.phase]);

  // 10s sampling interval
  useEffect(() => {
    if (state.phase !== 'working' || !state.sessionId) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const activityRate = activityCountRef.current / 10;
      activityCountRef.current = 0;

      // Rolling 60s window for tab switches
      const cutoff = now - 60_000;
      tabSwitchTimestampsRef.current = tabSwitchTimestampsRef.current.filter(t => t > cutoff);
      const tabSwitchCount = tabSwitchTimestampsRef.current.length;
      const tabFocused = tabFocusedRef.current;

      sampleBufferRef.current.push({
        sessionId: stateRef.current.sessionId!,
        timestamp: new Date().toISOString(),
        activityRate,
        tabFocused,
        tabSwitchCount,
      });

      // Flush buffer to API
      if (sampleBufferRef.current.length > 0) {
        const toSend = [...sampleBufferRef.current];
        sampleBufferRef.current = [];
        postSamples(toSend).catch(() => {});
      }

      // Derive behavior state
      const { flowThreshold, distractionThreshold } = settings;
      const isFlow = activityRate > flowThreshold && tabSwitchCount === 0;
      const isDistracted = tabSwitchCount > distractionThreshold;

      const newBehavior: BehaviorState = isFlow ? 'flow' : isDistracted ? 'distracted' : 'normal';
      dispatch({ type: 'UPDATE_BEHAVIOR', payload: newBehavior });

      const isDistractionEventDue =
        isDistracted && now - lastDistractionEventAtRef.current >= DISTRACTION_EVENT_COOLDOWN_MS;

      if (isDistractionEventDue) {
        lastDistractionEventAtRef.current = now;
        dispatch({ type: 'DISTRACTION' });
        maybeSurfaceDistraction(tabSwitchCount);
      }
    }, 10_000);

    return () => clearInterval(interval);
  }, [state.phase, state.sessionId, settings, maybeSurfaceDistraction]);

  // 1s countdown timer
  useEffect(() => {
    if (state.phase !== 'working' && state.phase !== 'distraction_prompt' && state.phase !== 'break') return;

    const interval = setInterval(() => {
      dispatch({ type: 'TICK' });
    }, 1000);

    return () => clearInterval(interval);
  }, [state.phase]);

  // Fire TIMER_END when timeRemaining hits 0
  useEffect(() => {
    if (state.timeRemaining === 0 && state.phase === 'working') {
      dispatch({ type: 'TIMER_END' });
    }
    if (state.timeRemaining === 0 && state.phase === 'break') {
      dispatch({ type: 'BREAK_END' });
    }
  }, [state.timeRemaining, state.phase]);

  useEffect(() => {
    const previousPhase = previousPhaseRef.current;
    if (previousPhase === 'working' && state.phase === 'break_pending') {
      playConfiguredTimerEndSound();
      const pendingFinalization = finalizeCurrentSession('completed', {
        extensionReason: state.extensionReason,
        emitInsights: false,
      }).then((finalizedSession) => {
        if (finalizedSession) {
          finalizedAtBreakPendingRef.current = finalizedSession;
        }
        pendingBreakPendingFinalizationRef.current = null;
        return finalizedSession;
      });
      pendingBreakPendingFinalizationRef.current = pendingFinalization;
      void pendingFinalization.then(() => {
        // no-op: tracked via refs above
      }).catch(() => {
        pendingBreakPendingFinalizationRef.current = null;
      });
    }
    previousPhaseRef.current = state.phase;
  }, [state.phase, state.extensionReason, playConfiguredTimerEndSound, finalizeCurrentSession]);

  useEffect(() => {
    let disposed = false;

    async function reconcileStaleActiveSessions() {
      try {
        const sessions = await getTodaySessions();
        if (disposed) return;

        const now = Date.now();
        const staleActiveSessions = sessions.filter((session) => {
          if (session.state !== 'active') return false;
          const startedAt = new Date(session.startTime).getTime();
          if (Number.isNaN(startedAt)) return false;
          return now - startedAt > session.plannedDuration + STALE_ACTIVE_GRACE_MS;
        });

        await Promise.all(staleActiveSessions.map(async (session) => {
          const startedAt = new Date(session.startTime).getTime();
          if (Number.isNaN(startedAt)) return;

          const cappedDuration = Math.max(0, Math.min(now - startedAt, session.plannedDuration));

          try {
            await endSession(session._id, {
              state: 'abandoned',
              endTime: new Date(now).toISOString(),
              actualDuration: cappedDuration,
              extensionReason: null,
              distractionEvents: session.distractionEvents,
            });
          } catch {
            // Ignore stale reconciliation failures; normal session flow still works.
          }
        }));
      } catch {
        // Ignore stale reconciliation failures; normal session flow still works.
      }
    }

    void reconcileStaleActiveSessions();
    return () => {
      disposed = true;
    };
  }, []);

  // Idle detection: no activity for 3 minutes
  const lastActivityRef = useRef(Date.now());
  useEffect(() => {
    if (state.phase !== 'working') return;
    function resetIdle() { lastActivityRef.current = Date.now(); }
    document.addEventListener('keydown', resetIdle);
    document.addEventListener('mousemove', resetIdle);

    const check = setInterval(() => {
      if (Date.now() - lastActivityRef.current > 3 * 60 * 1000) {
        dispatch({ type: 'UPDATE_BEHAVIOR', payload: 'normal' });
      }
    }, 30_000);

    return () => {
      document.removeEventListener('keydown', resetIdle);
      document.removeEventListener('mousemove', resetIdle);
      clearInterval(check);
    };
  }, [state.phase]);

  useEffect(() => {
    if (state.phase === 'working' || state.phase === 'distraction_prompt') return;
    closeDistractionOverlay();
  }, [state.phase]);

  const start = useCallback(async () => {
    try {
      finalizedAtBreakPendingRef.current = null;
      pendingBreakPendingFinalizationRef.current = null;

      // Prime audio context while this is still user-initiated.
      if (settings.timerEndSoundEnabled) {
        primeTimerEndSound();
      }

      if (settings.distractionOverlayEnabled && supportsDistractionOverlay()) {
        // Must run within a user gesture to satisfy Document PiP activation requirements.
        await armDistractionOverlay();
      }

      const session = await createSession(settings.workDuration);
      dispatch({ type: 'START' });
      dispatch({ type: 'SESSION_CREATED', payload: session._id });
      activityCountRef.current = 0;
      tabSwitchTimestampsRef.current = [];
      sampleBufferRef.current = [];
      tabFocusedRef.current = true;
      lastDistractionEventAtRef.current = 0;
      lastNotificationAtRef.current = 0;
    } catch (e) {
      console.error('Failed to create session', e);
    }
  }, [settings.workDuration, settings.distractionOverlayEnabled, settings.timerEndSoundEnabled]);

  const stop = useCallback(async () => {
    if (!state.sessionId || !state.sessionStartTime) return;
    dispatch({ type: 'STOP' });
    playConfiguredTimerEndSound();
    finalizedAtBreakPendingRef.current = null;
    pendingBreakPendingFinalizationRef.current = null;
    await finalizeCurrentSession('abandoned', {
      extensionReason: null,
      emitInsights: true,
    });
  }, [state.sessionId, state.sessionStartTime, playConfiguredTimerEndSound, finalizeCurrentSession]);

  const stopBreak = useCallback(() => {
    dispatch({ type: 'BREAK_END' });
  }, []);

  const confirmBreak = useCallback(async () => {
    if (!state.sessionId || !state.sessionStartTime) return;
    if (state.phase !== 'break_pending' && state.phase !== 'distraction_prompt') return;

    const endedFromDistractionPrompt = state.phase === 'distraction_prompt';
    dispatch({ type: 'CONFIRM_BREAK' });

    if (endedFromDistractionPrompt) {
      playConfiguredTimerEndSound();
      finalizedAtBreakPendingRef.current = null;
      pendingBreakPendingFinalizationRef.current = null;
      await finalizeCurrentSession('break_taken', {
        extensionReason: null,
        emitInsights: true,
      });
      return;
    }

    const finalizedAtBreakPending = pendingBreakPendingFinalizationRef.current
      ? await pendingBreakPendingFinalizationRef.current
      : finalizedAtBreakPendingRef.current;

    if (finalizedAtBreakPending) {
      onSessionFinalized?.(finalizedAtBreakPending);
      finalizedAtBreakPendingRef.current = null;
      pendingBreakPendingFinalizationRef.current = null;
      return;
    }

    await finalizeCurrentSession('completed', {
      extensionReason: state.extensionReason,
      emitInsights: true,
    });
  }, [state.sessionId, state.sessionStartTime, state.phase, state.extensionReason, onSessionFinalized, playConfiguredTimerEndSound, finalizeCurrentSession]);

  const dismissNudge = useCallback(() => {
    dispatch({ type: 'UPDATE_BEHAVIOR', payload: 'normal' });
  }, []);

  const dismissDistractionPrompt = useCallback(() => {
    dispatch({ type: 'DISMISS_DISTRACTION_PROMPT' });
  }, []);

  const selectMood = useCallback(async (mood: SessionMood) => {
    if (!state.sessionId || state.phase !== 'break') return;

    try {
      const updatedSession = await updateSessionMood(state.sessionId, mood);
      if (updatedSession.moodOverrideDuration !== null) {
        dispatch({ type: 'APPLY_BREAK_OVERRIDE', payload: updatedSession.moodOverrideDuration });
      }
    } catch (e) {
      console.error('Failed to update session mood', e);
    }
  }, [state.sessionId, state.phase]);

  return {
    phase: state.phase,
    timeRemaining: state.timeRemaining,
    behaviorState: state.behaviorState,
    distractionCount: state.distractionCount,
    completedToday: state.completedToday,
    pendingBreakDuration: state.pendingBreakDuration,
    showNudge: state.phase === 'working' && state.distractionCount === 1,
    overlayArmed: settings.distractionOverlayEnabled && supportsDistractionOverlay() && isDistractionOverlayOpen(),
    start,
    stop,
    stopBreak,
    confirmBreak,
    dismissNudge,
    dismissDistractionPrompt,
    selectMood,
  };
}
