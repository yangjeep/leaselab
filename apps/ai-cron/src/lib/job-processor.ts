import { Env, AIEvaluationJob } from '../types';

/**
 * Process a single AI evaluation job
 * This will be fully implemented in Task 2.3
 */
export async function processPendingJobs(
  env: Env,
  job: AIEvaluationJob
): Promise<void> {
  console.log(`Processing job ${job.id} for lead ${job.lead_id}`);

  try {
    // Mark as processing
    await env.DB.prepare(`
      UPDATE ai_evaluation_jobs
      SET status = 'processing',
          started_at = ?1,
          updated_at = ?1
      WHERE id = ?2
    `).bind(new Date().toISOString(), job.id).run();

    // TODO: Implement in Task 2.3
    // 1. Check quota
    // 2. Load documents from R2
    // 3. Call Workers AI
    // 4. Parse results
    // 5. Save evaluation
    // 6. Update job status to 'completed'

    console.log(`Job ${job.id} processing started (stub)`);
  } catch (error) {
    console.error(`Job ${job.id} failed:`, error);

    // Mark as failed
    await env.DB.prepare(`
      UPDATE ai_evaluation_jobs
      SET status = 'failed',
          error_code = 'ProcessingError',
          error_message = ?1,
          retry_count = retry_count + 1,
          updated_at = ?2
      WHERE id = ?3
    `).bind(
      error instanceof Error ? error.message : 'Unknown error',
      new Date().toISOString(),
      job.id
    ).run();
  }
}
