# Task 2.2: Job Status API

**Estimated Time**: 30 minutes
**Dependencies**: Task 2.1 (Job Creation API)
**Files to Modify**: `apps/worker/src/routes/ops/leads/ai-evaluation.ts`

---

## Objective

Create polling endpoint that returns the current status of an AI evaluation job, including results when completed.

---

## API Specification

### Endpoint

```
GET /api/ops/ai-evaluation-jobs/:jobId
```

### Request

**Headers**:
```
X-Site-Id: <site-id>
Authorization: Bearer <token>
```

### Response States

#### 1. Pending (202)

```typescript
{
  "success": true,
  "data": {
    "job_id": "job_abc123",
    "lead_id": "lead_xyz789",
    "status": "pending",
    "requested_at": "2025-12-17T10:00:00Z"
  }
}
```

#### 2. Processing (202)

```typescript
{
  "success": true,
  "data": {
    "job_id": "job_abc123",
    "lead_id": "lead_xyz789",
    "status": "processing",
    "started_at": "2025-12-17T10:00:05Z",
    "progress_message": "Analyzing documents with AI..."
  }
}
```

#### 3. Completed (200)

```typescript
{
  "success": true,
  "data": {
    "job_id": "job_abc123",
    "status": "completed",
    "completed_at": "2025-12-17T10:00:12Z",
    "duration_ms": 7000,
    "evaluation": {
      "id": "eval_abc123",
      "score": 82,
      "label": "A",
      "recommendation": "approve",
      "summary": "Strong candidate with verified income...",
      "risk_flags": ["employment_duration_short"],
      "fraud_signals": [],
      "evaluated_at": "2025-12-17T10:00:12Z",
      "model_version": "@cf/meta/llama-3.2-11b-vision-instruct"
    }
  }
}
```

#### 4. Failed (200)

```typescript
{
  "success": true,
  "data": {
    "job_id": "job_abc123",
    "status": "failed",
    "error_code": "ModelTimeout",
    "error_message": "AI model took too long to respond. Please try again.",
    "can_retry": true,
    "retry_count": 1,
    "max_retries": 3
  }
}
```

---

## Implementation

### Add to: `apps/worker/src/routes/ops/leads/ai-evaluation.ts`

```typescript
/**
 * Get AI evaluation job status
 * GET /api/ops/ai-evaluation-jobs/:jobId
 */
app.get('/ai-evaluation-jobs/:jobId', async (c) => {
  const jobId = c.req.param('jobId');
  const siteId = c.req.header('X-Site-Id');

  if (!siteId) {
    return c.json({ success: false, error: 'Missing X-Site-Id header' }, 400);
  }

  try {
    // Fetch job record
    const job = await c.env.DB.prepare(`
      SELECT * FROM ai_evaluation_jobs
      WHERE id = ?1 AND site_id = ?2
    `).bind(jobId, siteId).first<{
      id: string;
      lead_id: string;
      site_id: string;
      status: 'pending' | 'processing' | 'completed' | 'failed';
      requested_at: string;
      started_at: string | null;
      completed_at: string | null;
      evaluation_id: string | null;
      error_code: string | null;
      error_message: string | null;
      retry_count: number;
      max_retries: number;
      model_version: string;
    }>();

    if (!job) {
      return c.json({
        success: false,
        error: 'JobNotFound',
        message: 'Job not found or access denied'
      }, 404);
    }

    // Build response based on status
    switch (job.status) {
      case 'pending':
        return c.json({
          success: true,
          data: {
            job_id: job.id,
            lead_id: job.lead_id,
            status: 'pending',
            requested_at: job.requested_at
          }
        }, 202);

      case 'processing':
        const processingDuration = job.started_at
          ? Date.now() - new Date(job.started_at).getTime()
          : 0;

        return c.json({
          success: true,
          data: {
            job_id: job.id,
            lead_id: job.lead_id,
            status: 'processing',
            started_at: job.started_at,
            progress_message: 'Analyzing documents with AI...',
            duration_ms: processingDuration
          }
        }, 202);

      case 'completed':
        // Fetch evaluation results
        const evaluation = await c.env.DB.prepare(`
          SELECT * FROM lead_ai_evaluations
          WHERE id = ?1
        `).bind(job.evaluation_id).first<{
          id: string;
          score: number;
          label: string;
          recommendation: string;
          summary: string;
          risk_flags: string;
          fraud_signals: string;
          evaluated_at: string;
          model_version: string;
        }>();

        if (!evaluation) {
          return c.json({
            success: false,
            error: 'EvaluationNotFound',
            message: 'Job completed but evaluation results not found'
          }, 500);
        }

        const completionDuration = job.completed_at && job.started_at
          ? new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()
          : 0;

        return c.json({
          success: true,
          data: {
            job_id: job.id,
            status: 'completed',
            completed_at: job.completed_at,
            duration_ms: completionDuration,
            evaluation: {
              id: evaluation.id,
              score: evaluation.score,
              label: evaluation.label,
              recommendation: evaluation.recommendation,
              summary: evaluation.summary,
              risk_flags: JSON.parse(evaluation.risk_flags || '[]'),
              fraud_signals: JSON.parse(evaluation.fraud_signals || '[]'),
              evaluated_at: evaluation.evaluated_at,
              model_version: evaluation.model_version
            }
          }
        }, 200);

      case 'failed':
        return c.json({
          success: true,
          data: {
            job_id: job.id,
            status: 'failed',
            error_code: job.error_code,
            error_message: job.error_message,
            can_retry: job.retry_count < job.max_retries,
            retry_count: job.retry_count,
            max_retries: job.max_retries
          }
        }, 200);

      default:
        return c.json({
          success: false,
          error: 'InvalidJobStatus',
          message: 'Job has invalid status'
        }, 500);
    }
  } catch (error) {
    console.error('Failed to fetch job status:', error);
    return c.json({
      success: false,
      error: 'InternalError',
      message: 'Failed to fetch job status'
    }, 500);
  }
});
```

---

## Testing

### 1. Create a job first

```bash
JOB_ID=$(curl -X POST http://localhost:8787/api/ops/leads/lead_123/ai-evaluation \
  -H "X-Site-Id: site_abc" \
  -H "X-User-Id: user_xyz" \
  -H "Authorization: Bearer test-token" \
  | jq -r '.data.job_id')

echo "Job ID: $JOB_ID"
```

### 2. Poll job status

```bash
curl http://localhost:8787/api/ops/ai-evaluation-jobs/$JOB_ID \
  -H "X-Site-Id: site_abc" \
  -H "Authorization: Bearer test-token"
```

### 3. Expected progression

```
1st poll (immediately):  status: "pending"
2nd poll (after cron):   status: "processing"
3rd poll (after AI):     status: "completed" + evaluation results
```

---

## Frontend Polling Pattern

```typescript
// Frontend example - React hook
async function pollJobStatus(jobId: string) {
  const maxAttempts = 360; // 1 hour max (polling every 10s)
  let attempts = 0;

  while (attempts < maxAttempts) {
    const response = await fetch(`/api/ops/ai-evaluation-jobs/${jobId}`, {
      headers: {
        'X-Site-Id': siteId,
        'Authorization': `Bearer ${token}`
      }
    });

    const result = await response.json();

    if (result.data.status === 'completed') {
      return result.data.evaluation; // Success!
    }

    if (result.data.status === 'failed') {
      throw new Error(result.data.error_message);
    }

    // Still pending/processing - wait and retry
    await new Promise(resolve => setTimeout(resolve, 10000)); // 10s
    attempts++;
  }

  throw new Error('Job timed out after 1 hour');
}
```

---

## Next Step

➡️ **[Task 2.3: Cron Job Processor](./ai-task-2.3-cron-processor.md)**

Implement the actual AI evaluation logic in the cron worker.
