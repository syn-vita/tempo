import { Router } from 'express';
import { MoodAdaptation } from '../models/MoodAdaptation.js';
import { moodCountDefaults } from '../models/MoodAdaptation.js';
import type { MoodAdaptationDocument } from '../models/MoodAdaptation.js';

export const adaptationRouter = Router();

const VALID_ACTION_TYPES = new Set([
  'clear_today_override',
  'apply_longer_breaks_today',
  'apply_shorter_work_sessions_today',
  'apply_shorter_breaks_today',
]);

const adaptationLocks = new Map<string, Promise<unknown>>();

function endOfToday(): Date {
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  return now;
}

function defaultAdaptation(userId: string) {
  return {
    userId,
    lastMood: null,
    recentMoodCounts: { ...moodCountDefaults },
    recentMoodStreak: { mood: null, count: 0 },
    rollingSummary: { last7Days: { ...moodCountDefaults } },
    activeTemporaryOverride: null,
  };
}

async function withAdaptationLock<T>(userId: string, work: () => Promise<T>): Promise<T> {
  const previous = adaptationLocks.get(userId) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  const queued = previous.finally(() => current);

  adaptationLocks.set(userId, queued);

  await previous;
  try {
    return await work();
  } finally {
    release();
    if (adaptationLocks.get(userId) === queued) {
      adaptationLocks.delete(userId);
    }
  }
}

async function getOrCreateAdaptation(userId: string) {
  return withAdaptationLock(userId, async () => {
    const adaptation =
      await MoodAdaptation.findOneAndUpdate(
        { userId },
        { $setOnInsert: defaultAdaptation(userId) },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
        }
      );

    if (
      adaptation.activeTemporaryOverride?.expiresAt &&
      adaptation.activeTemporaryOverride.expiresAt.getTime() < Date.now()
    ) {
      adaptation.activeTemporaryOverride = null;
      await adaptation.save();
    }

    return adaptation;
  });
}

function buildRecommendations(adaptation: MoodAdaptationDocument) {
  const counts = adaptation.recentMoodCounts;

  if (counts.stressed >= 2) {
    return [
      {
        id: 'stressed-longer-breaks',
        title: 'Take longer breaks today',
        reason: 'Recent sessions were frequently marked stressed.',
        actionLabel: 'Apply longer breaks today',
        actionType: 'apply_longer_breaks_today',
      },
    ];
  }

  if (counts.tired >= 2) {
    return [
      {
        id: 'tired-shorter-work',
        title: 'Shorten work sessions today',
        reason: 'Recent sessions were frequently marked tired.',
        actionLabel: 'Use shorter work sessions today',
        actionType: 'apply_shorter_work_sessions_today',
      },
    ];
  }

  if (counts.energized >= 2) {
    return [
      {
        id: 'energized-shorter-breaks',
        title: 'Keep momentum with shorter breaks',
        reason: 'Recent sessions were frequently marked energized.',
        actionLabel: 'Use shorter breaks today',
        actionType: 'apply_shorter_breaks_today',
      },
    ];
  }

  return [];
}

function buildSummary(adaptation: MoodAdaptationDocument) {
  return {
    lastMood: adaptation.lastMood,
    recentMoodCounts: adaptation.recentMoodCounts,
    recentMoodStreak: adaptation.recentMoodStreak,
    rollingSummary: adaptation.rollingSummary,
    activeTemporaryOverride: adaptation.activeTemporaryOverride,
    recommendations: buildRecommendations(adaptation),
    tunedGuidanceContext: {
      recentStressBias: adaptation.recentMoodCounts.stressed >= 2,
      recentFatigueBias: adaptation.recentMoodCounts.tired >= 2,
    },
  };
}

adaptationRouter.get('/', async (req, res) => {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) return res.status(400).json({ error: 'Missing X-User-Id header' });

  const adaptation = await getOrCreateAdaptation(userId);
  return res.json(buildSummary(adaptation));
});

adaptationRouter.post('/actions', async (req, res) => {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) return res.status(400).json({ error: 'Missing X-User-Id header' });

  const { actionType } = req.body as { actionType?: string };
  if (!actionType || !VALID_ACTION_TYPES.has(actionType)) {
    return res.status(400).json({ error: 'Invalid actionType' });
  }

  const adaptation = await getOrCreateAdaptation(userId);

  if (actionType === 'clear_today_override') {
    adaptation.activeTemporaryOverride = null;
  } else if (actionType === 'apply_longer_breaks_today') {
    adaptation.activeTemporaryOverride = {
      shortBreakOverride: 10 * 60 * 1000,
      longBreakOverride: 20 * 60 * 1000,
      reason: 'Applied because recent moods were stressed.',
      expiresAt: endOfToday(),
    };
  } else if (actionType === 'apply_shorter_work_sessions_today') {
    adaptation.activeTemporaryOverride = {
      workDurationOverride: 20 * 60 * 1000,
      reason: 'Applied because recent moods were tired.',
      expiresAt: endOfToday(),
    };
  } else if (actionType === 'apply_shorter_breaks_today') {
    adaptation.activeTemporaryOverride = {
      shortBreakOverride: 3 * 60 * 1000,
      longBreakOverride: 10 * 60 * 1000,
      reason: 'Applied because recent moods were energized.',
      expiresAt: endOfToday(),
    };
  }

  await adaptation.save();
  return res.json(buildSummary(adaptation));
});
