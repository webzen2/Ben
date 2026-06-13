import cron from 'node-cron';
import { researchAgent } from './agents/researchAgent.js';

export function startScheduledJobs() {
  // Pull competitor intel every day at 6 AM
  cron.schedule('0 6 * * *', async () => {
    console.log('[scheduler] Pulling competitor intel...');
    try {
      await researchAgent.pullCompetitorIntel();
      console.log('[scheduler] Competitor intel updated.');
    } catch (e) {
      console.error('[scheduler] Intel pull failed:', e.message);
    }
  });

  console.log('[scheduler] Jobs registered (competitor intel: daily 6 AM)');
}
