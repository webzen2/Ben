import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { agentRouter } from './routes/agentRouter.js';
import { authRouter } from './routes/auth.js';
import { startScheduledJobs } from './scheduler.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({ windowMs: 60_000, max: 60 });
app.use('/api', limiter);

app.use('/api/agents', agentRouter);
app.use('/auth', authRouter);

app.get('/health', (_, res) => res.json({ status: 'ok', ts: Date.now() }));

startScheduledJobs();

app.listen(PORT, () => console.log(`Jarvis backend running on :${PORT}`));
