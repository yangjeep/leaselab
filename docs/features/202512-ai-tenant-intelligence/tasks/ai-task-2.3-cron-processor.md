# Task 2.3: Cron Job Processor

**Estimated Time**: 2 hours
**Dependencies**: Task 1.2 (Cron Worker), Task 2.4 (AI Evaluation Logic)
**Files to Modify**: `apps/ai-cron/src/lib/job-processor.ts`

---

## Objective

Implement the complete job processing pipeline in the cron worker:
1. Load lead and documents from R2
2. Check quota (defensive)
3. Call AI evaluation logic
4. Update job status and save results

---

## Implementation

### File: `apps/ai-cron/src/lib/job-processor.ts`

```typescript
import { Env, AIEvaluationJob } from '../types';
import { evaluateWithAI } from './ai-evaluator';
import { nanoid } from 'nanoid';

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
    `).bind(leadId).first<{
      id: string;
      site_id: string;
      first_name: string;
      last_name: string;
      email: string;
      phone: string;
      move_in_date: string;
      monthly_rent: number;
    }>();

    if (!lead) {
      throw new Error('Lead not found');
    }

    // Step 3: Fetch lead documents
    const documents = await env.DB.prepare(`
      SELECT * FROM lead_documents
      WHERE lead_id = ?1 AND deleted_at IS NULL
      ORDER BY uploaded_at DESC
    `).bind(leadId).all<{
      id: string;
      document_type: string;
      storage_key: string;
      mime_type: string;
    }>();

    if (!documents.results || documents.results.length === 0) {
      throw new Error('No documents found for evaluation');
    }

    console.log(`[${jobId}] Found ${documents.results.length} documents`);

    // Step 4: Load document contents from R2
    const documentContents = await Promise.all(
      documents.results.map(async (doc) => {
        try {
          const r2Object = await env.R2_PRIVATE.get(doc.storage_key);
          if (!r2Object) {
            console.warn(`[${jobId}] Document not found in R2: ${doc.storage_key}`);
            return null;
          }

          const arrayBuffer = await r2Object.arrayBuffer();
          return {
            type: doc.document_type,
            mimeType: doc.mime_type,
            data: arrayBuffer
          };
        } catch (error) {
          console.error(`[${jobId}] Failed to load document ${doc.id}:`, error);
          return null;
        }
      })
    );

    const validDocuments = documentContents.filter(d => d !== null);

    if (validDocuments.length === 0) {
      throw new Error('Failed to load any documents from storage');
    }

    // Step 5: Check quota (defensive - should already be checked in API)
    const currentMonth = new Date().toISOString().slice(0, 7);
    const usage = await env.DB.prepare(`
      SELECT evaluation_count, quota_limit
      FROM ai_evaluation_usage
      WHERE site_id = ?1 AND month = ?2
    `).bind(job.site_id, currentMonth).first<{
      evaluation_count: number;
      quota_limit: number;
    }>();

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
    const evaluationId = `eval_${nanoid()}`;
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
```

---

## Error Handling Strategy

| Error Type | Error Code | Action |
|------------|-----------|--------|
| Lead not found | `ResourceNotFound` | Mark as failed, no retry |
| No documents | `ResourceNotFound` | Mark as failed, no retry |
| R2 load failure | `StorageError` | Retry (transient) |
| Quota exceeded | `QuotaExceeded` | Mark as failed, no retry |
| AI timeout | `ModelTimeout` | Retry |
| AI error | `ProcessingError` | Retry |

---

## Testing

### 1. Create test job manually

```sql
INSERT INTO ai_evaluation_jobs (
  id, lead_id, site_id, status,
  requested_by, requested_at,
  model_version, created_at, updated_at
) VALUES (
  'job_test123',
  'lead_existing',
  'site_abc',
  'pending',
  'user_test',
  datetime('now'),
  '@cf/meta/llama-3.2-11b-vision-instruct',
  datetime('now'),
  datetime('now')
);
```

### 2. Trigger cron manually

```bash
curl "http://localhost:8787/__scheduled?cron=0+*+*+*+*"
```

### 3. Check logs

```bash
cd apps/ai-cron
npm run tail
```

Expected output:
```
[job_test123] Starting processing for lead lead_existing
[job_test123] Found 3 documents
[job_test123] Calling AI evaluation...
[job_test123] AI evaluation completed - Score: 82, Label: A
[job_test123] Job completed successfully
```

---

## Next Step

➡️ **[Task 2.4: AI Evaluation Logic](./ai-task-2.4-ai-evaluation.md)**

Implement the Workers AI integration and scoring algorithm.
