import { Router, Request, Response } from 'express';
import { BehavioralSample } from '../models/BehavioralSample.js';

export const samplesRouter = Router();

// POST /api/samples — batch insert behavioral samples
samplesRouter.post('/', async (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) return res.status(400).json({ error: 'Missing X-User-Id header' });

  const samples = req.body as Array<{
    sessionId: string;
    timestamp: string;
    activityRate: number;
    tabFocused: boolean;
    tabSwitchCount: number;
  }>;

  if (!Array.isArray(samples)) {
    return res.status(400).json({ error: 'Body must be an array' });
  }

  const docs = samples.map((s) => ({ ...s, userId, timestamp: new Date(s.timestamp) }));
  await BehavioralSample.insertMany(docs);

  return res.status(201).json({ inserted: docs.length });
});
