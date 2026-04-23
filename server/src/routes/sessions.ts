import { Router, Request, Response, NextFunction } from 'express';
import { Session } from '../models/Session.js';
import { SessionCounter } from '../models/SessionCounter.js';
import { BehavioralSample } from '../models/BehavioralSample.js';
import { computeFocusScore } from '../lib/focusScore.js';

export const sessionsRouter = Router();

function dayKeyFor(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// POST /api/sessions — create a new active session
sessionsRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(400).json({ error: 'Missing X-User-Id header' });

    const { plannedDuration } = req.body as {
      plannedDuration: number;
    };

    if (typeof plannedDuration !== 'number') {
      return res.status(400).json({ error: 'plannedDuration is a required number' });
    }

    const now = new Date();
    const counter = await SessionCounter.findOneAndUpdate(
      { userId, dayKey: dayKeyFor(now) },
      { $inc: { lastSessionNumber: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    if (!counter) {
      return res.status(500).json({ error: 'Failed to allocate session number' });
    }

    const sessionNumber = counter.lastSessionNumber;

    const session = await Session.create({
      userId,
      startTime: now,
      endTime: null,
      plannedDuration,
      actualDuration: 0,
      state: 'active',
      extensionReason: null,
      distractionEvents: 0,
      focusScore: 0,
      avgActivityRate: 0,
      sessionNumber,
      moodOverrideDuration: null,
    });

    return res.status(201).json(session);
  } catch (err) {
    next(err);
  }
});

// GET /api/sessions — get today's sessions for userId
sessionsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(400).json({ error: 'Missing X-User-Id header' });

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const sessions = await Session.find({
      userId,
      startTime: { $gte: startOfDay },
    }).sort({ startTime: 1 });

    const normalized = sessions.map((session, index) => ({
      ...session.toObject(),
      sessionNumber: index + 1,
    }));

    return res.json(normalized);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/sessions/:id — update session on end
sessionsRouter.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(400).json({ error: 'Missing X-User-Id header' });

    const { id } = req.params;
    const {
      state,
      endTime,
      actualDuration,
      extensionReason,
      distractionEvents,
    } = req.body as {
      state: 'completed' | 'abandoned' | 'extended' | 'break_taken';
      endTime: string;
      actualDuration: number;
      extensionReason: 'flow' | null;
      distractionEvents: number;
    };

    const parsedEndTime = new Date(endTime);
    if (isNaN(parsedEndTime.getTime())) {
      return res.status(400).json({ error: 'Invalid endTime' });
    }

    const existingSession = await Session.findOne({ _id: id, userId });
    if (!existingSession) return res.status(404).json({ error: 'Session not found' });

    const samples = await BehavioralSample.find({ sessionId: id, userId });
    const avgActivityRate = samples.length
      ? samples.reduce((sum, sample) => sum + sample.activityRate, 0) / samples.length
      : 0;

    const focusScore = computeFocusScore(
      samples,
      actualDuration,
      distractionEvents,
      extensionReason
    );

    const session = await Session.findOneAndUpdate(
      { _id: id, userId },
      {
        state,
        endTime: parsedEndTime,
        actualDuration,
        extensionReason,
        distractionEvents,
        focusScore,
        avgActivityRate,
      },
      { new: true }
    );

    return res.json(session);
  } catch (err) {
    next(err);
  }
});
