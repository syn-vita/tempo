import { getUserId } from './userId';
import type {
  AdaptationActionType,
  AdaptationSummary,
  Session,
  SessionMood,
  Settings,
} from '../types';

const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

function headers(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'X-User-Id': getUserId(),
  };
}

export async function createSession(plannedDuration: number): Promise<Session> {
  const res = await fetch(`${BASE}/sessions`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ plannedDuration }),
  });
  if (!res.ok) throw new Error('Failed to create session');
  return res.json();
}

export async function endSession(
  id: string,
  payload: {
    state: 'completed' | 'abandoned' | 'break_taken';
    endTime: string;
    actualDuration: number;
    extensionReason: 'flow' | null;
    distractionEvents: number;
  }
): Promise<Session> {
  const res = await fetch(`${BASE}/sessions/${id}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to update session');
  return res.json();
}

export async function updateSessionMood(id: string, mood: SessionMood): Promise<Session> {
  const res = await fetch(`${BASE}/sessions/${id}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify({ mood }),
  });
  if (!res.ok) throw new Error('Failed to update session mood');
  return res.json();
}

export async function getTodaySessions(): Promise<Session[]> {
  const res = await fetch(`${BASE}/sessions`, { headers: headers() });
  if (!res.ok) throw new Error('Failed to fetch sessions');
  return res.json();
}

export async function postSamples(
  samples: Array<{
    sessionId: string;
    timestamp: string;
    activityRate: number;
    tabFocused: boolean;
    tabSwitchCount: number;
  }>
): Promise<void> {
  await fetch(`${BASE}/samples`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(samples),
  });
}

export async function getSettings(): Promise<Settings> {
  const res = await fetch(`${BASE}/settings`, { headers: headers() });
  if (!res.ok) throw new Error('Failed to fetch settings');
  return res.json();
}

export async function saveSettings(settings: Partial<Settings>): Promise<Settings> {
  const res = await fetch(`${BASE}/settings`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error('Failed to save settings');
  return res.json();
}

export async function getAdaptationSummary(): Promise<AdaptationSummary> {
  const res = await fetch(`${BASE}/adaptation`, { headers: headers() });
  if (!res.ok) throw new Error('Failed to fetch adaptation summary');
  return res.json();
}

export async function applyAdaptationAction(
  actionType: AdaptationActionType
): Promise<AdaptationSummary> {
  const res = await fetch(`${BASE}/adaptation/actions`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ actionType }),
  });
  if (!res.ok) throw new Error('Failed to apply adaptation action');
  return res.json();
}
