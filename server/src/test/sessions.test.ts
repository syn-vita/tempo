import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { sessionsRouter } from '../routes/sessions.js';
import { Session } from '../models/Session.js';
import { BehavioralSample } from '../models/BehavioralSample.js';
import { MoodAdaptation } from '../models/MoodAdaptation.js';

let mongod: MongoMemoryServer;
const app = express();
app.use(express.json());
app.use('/api/sessions', sessionsRouter);

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

const USER_ID = 'test-user-123';

describe('POST /api/sessions', () => {
  it('creates a session and returns 201', async () => {
    const res = await request(app)
      .post('/api/sessions')
      .set('X-User-Id', USER_ID)
      .send({ plannedDuration: 1_500_000 });

    expect(res.status).toBe(201);
    expect(res.body.userId).toBe(USER_ID);
    expect(res.body.state).toBe('active');
    expect(res.body.sessionNumber).toBe(1);
    expect(res.body._id).toBeDefined();
  });

  it('assigns incrementing session numbers for the same user/day and ignores client-provided numbering', async () => {
    const first = await request(app)
      .post('/api/sessions')
      .set('X-User-Id', USER_ID)
      .send({ plannedDuration: 1_500_000 });

    const second = await request(app)
      .post('/api/sessions')
      .set('X-User-Id', USER_ID)
      .send({ plannedDuration: 1_500_000, sessionNumber: 999 });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.sessionNumber).toBe(1);
    expect(second.body.sessionNumber).toBe(2);
  });

  it('assigns unique sequential session numbers under concurrent creates', async () => {
    const createCount = 8;
    const requests = Array.from({ length: createCount }, () =>
      request(app)
        .post('/api/sessions')
        .set('X-User-Id', USER_ID)
        .send({ plannedDuration: 1_500_000 })
    );

    const responses = await Promise.all(requests);
    responses.forEach((res) => expect(res.status).toBe(201));

    const numbers = responses
      .map((res) => res.body.sessionNumber as number)
      .sort((a, b) => a - b);

    expect(numbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('returns 400 when X-User-Id header missing', async () => {
    const res = await request(app)
      .post('/api/sessions')
      .send({ plannedDuration: 1_500_000 });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/sessions', () => {
  it('returns only today\'s sessions for the user', async () => {
    await request(app)
      .post('/api/sessions')
      .set('X-User-Id', USER_ID)
      .send({ plannedDuration: 1_500_000 });

    const res = await request(app)
      .get('/api/sessions')
      .set('X-User-Id', USER_ID);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].userId).toBe(USER_ID);
  });

  it('renumbers sessions sequentially in GET response even if stored numbers are duplicated', async () => {
    const firstStart = new Date();
    firstStart.setHours(9, 0, 0, 0);

    const secondStart = new Date(firstStart.getTime() + 60_000);

    await Session.create({
      userId: USER_ID,
      startTime: firstStart,
      endTime: null,
      plannedDuration: 1_500_000,
      actualDuration: 0,
      state: 'active',
      extensionReason: null,
      distractionEvents: 0,
      focusScore: 0,
      avgActivityRate: 0,
      sessionNumber: 1,
      mood: null,
      moodOverrideDuration: null,
    });

    await Session.create({
      userId: USER_ID,
      startTime: secondStart,
      endTime: null,
      plannedDuration: 1_500_000,
      actualDuration: 0,
      state: 'active',
      extensionReason: null,
      distractionEvents: 0,
      focusScore: 0,
      avgActivityRate: 0,
      sessionNumber: 1,
      mood: null,
      moodOverrideDuration: null,
    });

    const res = await request(app)
      .get('/api/sessions')
      .set('X-User-Id', USER_ID);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].sessionNumber).toBe(1);
    expect(res.body[1].sessionNumber).toBe(2);
  });
});

describe('PATCH /api/sessions/:id', () => {
  it('updates session state and computes focus score', async () => {
    const createRes = await request(app)
      .post('/api/sessions')
      .set('X-User-Id', USER_ID)
      .send({ plannedDuration: 1_500_000 });

    const sessionId = createRes.body._id;

    const res = await request(app)
      .patch(`/api/sessions/${sessionId}`)
      .set('X-User-Id', USER_ID)
      .send({
        state: 'completed',
        endTime: new Date().toISOString(),
        actualDuration: 1_500_000,
        extensionReason: null,
        distractionEvents: 0,
      });

    expect(res.status).toBe(200);
    expect(res.body.state).toBe('completed');
    expect(typeof res.body.focusScore).toBe('number');
    expect(typeof res.body.avgActivityRate).toBe('number');
  });

  it('computes and persists avgActivityRate from behavioral samples', async () => {
    const createRes = await request(app)
      .post('/api/sessions')
      .set('X-User-Id', USER_ID)
      .send({ plannedDuration: 1_500_000 });

    const sessionId = createRes.body._id;
    const now = new Date();

    await BehavioralSample.create([
      {
        sessionId,
        userId: USER_ID,
        timestamp: now,
        activityRate: 0.2,
        tabFocused: true,
        tabSwitchCount: 0,
      },
      {
        sessionId,
        userId: USER_ID,
        timestamp: new Date(now.getTime() + 10_000),
        activityRate: 0.6,
        tabFocused: true,
        tabSwitchCount: 0,
      },
      {
        sessionId,
        userId: USER_ID,
        timestamp: new Date(now.getTime() + 20_000),
        activityRate: 1.0,
        tabFocused: true,
        tabSwitchCount: 0,
      },
    ]);

    const res = await request(app)
      .patch(`/api/sessions/${sessionId}`)
      .set('X-User-Id', USER_ID)
      .send({
        state: 'completed',
        endTime: new Date().toISOString(),
        actualDuration: 1_500_000,
        extensionReason: null,
        distractionEvents: 0,
      });

    expect(res.status).toBe(200);
    expect(res.body.avgActivityRate).toBeCloseTo(0.6, 5);
  });

  it('returns 404 for unknown session id', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .patch(`/api/sessions/${fakeId}`)
      .set('X-User-Id', USER_ID)
      .send({
        state: 'completed',
        endTime: new Date().toISOString(),
        actualDuration: 1_500_000,
        extensionReason: null,
        distractionEvents: 0,
      });
    expect(res.status).toBe(404);
  });

  it('accepts break_taken state for distraction-ended sessions', async () => {
    const createRes = await request(app)
      .post('/api/sessions')
      .set('X-User-Id', USER_ID)
      .send({ plannedDuration: 1_500_000 });

    const sessionId = createRes.body._id;

    const res = await request(app)
      .patch(`/api/sessions/${sessionId}`)
      .set('X-User-Id', USER_ID)
      .send({
        state: 'break_taken',
        endTime: new Date().toISOString(),
        actualDuration: 600_000,
        extensionReason: null,
        distractionEvents: 2,
      });

    expect(res.status).toBe(200);
    expect(res.body.state).toBe('break_taken');
  });

  it('stores mood and computes an adaptive break override for an existing session', async () => {
    const createRes = await request(app)
      .post('/api/sessions')
      .set('X-User-Id', USER_ID)
      .send({ plannedDuration: 1_500_000 });

    const sessionId = createRes.body._id;

    const res = await request(app)
      .patch(`/api/sessions/${sessionId}`)
      .set('X-User-Id', USER_ID)
      .send({
        mood: 'stressed',
      });

    expect(res.status).toBe(200);
    expect(res.body.mood).toBe('stressed');
    expect(res.body.moodOverrideDuration).toBe(15 * 60 * 1000);

    const stored = await Session.findById(sessionId).lean();
    expect(stored?.mood).toBe('stressed');
    expect(stored?.moodOverrideDuration).toBe(15 * 60 * 1000);
  });

  it('updates mood adaptation counters when mood is stored on a session', async () => {
    const createRes = await request(app)
      .post('/api/sessions')
      .set('X-User-Id', USER_ID)
      .send({ plannedDuration: 1_500_000 });

    const sessionId = createRes.body._id;

    const res = await request(app)
      .patch(`/api/sessions/${sessionId}`)
      .set('X-User-Id', USER_ID)
      .send({ mood: 'tired' });

    expect(res.status).toBe(200);

    const adaptation = await MoodAdaptation.findOne({ userId: USER_ID }).lean();
    expect(adaptation?.lastMood).toBe('tired');
    expect(adaptation?.recentMoodCounts.tired).toBe(1);
    expect(adaptation?.rollingSummary.last7Days.tired).toBe(1);
    expect(adaptation?.recentMoodStreak).toEqual({
      mood: 'tired',
      count: 1,
    });
  });

  it('increments adaptation counters and streak for repeated mood updates', async () => {
    const createRes = await request(app)
      .post('/api/sessions')
      .set('X-User-Id', USER_ID)
      .send({ plannedDuration: 1_500_000 });

    const sessionId = createRes.body._id;

    const firstRes = await request(app)
      .patch(`/api/sessions/${sessionId}`)
      .set('X-User-Id', USER_ID)
      .send({ mood: 'good' });

    const secondRes = await request(app)
      .patch(`/api/sessions/${sessionId}`)
      .set('X-User-Id', USER_ID)
      .send({ mood: 'good' });

    expect(firstRes.status).toBe(200);
    expect(secondRes.status).toBe(200);

    const adaptation = await MoodAdaptation.findOne({ userId: USER_ID }).lean();
    expect(adaptation?.lastMood).toBe('good');
    expect(adaptation?.recentMoodCounts.good).toBe(2);
    expect(adaptation?.rollingSummary.last7Days.good).toBe(2);
    expect(adaptation?.recentMoodStreak).toEqual({
      mood: 'good',
      count: 2,
    });
  });

  it('rejects invalid mood input safely', async () => {
    const createRes = await request(app)
      .post('/api/sessions')
      .set('X-User-Id', USER_ID)
      .send({ plannedDuration: 1_500_000 });

    const sessionId = createRes.body._id;

    const res = await request(app)
      .patch(`/api/sessions/${sessionId}`)
      .set('X-User-Id', USER_ID)
      .send({ mood: 'constructor' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid mood' });

    const stored = await Session.findById(sessionId).lean();
    expect(stored?.mood).toBeNull();
    expect(stored?.moodOverrideDuration).toBeNull();
    expect(await MoodAdaptation.findOne({ userId: USER_ID }).lean()).toBeNull();
  });
});
