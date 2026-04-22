import { Router, Request, Response } from 'express';
import { Settings } from '../models/Settings.js';
import { DEFAULT_SETTINGS } from '../types.js';

export const settingsRouter = Router();

// GET /api/settings — return settings or defaults
settingsRouter.get('/', async (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) return res.status(400).json({ error: 'Missing X-User-Id header' });

  const settings = await Settings.findOne({ userId });
  if (!settings) {
    return res.json({ userId, ...DEFAULT_SETTINGS });
  }
  return res.json(settings);
});

// PUT /api/settings — upsert settings
settingsRouter.put('/', async (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) return res.status(400).json({ error: 'Missing X-User-Id header' });

  const updates = req.body;
  const settings = await Settings.findOneAndUpdate(
    { userId },
    { userId, ...updates },
    { new: true, upsert: true, runValidators: true }
  );

  return res.json(settings);
});
