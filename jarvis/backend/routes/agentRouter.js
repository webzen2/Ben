import { Router } from 'express';
import multer from 'multer';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { logActivity, getActivities, getErrors } from '../middleware/activityLogger.js';

import { clientAgent } from '../agents/clientAgent.js';
import { filesAgent } from '../agents/filesAgent.js';
import { researchAgent } from '../agents/researchAgent.js';
import { socialAgent } from '../agents/socialAgent.js';
import { calendarAgent } from '../agents/calendarAgent.js';
import { browserAgent } from '../agents/browserAgent.js';
import { brainAgent } from '../agents/brainAgent.js';
import { taskAgent } from '../agents/taskAgent.js';
import { memoryAgent } from '../agents/memoryAgent.js';
import { emailAgent } from '../agents/emailAgent.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// Central dispatch — voice/text command hits this first
router.post('/dispatch', asyncHandler(async (req, res) => {
  const { command, context } = req.body;
  if (!command) return res.status(400).json({ error: 'command required' });
  const result = await brainAgent.dispatch(command, context);
  res.json(result);
}));

// ── Client Agent ──────────────────────────────────────────────
router.get('/client/pipeline', asyncHandler(async (_, res) => {
  res.json(await clientAgent.getPipeline());
}));
router.post('/client/onboarding', asyncHandler(async (req, res) => {
  res.json(await clientAgent.triggerOnboarding(req.body.contactId));
}));
router.post('/client/followup', asyncHandler(async (req, res) => {
  res.json(await clientAgent.sendFollowUp(req.body));
}));
router.get('/client/contracts', asyncHandler(async (_, res) => {
  res.json(await clientAgent.getContractStatus());
}));

// ── Files & Notes Agent ───────────────────────────────────────
router.post('/files/upload', upload.single('file'), asyncHandler(async (req, res) => {
  res.json(await filesAgent.uploadAndSummarize(req.file));
}));
router.post('/files/note', asyncHandler(async (req, res) => {
  res.json(await filesAgent.saveNote(req.body));
}));
router.get('/files/notes', asyncHandler(async (req, res) => {
  res.json(await filesAgent.getNotesByTopic(req.query.topic));
}));

// ── Research Agent ────────────────────────────────────────────
router.post('/research/search', asyncHandler(async (req, res) => {
  res.json(await researchAgent.search(req.body.query));
}));
router.get('/research/competitor-intel', asyncHandler(async (_, res) => {
  res.json(await researchAgent.getCompetitorIntel());
}));

// ── Social Agent ──────────────────────────────────────────────
router.post('/social/schedule', asyncHandler(async (req, res) => {
  res.json(await socialAgent.schedulePost(req.body));
}));
router.get('/social/analytics', asyncHandler(async (_, res) => {
  res.json(await socialAgent.getAnalytics());
}));
router.get('/social/dms', asyncHandler(async (_, res) => {
  res.json(await socialAgent.getDraftReplies());
}));

// ── Calendar Agent ────────────────────────────────────────────
router.get('/calendar/today', asyncHandler(async (_, res) => {
  res.json(await calendarAgent.getTodaySchedule());
}));
router.post('/calendar/event', asyncHandler(async (req, res) => {
  res.json(await calendarAgent.createEvent(req.body));
}));

// ── Task / Ideas Agent ────────────────────────────────────────
router.get('/tasks', asyncHandler(async (req, res) => {
  res.json(await taskAgent.getTasks(req.query.status || 'open'));
}));
router.post('/tasks', asyncHandler(async (req, res) => {
  res.json(await taskAgent.addTask(req.body));
}));
router.patch('/tasks/:id/close', asyncHandler(async (req, res) => {
  res.json(await taskAgent.closeTask(req.params.id));
}));

// ── Email Agent ───────────────────────────────────────────────
router.get('/email/inbox', asyncHandler(async (req, res) => {
  res.json(await emailAgent.checkInbox({ query: req.query.q, maxResults: req.query.limit || 5 }));
}));
router.post('/email/search', asyncHandler(async (req, res) => {
  res.json(await emailAgent.searchEmails(req.body.query));
}));
router.post('/email/send', asyncHandler(async (req, res) => {
  res.json(await emailAgent.sendEmail(req.body));
}));

// ── Memory Agent ──────────────────────────────────────────────
router.get('/memory', asyncHandler(async (req, res) => {
  res.json(await memoryAgent.getMemories(req.query.category));
}));
router.post('/memory', asyncHandler(async (req, res) => {
  res.json(await memoryAgent.addMemory(req.body));
}));
router.delete('/memory/:id', asyncHandler(async (req, res) => {
  res.json(await memoryAgent.deleteMemory(req.params.id));
}));

// ── Browser Agent ─────────────────────────────────────────────
router.post('/browser/open', asyncHandler(async (req, res) => {
  res.json(await browserAgent.resolveUrl(req.body.command));
}));

// ── Morning Briefing ──────────────────────────────────────────
router.get('/briefing', asyncHandler(async (_, res) => {
  const [schedule, intel, pipeline, emails] = await Promise.allSettled([
    calendarAgent.getTodaySchedule(),
    researchAgent.getCompetitorIntel(),
    clientAgent.getPipeline(),
    emailAgent.checkInbox({ maxResults: 5 }).catch(() => ({ count: 0 })),
  ]);

  const briefing = await brainAgent.composeBriefing({
    schedule: schedule.value,
    intel: intel.value,
    pipeline: pipeline.value,
    emails: emails.value,
  });

  res.json(briefing);
}));

// ── System Status & Activity ─────────────────────────────────
router.get('/status', asyncHandler(async (_, res) => {
  const mem = process.memoryUsage();
  res.json({
    uptime: process.uptime(),
    memoryMB: Math.round(mem.rss / 1024 / 1024),
    agentCount: 6,
    timestamp: Date.now(),
    integrations: {
      gmail: !!process.env.GOOGLE_REFRESH_TOKEN,
      ghl: !!process.env.GHL_API_KEY,
      instagram: !!process.env.INSTAGRAM_ACCESS_TOKEN,
      facebook: !!process.env.FACEBOOK_ACCESS_TOKEN,
      brave: !!(process.env.BRAVE_API_KEY || process.env.SERPER_API_KEY),
    },
  });
}));

router.get('/activity', asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  res.json({ activities: getActivities(limit), errors: getErrors(limit) });
}));

const AGENT_RUN_MAP = {
  nova: async () => {
    const data = await clientAgent.getPipeline();
    return { message: `Pipeline loaded: ${data?.length || 0} contacts` };
  },
  echo: async () => {
    const data = await socialAgent.getAnalytics();
    return { message: 'Social analytics refreshed' };
  },
  radar: async () => {
    const data = await researchAgent.getCompetitorIntel();
    return { message: `Intel pulled: ${data?.length || 0} results` };
  },
  vault: async () => {
    const data = await memoryAgent.getMemories();
    return { message: `Memory loaded: ${data?.length || 0} entries` };
  },
  pulse: async () => {
    const data = await calendarAgent.getTodaySchedule();
    return { message: `Schedule loaded: ${data?.length || 0} events` };
  },
};

router.post('/agents/run', asyncHandler(async (req, res) => {
  const { agents = [] } = req.body;
  const results = {};

  await Promise.all(agents.map(async (id) => {
    const runner = AGENT_RUN_MAP[id];
    if (!runner) {
      results[id] = { message: 'Unknown agent', success: false };
      return;
    }
    try {
      const result = await runner();
      logActivity(id, 'run', true, result.message);
      results[id] = { ...result, success: true };
    } catch (err) {
      logActivity(id, 'run', false, err.message);
      results[id] = { message: err.message, success: false };
    }
  }));

  res.json({ results });
}));

export { router as agentRouter };
