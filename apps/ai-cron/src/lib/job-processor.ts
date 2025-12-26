import { Env, AIEvaluationJob } from '../types';
import { evaluateWithAI } from './ai-evaluator';

/**
 * Process a single AI evaluation job
 */
export async function processPendingJobs(
  env: Env,
  job: AIEvaluationJob
): Promise<void> {
  const jobId = job.id;
  const leadId = job.lead_id;

  console.log(`[${jobId}] Starting processing for lead ${leadId}`);

  try {
    // Step 1: Mark job as processing
    await updateJobStatus(env, jobId, 'processing', {
      started_at: new Date().toISOString()
    });

    // Step 2: Fetch lead record
    const lead = await env.DB.prepare(`
      SELECT * FROM leads
      WHERE id = ?1
    `).bind(leadId).first() as {
      id: string;
      site_id: string;
      first_name: string;
      last_name: string;
      email: string;
      phone: string;
      move_in_date: string | null;
      monthly_rent: number | null;
    } | null;

    if (!lead) {
      throw new Error('Lead not found');
    }

    // Step 3: Fetch lead documents
    const documents = await env.DB.prepare(`
      SELECT * FROM lead_files
      WHERE lead_id = ?1
      ORDER BY uploaded_at DESC
    `).bind(leadId).all();

    if (!documents.results || documents.results.length === 0) {
      console.warn(`[${jobId}] No documents found, proceeding with document-less evaluation`);
    }

    console.log(`[${jobId}] Found ${documents.results?.length || 0} documents`);

    // Step 4: Load document contents from R2
    const documentContents = await Promise.all(
      (documents.results || []).map(async (doc: any) => {
        try {
          const r2Object = await env.R2_PRIVATE.get(doc.storage_key);
          if (!r2Object) {
            console.warn(`[${jobId}] Document not found in R2: ${doc.storage_key}`);
            return null;
          }

          const arrayBuffer = await r2Object.arrayBuffer();
          return {
            type: doc.document_type || 'unknown',
            mimeType: doc.mime_type || 'application/octet-stream',
            data: arrayBuffer
          };
        } catch (error) {
          console.error(`[${jobId}] Failed to load document ${doc.id}:`, error);
          return null;
        }
      })
    );

    const validDocuments = documentContents.filter(d => d !== null) as Array<{
      type: string;
      mimeType: string;
      data: ArrayBuffer;
    }>;

    console.log(`[${jobId}] Loaded ${validDocuments.length} valid documents from R2`);

    // Step 5: Check quota (defensive - should already be checked in API)
    const currentMonth = new Date().toISOString().slice(0, 7);
    const usage = await env.DB.prepare(`
      SELECT evaluation_count, quota_limit
      FROM ai_evaluation_usage
      WHERE site_id = ?1 AND month = ?2
    `).bind(job.site_id, currentMonth).first() as {
      evaluation_count: number;
      quota_limit: number;
    } | null;

    if (usage && usage.evaluation_count > usage.quota_limit) {
      throw new Error('Quota exceeded');
    }

    // Step 6: Call AI evaluation
    console.log(`[${jobId}] Calling AI evaluation...`);
    const evaluation = await evaluateWithAI(env, {
      lead,
      documents: validDocuments,
      modelVersion: job.model_version
    });

    console.log(`[${jobId}] AI evaluation completed - Score: ${evaluation.score}, Label: ${evaluation.label}`);

    // Step 7: Save evaluation to database
    const evaluationId = `eval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    await env.DB.prepare(`
      INSERT INTO lead_ai_evaluations (
        id, lead_id, site_id,
        score, label, recommendation,
        summary, risk_flags, fraud_signals,
        extracted_data, model_version,
        evaluated_at, created_at, updated_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?12, ?12)
    `).bind(
      evaluationId,
      leadId,
      job.site_id,
      evaluation.score,
      evaluation.label,
      evaluation.recommendation,
      evaluation.summary,
      JSON.stringify(evaluation.risk_flags),
      JSON.stringify(evaluation.fraud_signals),
      JSON.stringify(evaluation.extracted_data),
      job.model_version,
      now
    ).run();

    // Step 8: Update lead record
    await env.DB.prepare(`
      UPDATE leads
      SET ai_score = ?1,
          ai_label = ?2,
          status = 'ai_evaluated',
          updated_at = ?3
      WHERE id = ?4
    `).bind(
      evaluation.score,
      evaluation.label,
      now,
      leadId
    ).run();

    // Step 9: Mark job as completed
    await updateJobStatus(env, jobId, 'completed', {
      completed_at: now,
      evaluation_id: evaluationId
    });

    console.log(`[${jobId}] Job completed successfully`);

  } catch (error) {
    console.error(`[${jobId}] Job failed:`, error);

    // Determine error code
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    let errorCode = 'ProcessingError';

    if (errorMessage.includes('not found')) {
      errorCode = 'ResourceNotFound';
    } else if (errorMessage.includes('Quota exceeded')) {
      errorCode = 'QuotaExceeded';
    } else if (errorMessage.includes('timeout')) {
      errorCode = 'ModelTimeout';
    }

    // Mark job as failed
    await updateJobStatus(env, jobId, 'failed', {
      error_code: errorCode,
      error_message: errorMessage,
      retry_increment: true
    });

    // If retries left, mark as pending for next cron run
    if (job.retry_count < job.max_retries - 1) {
      console.log(`[${jobId}] Will retry (${job.retry_count + 1}/${job.max_retries})`);
      await updateJobStatus(env, jobId, 'pending', {});
    }
  }
}

/**
 * Helper: Update job status
 */
async function updateJobStatus(
  env: Env,
  jobId: string,
  status: 'pending' | 'processing' | 'completed' | 'failed',
  updates: {
    started_at?: string;
    completed_at?: string;
    evaluation_id?: string;
    error_code?: string;
    error_message?: string;
    retry_increment?: boolean;
  }
): Promise<void> {
  const fields: string[] = ['status = ?1', 'updated_at = ?2'];
  const bindings: any[] = [status, new Date().toISOString()];
  let paramIndex = 3;

  if (updates.started_at) {
    fields.push(`started_at = ?${paramIndex++}`);
    bindings.push(updates.started_at);
  }

  if (updates.completed_at) {
    fields.push(`completed_at = ?${paramIndex++}`);
    bindings.push(updates.completed_at);
  }

  if (updates.evaluation_id) {
    fields.push(`evaluation_id = ?${paramIndex++}`);
    bindings.push(updates.evaluation_id);
  }

  if (updates.error_code) {
    fields.push(`error_code = ?${paramIndex++}`);
    bindings.push(updates.error_code);
  }

  if (updates.error_message) {
    fields.push(`error_message = ?${paramIndex++}`);
    bindings.push(updates.error_message);
  }

  if (updates.retry_increment) {
    fields.push('retry_count = retry_count + 1');
  }

  bindings.push(jobId); // WHERE id = ?last

  await env.DB.prepare(`
    UPDATE ai_evaluation_jobs
    SET ${fields.join(', ')}
    WHERE id = ?${paramIndex}
  `).bind(...bindings).run();
}
