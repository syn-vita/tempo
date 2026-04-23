import { useReducer, useEffect, useRef, useCallback } from 'react';
import { pomodoroReducer, initialState } from '../lib/pomodoroReducer';
import { createSession, endSession, postSamples } from '../lib/api';
import type { Settings, BehaviorState } from '../types';

const DISTRACTION_EVENT_COOLDOWN_MS = 30_000;
const NOTIFICATION_COOLDOWN_MS = 60_000;

export function usePomodoroSession(settings: Settings) {
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
        maybeNotifyDistraction(tabSwitchCount);
      }
    }, 10_000);

    return () => clearInterval(interval);
  }, [state.phase, state.sessionId, settings, maybeNotifyDistraction]);

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

  const start = useCallback(async () => {
    try {
      const session = await createSession(settings.workDuration, state.completedToday + 1);
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
  }, [settings.workDuration, state.completedToday]);

  const stop = useCallback(async () => {
    if (!state.sessionId || !state.sessionStartTime) return;
    const actualDuration = Date.now() - state.sessionStartTime;
    dispatch({ type: 'STOP' });
    try {
      await endSession(state.sessionId, {
        state: 'abandoned',
        endTime: new Date().toISOString(),
        actualDuration,
        extensionReason: null,
        distractionEvents: state.distractionCount,
      });
    } catch (e) {
      console.error('Failed to end session', e);
    }
  }, [state.sessionId, state.sessionStartTime, state.distractionCount]);

  const confirmBreak = useCallback(async () => {
    if (!state.sessionId || !state.sessionStartTime) return;
    const actualDuration = Date.now() - state.sessionStartTime;
    dispatch({ type: 'CONFIRM_BREAK' });
    try {
      await endSession(state.sessionId, {
        state: 'completed',
        endTime: new Date().toISOString(),
        actualDuration,
        extensionReason: state.extensionReason,
        distractionEvents: state.distractionCount,
      });
    } catch (e) {
      console.error('Failed to end session', e);
    }
  }, [state.sessionId, state.sessionStartTime, state.extensionReason, state.distractionCount]);

  const dismissNudge = useCallback(() => {
    dispatch({ type: 'UPDATE_BEHAVIOR', payload: 'normal' });
  }, []);

  const dismissDistractionPrompt = useCallback(() => {
    dispatch({ type: 'DISMISS_DISTRACTION_PROMPT' });
  }, []);

  return {
    phase: state.phase,
    timeRemaining: state.timeRemaining,
    behaviorState: state.behaviorState,
    distractionCount: state.distractionCount,
    completedToday: state.completedToday,
    pendingBreakDuration: state.pendingBreakDuration,
    showNudge: state.phase === 'working' && state.distractionCount === 1,
    start,
    stop,
    confirmBreak,
    dismissNudge,
    dismissDistractionPrompt,
  };
}
