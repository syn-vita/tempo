import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { settingsRouter } from '../routes/settings.js';
import { Settings } from '../models/Settings.js';

let mongod: MongoMemoryServer;
const app = express();
app.use(express.json());
app.use('/api/settings', settingsRouter);

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

describe('GET /api/settings', () => {
  it('returns hasSeenWelcome false for a new user', async () => {
    const res = await request(app).get('/api/settings').set('X-User-Id', USER_ID);
    expect(res.status).toBe(200);
    expect(res.body.hasSeenWelcome).toBe(false);
  });

  it('returns hasSeenWelcome for legacy settings documents', async () => {
    await Settings.collection.insertOne({
      userId: USER_ID,
      workDuration: 25 * 60 * 1000,
      shortBreak: 5 * 60 * 1000,
      longBreak: 15 * 60 * 1000,
      longBreakInterval: 4,
      flowThreshold: 0.5,
      distractionThreshold: 3,
    });

    const res = await request(app).get('/api/settings').set('X-User-Id', USER_ID);
    expect(res.status).toBe(200);
    expect(res.body.hasSeenWelcome).toBe(false);
  });
});

describe('PUT /api/settings', () => {
  it('persists hasSeenWelcome', async () => {
    await request(app)
      .put('/api/settings')
      .set('X-User-Id', USER_ID)
      .send({ hasSeenWelcome: true });

    const getRes = await request(app).get('/api/settings').set('X-User-Id', USER_ID);
    expect(getRes.body.hasSeenWelcome).toBe(true);
  });
});
