# AI Tenant Intelligence - Cron Worker Architecture

## Overview

This document specifies the **scheduled worker architecture** for AI tenant evaluation using **Cloudflare Cron Triggers**. A separate worker runs on a schedule (every hour), processes pending evaluations, and updates the database.

---

## Why Cron Worker > Workflows > Queues

| Aspect | Cron Worker ✅ (FINAL) | Workflows | Queues |
|--------|----------------------|-----------|--------|
| **Simplicity** | Extremely simple | Simple | Complex |
| **Infrastructure** | Just cron trigger | Workflow binding | Queue + DLQ |
| **Cost** | **FREE** (unlimited cron triggers) | 10M steps/month | 1M operations/month |
| **Scalability** | Process batches every hour | Per-request | Per-request |
| **State Management** | DB table (simple) | Built-in | Manual table |
| **Limits** | None (just CPU time) | 10M steps/month | 1M operations/month |
| **Retries** | Built into cron job logic | Per-step | Manual + DLQ |
| **Future-Proof** | No service limits | Workflow limits | Queue limits |

**Winner**: **Cron Worker** - Simplest, cheapest, most future-proof.

---

## Architecture (Cron-Based)

```
┌─────────────────────────────────────────────────────────────────┐
│              AI Tenant Intelligence (Cron Worker)                │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐         ┌──────────────────────┐
│   Ops Dashboard  │────────▶│  leaselab-worker     │
│   (Remix App)    │         │  (CRUD Only)         │
│                  │         │                      │
│  1. Click "Run   │         │  1. Create job in DB │
│     AI Eval"     │         │  2. Set status:      │
│                  │         │     'pending'        │
│  2. Poll job     │◀────────│  3. Return job_id    │
│     status       │         │                      │
└──────────────────┘         └──────────┬───────────┘
         ▲                              │
         │                              │ Write to DB
         │                              ▼
         │                   ┌────────────────────────┐
         │                   │  D1 Database           │
         │                   │  ai_evaluation_jobs    │
         │                   │                        │
         │                   │  status: 'pending'     │
         │                   └────────┬───────────────┘
         │                            │
         │                            │ Cron reads pending jobs
         │                            ▼
         │              ┌─────────────────────────────┐
         │              │ leaselab-ai-cron (NEW)      │
         │              │ Scheduled Worker            │
         │              │                             │
         │              │ Runs: Every hour (0 * * * *)│
         │              │                             │
         │              │ Process:                    │
         │              │ 1. Fetch pending jobs       │
         │              │ 2. Check quota per site     │
         │              │ 3. For each job:            │
         │              │    - Load documents (R2)    │
         │              │    - Call Workers AI        │
         │              │    - Parse results          │
         │              │    - Save evaluation        │
         │              │    - Update job status      │
         │              │ 4. Batch process (up to 100)│
         │              └──────────┬──────────────────┘
         │                         │
         │                         │ Updates DB
         │                         ▼
         │              ┌────────────────────────┐
         │              │  D1 Database           │
         │              │                        │
         │              │  status: 'completed'   │
         └──────────────│  + evaluation results  │
            Frontend    └────────────────────────┘
            polls DB

┌────────────────────────────────────────────────────────────────┐
│  Cron worker binds to: D1, R2, Workers AI                      │
│  Runs automatically every hour, no manual triggers needed      │
└────────────────────────────────────────────────────────────────┘
```

---

## Database Schema (Simple Job Table)

```sql
CREATE TABLE ai_evaluation_jobs (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL,
  site_id TEXT NOT NULL,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'processing' | 'completed' | 'failed'

  -- Request metadata
  requested_by TEXT NOT NULL,
  requested_at TEXT NOT NULL,

  -- Processing metadata
  started_at TEXT,
  completed_at TEXT,

  -- Results
  evaluation_id TEXT,  -- Links to lead_ai_evaluations table
  error_code TEXT,
  error_message TEXT,

  -- Retry tracking
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,

  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  FOREIGN KEY (lead_id) REFERENCES leads(id),
  FOREIGN KEY (evaluation_id) REFERENCES lead_ai_evaluations(id)
);

-- Indexes
CREATE INDEX idx_ai_jobs_status ON ai_evaluation_jobs(status);
CREATE INDEX idx_ai_jobs_site_id ON ai_evaluation_jobs(site_id);
CREATE INDEX idx_ai_jobs_lead_id ON ai_evaluation_jobs(lead_id);
CREATE INDEX idx_ai_jobs_requested_at ON ai_evaluation_jobs(requested_at DESC);

-- Compound index for cron worker queries
CREATE INDEX idx_ai_jobs_pending ON ai_evaluation_jobs(status, requested_at)
  WHERE status = 'pending';
```

---

## CRUD Worker (Existing Worker)

### API: Create Evaluation Job

```typescript
// apps/worker/routes/ops.ts

app.post('/api/ops/leads/:leadId/ai-evaluation', async (c) => {
  const { leadId } = c.req.param();
  const siteId = c.req.header('X-Site-Id');
  const userId = c.req.header('X-User-Id');

  // 1. Check quota
  const quota = await checkQuota(c.env.DB, siteId);
  if (!quota.allowed) {
    return c.json({
      success: false,
      error: 'QuotaExceeded',
      message: `Monthly limit reached (${quota.used}/${quota.limit})`,
      usage: { remaining: 0, limit: quota.limit, month: getCurrentMonth() }
    }, 403);
  }

  // 2. Create job record (status: pending)
  const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  await c.env.DB.prepare(`
    INSERT INTO ai_evaluation_jobs (
      id, lead_id, site_id, status, requested_by, requested_at, created_at, updated_at
    ) VALUES (?, ?, ?, 'pending', ?, ?, ?, ?)
  `).bind(
    jobId,
    leadId,
    siteId,
    userId,
    new Date().toISOString(),
    new Date().toISOString(),
    new Date().toISOString()
  ).run();

  // 3. Increment usage counter
  await incrementUsageCounter(c.env.DB, siteId);

  // 4. Return immediately
  return c.json({
    success: true,
    data: {
      job_id: jobId,
      lead_id: leadId,
      status: 'pending',
      requested_at: new Date().toISOString(),
      message: 'Job queued. AI evaluation will run within 1 hour.'
    },
    usage: {
      remaining: quota.limit - quota.used - 1,
      limit: quota.limit,
      month: getCurrentMonth()
    }
  });
});
```

### API: Get Job Status

```typescript
app.get('/api/ops/ai-evaluation-jobs/:jobId', async (c) => {
  const { jobId } = c.req.param();

  const job = await c.env.DB.prepare(`
    SELECT * FROM ai_evaluation_jobs WHERE id = ?
  `).bind(jobId).first();

  if (!job) {
    return c.json({ success: false, error: 'NotFound' }, 404);
  }

  // If completed, fetch evaluation
  let evaluation = null;
  if (job.status === 'completed' && job.evaluation_id) {
    const evalResult = await c.env.DB.prepare(`
      SELECT * FROM lead_ai_evaluations WHERE id = ?
    `).bind(job.evaluation_id).first();

    if (evalResult) {
      evaluation = {
        id: evalResult.id,
        score: evalResult.score,
        label: evalResult.label,
        recommendation: evalResult.recommendation,
        summary: evalResult.summary,
        risk_flags: JSON.parse(evalResult.risk_flags || '[]'),
        fraud_signals: JSON.parse(evalResult.fraud_signals || '[]'),
        evaluated_at: evalResult.evaluated_at
      };
    }
  }

  return c.json({
    success: true,
    data: {
      job_id: job.id,
      lead_id: job.lead_id,
      status: job.status,
      requested_at: job.requested_at,
      started_at: job.started_at,
      completed_at: job.completed_at,
      error_code: job.error_code,
      error_message: job.error_message,
      evaluation
    }
  });
});
```

---

## Cron Worker (NEW Worker)

### Wrangler Configuration

```toml
# apps/ai-cron/wrangler.toml
name = "leaselab-ai-cron"
main = "worker.ts"
compatibility_date = "2024-11-01"
compatibility_flags = ["nodejs_compat"]

# Cron trigger: Run every hour at minute 0
[triggers]
crons = ["0 * * * *"]  # Every hour

# Bindings
[[d1_databases]]
binding = "DB"
database_name = "leaselab-db"
database_id = "850dc940-1021-4c48-8d40-0f18992424ac"

[[r2_buckets]]
binding = "R2_PRIVATE"
bucket_name = "leaselab-pri"

[ai]
binding = "AI"

[env.production]
# Production config

[env.preview]
# Preview environment (runs every 5 minutes for testing)
[env.preview.triggers]
crons = ["*/5 * * * *"]
```

### Worker Implementation

```typescript
// apps/ai-cron/worker.ts

interface Env {
  DB: D1Database;
  R2_PRIVATE: R2Bucket;
  AI: Ai;
}

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    console.log('AI Cron: Starting scheduled evaluation run...');

    try {
      // 1. Fetch pending jobs (limit to 100 per run)
      const pendingJobs = await env.DB.prepare(`
        SELECT * FROM ai_evaluation_jobs
        WHERE status = 'pending' AND retry_count < max_retries
        ORDER BY requested_at ASC
        LIMIT 100
      `).all();

      if (!pendingJobs.results || pendingJobs.results.length === 0) {
        console.log('AI Cron: No pending jobs found');
        return;
      }

      console.log(`AI Cron: Processing ${pendingJobs.results.length} pending jobs`);

      // 2. Process each job
      for (const job of pendingJobs.results) {
        ctx.waitUntil(processJob(env, job));
      }

    } catch (error) {
      console.error('AI Cron: Error in scheduled run:', error);
    }
  }
};

async function processJob(env: Env, job: any) {
  const jobId = job.id;

  try {
    console.log(`AI Cron: Processing job ${jobId} for lead ${job.lead_id}`);

    // 1. Update status to processing
    await env.DB.prepare(`
      UPDATE ai_evaluation_jobs
      SET status = 'processing', started_at = ?, updated_at = ?
      WHERE id = ?
    `).bind(new Date().toISOString(), new Date().toISOString(), jobId).run();

    // 2. Fetch lead
    const lead = await env.DB.prepare(`
      SELECT * FROM leads WHERE id = ? AND site_id = ?
    `).bind(job.lead_id, job.site_id).first();

    if (!lead) {
      throw new Error('Lead not found');
    }

    // 3. Fetch documents
    const documents = await loadDocuments(env, job.lead_id);
    if (documents.length === 0) {
      throw new Error('No documents found');
    }

    // 4. Call Workers AI
    const evaluation = await evaluateWithAI(env, lead, documents);

    // 5. Save evaluation
    const evaluationId = `eval_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    await env.DB.prepare(`
      INSERT INTO lead_ai_evaluations (
        id, lead_id, score, label, summary, recommendation,
        risk_flags, fraud_signals, model_version, evaluated_at, site_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      evaluationId,
      job.lead_id,
      evaluation.score,
      evaluation.label,
      evaluation.summary,
      evaluation.recommendation,
      JSON.stringify(evaluation.risk_flags),
      JSON.stringify(evaluation.fraud_signals),
      '@cf/meta/llama-3.2-11b-vision-instruct',
      new Date().toISOString(),
      job.site_id
    ).run();

    // 6. Update lead
    await env.DB.prepare(`
      UPDATE leads
      SET ai_score = ?, ai_label = ?, status = 'ai_evaluated', updated_at = ?
      WHERE id = ?
    `).bind(
      evaluation.score,
      evaluation.label,
      new Date().toISOString(),
      job.lead_id
    ).run();

    // 7. Mark job as completed
    await env.DB.prepare(`
      UPDATE ai_evaluation_jobs
      SET status = 'completed', completed_at = ?, evaluation_id = ?, updated_at = ?
      WHERE id = ?
    `).bind(
      new Date().toISOString(),
      evaluationId,
      new Date().toISOString(),
      jobId
    ).run();

    console.log(`AI Cron: Job ${jobId} completed successfully`);

  } catch (error) {
    console.error(`AI Cron: Job ${jobId} failed:`, error);

    // Update job with error
    await env.DB.prepare(`
      UPDATE ai_evaluation_jobs
      SET status = 'failed',
          error_code = ?,
          error_message = ?,
          retry_count = retry_count + 1,
          updated_at = ?
      WHERE id = ?
    `).bind(
      error.code || 'UnknownError',
      error.message || 'Unknown error occurred',
      new Date().toISOString(),
      jobId
    ).run();

    // If max retries not reached, reset to pending for next cron run
    if (job.retry_count < job.max_retries) {
      await env.DB.prepare(`
        UPDATE ai_evaluation_jobs
        SET status = 'pending'
        WHERE id = ?
      `).bind(jobId).run();
    }
  }
}

async function loadDocuments(env: Env, leadId: string): Promise<any[]> {
  const fileRecords = await env.DB.prepare(`
    SELECT * FROM lead_files WHERE lead_id = ? ORDER BY uploaded_at DESC
  `).bind(leadId).all();

  if (!fileRecords.results || fileRecords.results.length === 0) {
    throw new Error('No documents found');
  }

  const documents = await Promise.all(
    fileRecords.results.map(async (file: any) => {
      const r2Object = await env.R2_PRIVATE.get(file.r2_key);
      if (!r2Object) return null;

      const arrayBuffer = await r2Object.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      return {
        file_type: file.file_type,
        file_name: file.file_name,
        mime_type: file.mime_type,
        content: base64
      };
    })
  );

  return documents.filter(doc => doc !== null);
}

async function evaluateWithAI(env: Env, lead: any, documents: any[]): Promise<any> {
  const prompt = buildPrompt(lead, documents);

  const response = await env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', {
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 2000,
    temperature: 0.1
  });

  // Parse AI response (implement parseAiResponse function)
  return parseAiResponse(response, lead);
}

function buildPrompt(lead: any, documents: any[]): string {
  // Same prompt from PRD
  return `You are an expert tenant screening assistant...`;
}

function parseAiResponse(aiResponse: any, lead: any): any {
  // Parse and validate AI response
  return {
    score: 82,
    label: 'A',
    recommendation: 'approve',
    summary: 'Strong candidate...',
    risk_flags: [],
    fraud_signals: []
  };
}
```

---

## Frontend Integration

### React Component (Same as Before)

```typescript
// apps/ops/app/components/AiEvaluationButton.tsx

export function AiEvaluationButton({ leadId }: { leadId: string }) {
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'pending' | 'processing' | 'completed' | 'failed'>('idle');

  const handleRunEvaluation = async () => {
    const response = await fetch(`/api/ops/leads/${leadId}/ai-evaluation`, {
      method: 'POST'
    });
    const data = await response.json();

    if (data.success) {
      setJobId(data.data.job_id);
      setStatus('pending');
    }
  };

  // Poll job status every 10 seconds (cron runs hourly)
  useEffect(() => {
    if (!jobId || status === 'completed' || status === 'failed') return;

    const pollInterval = setInterval(async () => {
      const response = await fetch(`/api/ops/ai-evaluation-jobs/${jobId}`);
      const data = await response.json();

      if (data.success) {
        setStatus(data.data.status);

        if (data.data.status === 'completed') {
          setEvaluation(data.data.evaluation);
          clearInterval(pollInterval);
        } else if (data.data.status === 'failed') {
          setError(data.data.error_message);
          clearInterval(pollInterval);
        }
      }
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(pollInterval);
  }, [jobId, status]);

  // Render UI...
}
```

---

## Deployment

### 1. Create Cron Worker

```bash
# Create new worker directory
mkdir -p apps/ai-cron
cd apps/ai-cron

# Initialize wrangler config
cat > wrangler.toml << EOF
name = "leaselab-ai-cron"
main = "worker.ts"
compatibility_date = "2024-11-01"

[triggers]
crons = ["0 * * * *"]

[[d1_databases]]
binding = "DB"
database_name = "leaselab-db"
database_id = "850dc940-1021-4c48-8d40-0f18992424ac"

[[r2_buckets]]
binding = "R2_PRIVATE"
bucket_name = "leaselab-pri"

[ai]
binding = "AI"
EOF

# Create worker.ts
# (Copy implementation from above)
```

### 2. Deploy

```bash
# Deploy cron worker
npx wrangler deploy apps/ai-cron

# Verify cron trigger
npx wrangler triggers list --name leaselab-ai-cron
```

### 3. Test

```bash
# Manually trigger cron (for testing)
npx wrangler triggers execute --name leaselab-ai-cron
```

---

## Advantages Over Workflows/Queues

| Advantage | Explanation |
|-----------|-------------|
| ✅ **Simplest** | No Workflow bindings, no Queue setup - just a cron trigger |
| ✅ **Zero Cost** | Cron triggers are FREE (unlimited) |
| ✅ **No Limits** | No 10M step limit (Workflows) or 1M operation limit (Queues) |
| ✅ **Batch Processing** | Process up to 100 jobs per hour (efficient) |
| ✅ **Future-Proof** | No service limits to worry about |
| ✅ **Easy Debugging** | See cron logs in Cloudflare dashboard |
| ✅ **Flexible Schedule** | Adjust cron schedule easily (hourly, every 5 min, etc.) |
| ✅ **Transparent** | Simple DB table tracks everything |

---

## Cost Analysis

**Cron Worker (FREE)**:
- Cron triggers: **FREE** (unlimited)
- Worker invocations: FREE (within 100k requests/day)
- Workers AI: FREE (within 10k neurons/day)
- **Total cost per evaluation**: $0.00

**Workflows**:
- 10M step executions/month
- 7 steps per evaluation = 1.4M evaluations/month max
- Cost: $0.00 (within free tier)

**Queues**:
- 1M operations/month
- 2 operations per evaluation = 500k evaluations/month max
- Cost: $0.00 (within free tier)

**Winner**: **Cron Worker** - No limits, truly free.

---

## Cron Schedule Options

```toml
# Every hour (production)
crons = ["0 * * * *"]

# Every 5 minutes (testing)
crons = ["*/5 * * * *"]

# Every 15 minutes (medium volume)
crons = ["*/15 * * * *"]

# Every 30 minutes (high volume)
crons = ["*/30 * * * *"]

# Daily at 2 AM (low volume)
crons = ["0 2 * * *"]
```

---

## Monitoring

### Cloudflare Dashboard

1. **Cron Executions**: See all cron runs
2. **Logs**: View console.log output
3. **Errors**: Track failed runs
4. **Duration**: Monitor execution time

### Custom Metrics

```typescript
// In cron worker
export default {
  async scheduled(event, env, ctx) {
    const startTime = Date.now();

    // Process jobs...

    const duration = Date.now() - startTime;
    console.log(JSON.stringify({
      metric: 'cron_execution_time_ms',
      value: duration,
      jobs_processed: pendingJobs.results.length
    }));
  }
};
```

---

## Summary

**Cron Worker** is the **simplest, cheapest, and most future-proof** solution:

1. **Frontend**: Creates job in DB (status: pending)
2. **Cron Worker**: Runs every hour, processes pending jobs
3. **Frontend**: Polls job status until completed

**No Workflows. No Queues. Just a cron trigger and a DB table.**

---

**Last Updated**: 2025-12-17
**Version**: 3.0 (Cron-based)
**Status**: RECOMMENDED ARCHITECTURE ✅
