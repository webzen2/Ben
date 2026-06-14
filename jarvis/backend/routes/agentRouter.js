import { Router } from 'express';
import multer from 'multer';

import { clientAgent } from '../agents/clientAgent.js';
import { filesAgent } from '../agents/filesAgent.js';
import { researchAgent } from '../agents/researchAgent.js';
import { socialAgent } from '../agents/socialAgent.js';
import { calendarAgent } from '../agents/calendarAgent.js';
import { browserAgent } from '../agents/browserAgent.js';
import { brainAgent } from '../agents/brainAgent.js';
import { taskAgent } from '../agents/taskAgent.js';
import { memoryAgent } from '../agents/memoryAgent.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// Central dispatch — voice/text command hits this first
router.post('/dispatch', async (req, res) => {
  const { command, context } = req.body;
  if (!command) return res.status(400).json({ error: 'command required' });

  try {
    const result = await brainAgent.dispatch(command, context);
    res.json(result);
  } catch (err) {
    console.error('[dispatch]', err);
    res.status(500).json({ error: err.message });
  }
});

// ── Client Agent ──────────────────────────────────────────────
router.get('/client/pipeline', async (_, res) => {
  res.json(await clientAgent.getPipeline());
});
router.post('/client/onboarding', async (req, res) => {
  res.json(await clientAgent.triggerOnboarding(req.body.contactId));
});
router.post('/client/followup', async (req, res) => {
  res.json(await clientAgent.sendFollowUp(req.body));
});
router.get('/client/contracts', async (_, res) => {
  res.json(await clientAgent.getContractStatus());
});

// ── Files & Notes Agent ───────────────────────────────────────
router.post('/files/upload', upload.single('file'), async (req, res) => {
  res.json(await filesAgent.uploadAndSummarize(req.file));
});
router.post('/files/note', async (req, res) => {
  res.json(await filesAgent.saveNote(req.body));
});
router.get('/files/notes', async (req, res) => {
  res.json(await filesAgent.getNotesByTopic(req.query.topic));
});

// ── Research Agent ────────────────────────────────────────────
router.post('/research/search', async (req, res) => {
  res.json(await researchAgent.search(req.body.query));
});
router.get('/research/competitor-intel', async (_, res) => {
  res.json(await researchAgent.getCompetitorIntel());
});

// ── Social Agent ──────────────────────────────────────────────
router.post('/social/schedule', async (req, res) => {
  res.json(await socialAgent.schedulePost(req.body));
});
router.get('/social/analytics', async (_, res) => {
  res.json(await socialAgent.getAnalytics());
});
router.get('/social/dms', async (_, res) => {
  res.json(await socialAgent.getDraftReplies());
});

// ── Calendar Agent ────────────────────────────────────────────
router.get('/calendar/today', async (_, res) => {
  res.json(await calendarAgent.getTodaySchedule());
});
router.post('/calendar/event', async (req, res) => {
  res.json(await calendarAgent.createEvent(req.body));
});

// ── Task / Ideas Agent ────────────────────────────────────────
router.get('/tasks', async (req, res) => {
  res.json(await taskAgent.getTasks(req.query.status || 'open'));
});
router.post('/tasks', async (req, res) => {
  res.json(await taskAgent.addTask(req.body));
});
router.patch('/tasks/:id/close', async (req, res) => {
  res.json(await taskAgent.closeTask(req.params.id));
});

// ── Memory Agent ──────────────────────────────────────────────
router.get('/memory', async (req, res) => {
  res.json(await memoryAgent.getMemories(req.query.category));
});
router.post('/memory', async (req, res) => {
  res.json(await memoryAgent.addMemory(req.body));
});
router.delete('/memory/:id', async (req, res) => {
  res.json(await memoryAgent.deleteMemory(req.params.id));
});

// ── Browser Agent ─────────────────────────────────────────────
router.post('/browser/open', async (req, res) => {
  res.json(await browserAgent.resolveUrl(req.body.command));
});

// ── Morning Briefing ──────────────────────────────────────────
router.get('/briefing', async (_, res) => {
  try {
    const [schedule, intel, pipeline] = await Promise.allSettled([
      calendarAgent.getTodaySchedule(),
      researchAgent.getCompetitorIntel(),
      clientAgent.getPipeline(),
    ]);

    const briefing = await brainAgent.composeBriefing({
      schedule: schedule.value,
      intel: intel.value,
      pipeline: pipeline.value,
    });

    res.json(briefing);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export { router as agentRouter };
