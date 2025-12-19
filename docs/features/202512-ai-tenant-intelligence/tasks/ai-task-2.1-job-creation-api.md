# Task 2.1: Job Creation API

**Estimated Time**: 1 hour
**Dependencies**: Task 1.1 (Database Schema), Task 1.2 (Cron Worker)
**Files to Modify**: `apps/worker/src/routes/ops/leads.ts` (or create new file)

---

## Objective

Create API endpoint in the CRUD worker that:
1. Checks quota limits
2. Creates a job record in `ai_evaluation_jobs` table
3. Returns job ID immediately (doesn't wait for AI processing)

---

## API Specification

### Endpoint

```
POST /api/ops/leads/:leadId/ai-evaluation
```

### Request

**Headers**:
```
X-Site-Id: <site-id>
X-User-Id: <user-id>
Authorization: Bearer <token>
```

**Body** (optional):
```typescript
{
  force_refresh?: boolean;  // Default: false
  model_version?: string;   // Default: 'auto'
}
```

### Response Success (201)

```typescript
{
  success: true,
  data: {
    job_id: "job_abc123",
    lead_id: "lead_xyz789",
    status: "pending",
    requested_at: "2025-12-17T10:00:00Z",
    estimated_completion: "2025-12-17T11:00:00Z"  // Within 1 hour
  },
  usage: {
    remaining: 15,
    limit: 20,
    month: "2025-12"
  }
}
```

### Response Error (429 - Quota Exceeded)

```typescript
{
  success: false,
  error: "QuotaExceeded",
  message: "Monthly evaluation limit (20) reached for this site.",
  usage: {
    used: 20,
    limit: 20,
    month: "2025-12"
  }
}
```

---

## Implementation

### File: `apps/worker/src/routes/ops/leads/ai-evaluation.ts`

```typescript
import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import type { Env } from '../../../types';

const app = new Hono<{ Bindings: Env }>();

/**
 * Create AI evaluation job
 * POST /api/ops/leads/:leadId/ai-evaluation
 */
app.post('/:leadId/ai-evaluation', async (c) => {
  const leadId = c.req.param('leadId');
  const siteId = c.req.header('X-Site-Id');
  const userId = c.req.header('X-User-Id');

  if (!siteId || !userId) {
    return c.json({ success: false, error: 'Missing required headers' }, 400);
  }

  const body = await c.req.json().catch(() => ({}));
  const { force_refresh = false } = body;

  try {
    // Step 1: Verify lead exists and belongs to site
    const lead = await c.env.DB.prepare(`
      SELECT id, site_id, status
      FROM leads
      WHERE id = ?1 AND site_id = ?2
    `).bind(leadId, siteId).first();

    if (!lead) {
      return c.json({
        success: false,
        error: 'LeadNotFound',
        message: 'Lead not found or access denied'
      }, 404);
    }

    // Step 2: Check if already evaluated (unless force_refresh)
    if (!force_refresh) {
      const existingJob = await c.env.DB.prepare(`
        SELECT id, status, evaluation_id
        FROM ai_evaluation_jobs
        WHERE lead_id = ?1 AND status IN ('pending', 'processing', 'completed')
        ORDER BY requested_at DESC
        LIMIT 1
      `).bind(leadId).first();

      if (existingJob) {
        if (existingJob.status === 'pending' || existingJob.status === 'processing') {
          return c.json({
            success: false,
            error: 'JobAlreadyPending',
            message: 'An evaluation is already in progress for this lead',
            job_id: existingJob.id
          }, 409);
        }

        if (existingJob.status === 'completed') {
          return c.json({
            success: false,
            error: 'AlreadyEvaluated',
            message: 'Lead already evaluated. Use force_refresh=true to re-evaluate.',
            evaluation_id: existingJob.evaluation_id
          }, 409);
        }
      }
    }

    // Step 3: Check quota
    const currentMonth = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
    let usage = await c.env.DB.prepare(`
      SELECT * FROM ai_evaluation_usage
      WHERE site_id = ?1 AND month = ?2
    `).bind(siteId, currentMonth).first<{
      evaluation_count: number;
      quota_limit: number;
      tier: string;
    }>();

    // Create usage record if doesn't exist
    if (!usage) {
      const usageId = nanoid();
      await c.env.DB.prepare(`
        INSERT INTO ai_evaluation_usage
        (id, site_id, month, evaluation_count, quota_limit, tier, created_at, updated_at)
        VALUES (?1, ?2, ?3, 0, 20, 'free', ?4, ?4)
      `).bind(usageId, siteId, currentMonth, new Date().toISOString()).run();

      usage = {
        evaluation_count: 0,
        quota_limit: 20,
        tier: 'free'
      };
    }

    // Check if quota exceeded
    if (usage.evaluation_count >= usage.quota_limit) {
      return c.json({
        success: false,
        error: 'QuotaExceeded',
        message: `Monthly evaluation limit (${usage.quota_limit}) reached for this site.`,
        usage: {
          used: usage.evaluation_count,
          limit: usage.quota_limit,
          month: currentMonth,
          tier: usage.tier
        }
      }, 429);
    }

    // Step 4: Create job record
    const jobId = `job_${nanoid()}`;
    const now = new Date().toISOString();
    const estimatedCompletion = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // +1 hour

    await c.env.DB.prepare(`
      INSERT INTO ai_evaluation_jobs (
        id, lead_id, site_id, status,
        requested_by, requested_at,
        model_version, created_at, updated_at
      ) VALUES (?1, ?2, ?3, 'pending', ?4, ?5, ?6, ?5, ?5)
    `).bind(
      jobId,
      leadId,
      siteId,
      userId,
      now,
      '@cf/meta/llama-3.2-11b-vision-instruct'
    ).run();

    // Step 5: Increment usage counter
    await c.env.DB.prepare(`
      UPDATE ai_evaluation_usage
      SET evaluation_count = evaluation_count + 1,
          updated_at = ?1
      WHERE site_id = ?2 AND month = ?3
    `).bind(now, siteId, currentMonth).run();

    // Step 6: Return job ID immediately
    return c.json({
      success: true,
      data: {
        job_id: jobId,
        lead_id: leadId,
        status: 'pending',
        requested_at: now,
        estimated_completion: estimatedCompletion
      },
      usage: {
        remaining: usage.quota_limit - usage.evaluation_count - 1,
        limit: usage.quota_limit,
        month: currentMonth
      }
    }, 201);

  } catch (error) {
    console.error('AI evaluation job creation failed:', error);
    return c.json({
      success: false,
      error: 'InternalError',
      message: 'Failed to create evaluation job'
    }, 500);
  }
});

export default app;
```

---

## Integration with Main Worker

### File: `apps/worker/src/routes/ops/leads.ts`

Add the AI evaluation route:

```typescript
import aiEvaluation from './leads/ai-evaluation';

// ... existing routes ...

// Mount AI evaluation routes
app.route('/', aiEvaluation);
```

---

## Testing

### 1. Create a test request

```bash
curl -X POST http://localhost:8787/api/ops/leads/lead_123/ai-evaluation \
  -H "X-Site-Id: site_abc" \
  -H "X-User-Id: user_xyz" \
  -H "Authorization: Bearer test-token" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### 2. Expected response

```json
{
  "success": true,
  "data": {
    "job_id": "job_abc123",
    "lead_id": "lead_123",
    "status": "pending",
    "requested_at": "2025-12-17T10:00:00Z",
    "estimated_completion": "2025-12-17T11:00:00Z"
  },
  "usage": {
    "remaining": 19,
    "limit": 20,
    "month": "2025-12"
  }
}
```

### 3. Verify in database

```bash
npx wrangler d1 execute leaselab-db --local --command="SELECT * FROM ai_evaluation_jobs ORDER BY created_at DESC LIMIT 1"
```

---

## Error Cases to Test

1. **Missing lead**:
   ```bash
   # Should return 404
   curl -X POST .../leads/nonexistent/ai-evaluation
   ```

2. **Quota exceeded**:
   ```bash
   # Create 20 jobs, 21st should fail with 429
   ```

3. **Already pending**:
   ```bash
   # Create same job twice, second should fail with 409
   ```

---

## Next Step

➡️ **[Task 2.2: Job Status API](./ai-task-2.2-job-status-api.md)**

Build the polling endpoint to check job status and retrieve results.
