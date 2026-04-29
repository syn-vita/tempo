import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { adaptationRouter } from '../routes/adaptation.js';
import { MoodAdaptation } from '../models/MoodAdaptation.js';

let mongod: MongoMemoryServer;
const app = express();
app.use(express.json());
app.use('/api/adaptation', adaptationRouter);

const USER_ID = 'test-user-123';

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await mongoose.connection.dropDatabase();
});

describe('GET /api/adaptation', () => {
  it('returns default summary when no adaptation record exists', async () => {
    const res = await request(app)
      .get('/api/adaptation')
      .set('X-User-Id', USER_ID);

    expect(res.status).toBe(200);
    expect(res.body.lastMood).toBeNull();
    expect(res.body.activeTemporaryOverride).toBeNull();
    expect(res.body.recommendations).toEqual([]);
  });

  it('creates at most one adaptation record under concurrent first access', async () => {
    const responses = await Promise.all(
      Array.from({ length: 8 }, () =>
        request(app)
          .get('/api/adaptation')
          .set('X-User-Id', USER_ID)
      )
    );

    responses.forEach((res) => {
      expect(res.status).toBe(200);
      expect(res.body.lastMood).toBeNull();
    });

    const docs = await MoodAdaptation.find({ userId: USER_ID }).lean();
    expect(docs).toHaveLength(1);
  });
});

describe('POST /api/adaptation/actions', () => {
  it('applies a temporary longer-break override until end of day', async () => {
    await MoodAdaptation.create({
      userId: USER_ID,
      lastMood: 'stressed',
      recentMoodCounts: {
        stressed: 3,
        tired: 0,
        neutral: 0,
        good: 0,
        energized: 0,
      },
      recentMoodStreak: { mood: 'stressed', count: 2 },
      rollingSummary: {
        last7Days: {
          stressed: 4,
          tired: 1,
          neutral: 1,
          good: 0,
          energized: 0,
        },
      },
      activeTemporaryOverride: null,
    });

    const res = await request(app)
      .post('/api/adaptation/actions')
      .set('X-User-Id', USER_ID)
      .send({ actionType: 'apply_longer_breaks_today' });

    expect(res.status).toBe(200);
    expect(res.body.activeTemporaryOverride.shortBreakOverride).toBe(10 * 60 * 1000);
    expect(res.body.activeTemporaryOverride.reason).toContain('stressed');
    expect(res.body.activeTemporaryOverride.expiresAt).toBeDefined();
  });

  it('rejects invalid actions without creating an adaptation record', async () => {
    const res = await request(app)
      .post('/api/adaptation/actions')
      .set('X-User-Id', USER_ID)
      .send({ actionType: 'not-a-real-action' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid actionType');

    const stored = await MoodAdaptation.findOne({ userId: USER_ID }).lean();
    expect(stored).toBeNull();
  });
});

describe('MoodAdaptation schema', () => {
  it('rejects malformed recent mood count maps', async () => {
    await expect(
      MoodAdaptation.create({
        userId: USER_ID,
        lastMood: null,
        recentMoodCounts: {
          stressed: 'often',
          tired: 0,
          neutral: 0,
          good: 0,
          energized: 0,
        },
        recentMoodStreak: { mood: null, count: 0 },
        rollingSummary: {
          last7Days: {
            stressed: 0,
            tired: 0,
            neutral: 0,
            good: 0,
            energized: 0,
          },
        },
        activeTemporaryOverride: null,
      })
    ).rejects.toThrow();
  });

  it('rejects malformed rolling summary mood count maps', async () => {
    await expect(
      MoodAdaptation.create({
        userId: USER_ID,
        lastMood: null,
        recentMoodCounts: {
          stressed: 0,
          tired: 0,
          neutral: 0,
          good: 0,
          energized: 0,
        },
        recentMoodStreak: { mood: null, count: 0 },
        rollingSummary: {
          last7Days: {
            stressed: 0,
            tired: 0,
            neutral: 'low',
            good: 0,
            energized: 0,
          },
        },
        activeTemporaryOverride: null,
      })
    ).rejects.toThrow();
  });
});
