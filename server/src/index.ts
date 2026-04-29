import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './db.js';
import { sessionsRouter } from './routes/sessions.js';
import { samplesRouter } from './routes/samples.js';
import { settingsRouter } from './routes/settings.js';
import { adaptationRouter } from './routes/adaptation.js';

const app = express();
const PORT = process.env.PORT ?? 3001;
const CLIENT_URL = process.env.CLIENT_URL ?? 'http://localhost:5173';
const MONGO_URI = process.env.MONGO_URI ?? 'mongodb://localhost:27017/tempo';

app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());

app.use('/api/sessions', sessionsRouter);
app.use('/api/samples', samplesRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/adaptation', adaptationRouter);

app.get('/health', (_req, res) => res.json({ ok: true }));

connectDB(MONGO_URI).then(() => {
  app.listen(PORT, () => console.log(`Tempo server on port ${PORT}`));
});

export { app };
