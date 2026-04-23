import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { connectDB } from '../src/db.js';
import { sessionsRouter } from '../src/routes/sessions.js';
import { samplesRouter } from '../src/routes/samples.js';
import { settingsRouter } from '../src/routes/settings.js';

const app = express();

const MONGO_URI = process.env.MONGO_URI!;
const CLIENT_URL = process.env.CLIENT_URL ?? '*';

app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());

// Lazy connect — reuses existing connection across warm invocations
app.use(async (_req, _res, next) => {
  if (mongoose.connection.readyState === 0) {
    await connectDB(MONGO_URI);
  }
  next();
});

app.use('/api/sessions', sessionsRouter);
app.use('/api/samples', samplesRouter);
app.use('/api/settings', settingsRouter);
app.get('/api/health', (_req, res) => res.json({ ok: true }));

export default app;
