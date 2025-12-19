import { Env, AIEvaluationJob } from './types';
import { processPendingJobs } from './lib/job-processor';

export default {
  /**
   * Scheduled handler - runs every hour
   */
  async scheduled(
    event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    console.log('Cron triggered at:', new Date(event.scheduledTime).toISOString());

    try {
      // Fetch pending jobs (max 100 per run)
      const pendingJobs = await env.DB.prepare(`
        SELECT * FROM ai_evaluation_jobs
        WHERE status = 'pending'
          AND retry_count < max_retries
        ORDER BY requested_at ASC
        LIMIT 100
      `).all<AIEvaluationJob>();

      console.log(`Found ${pendingJobs.results.length} pending jobs`);

      if (pendingJobs.results.length === 0) {
        console.log('No pending jobs to process');
        return;
      }

      // Process jobs in parallel (with waitUntil to not block)
      const promises = pendingJobs.results.map(job =>
        processPendingJobs(env, job)
      );

      ctx.waitUntil(Promise.allSettled(promises));

      console.log('Batch processing initiated for all pending jobs');
    } catch (error) {
      console.error('Cron execution error:', error);
      // Don't throw - we want cron to continue running
    }
  },
};
