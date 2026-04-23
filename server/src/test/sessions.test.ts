import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { sessionsRouter } from '../routes/sessions.js';

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
      .send({ plannedDuration: 1_500_000, sessionNumber: 1 });

    expect(res.status).toBe(201);
    expect(res.body.userId).toBe(USER_ID);
    expect(res.body.state).toBe('active');
    expect(res.body.sessionNumber).toBe(1);
    expect(res.body._id).toBeDefined();
  });

  it('assigns incrementing session numbers for the same user/day', async () => {
    const first = await request(app)
      .post('/api/sessions')
      .set('X-User-Id', USER_ID)
      .send({ plannedDuration: 1_500_000, sessionNumber: 1 });

    const second = await request(app)
      .post('/api/sessions')
      .set('X-User-Id', USER_ID)
      .send({ plannedDuration: 1_500_000, sessionNumber: 1 });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.sessionNumber).toBe(1);
    expect(second.body.sessionNumber).toBe(2);
  });

  it('returns 400 when X-User-Id header missing', async () => {
    const res = await request(app)
      .post('/api/sessions')
      .send({ plannedDuration: 1_500_000, sessionNumber: 1 });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/sessions', () => {
  it('returns only today\'s sessions for the user', async () => {
    await request(app)
      .post('/api/sessions')
      .set('X-User-Id', USER_ID)
      .send({ plannedDuration: 1_500_000, sessionNumber: 1 });

    const res = await request(app)
      .get('/api/sessions')
      .set('X-User-Id', USER_ID);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].userId).toBe(USER_ID);
  });
});

describe('PATCH /api/sessions/:id', () => {
  it('updates session state and computes focus score', async () => {
    const createRes = await request(app)
      .post('/api/sessions')
      .set('X-User-Id', USER_ID)
      .send({ plannedDuration: 1_500_000, sessionNumber: 1 });

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
});
