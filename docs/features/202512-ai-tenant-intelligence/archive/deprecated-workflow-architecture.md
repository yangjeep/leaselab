# AI Tenant Intelligence - Workflow Architecture (Cloudflare Workflows)

## Overview

This document specifies the **stateful, async architecture** using **Cloudflare Workflows** instead of Queues. Workflows are purpose-built for this exact pattern: trigger long-running tasks, track state, and query results.

---

## Why Workflows > Queues

| Aspect | Cloudflare Workflows ✅ | Cloudflare Queues ❌ |
|--------|------------------------|----------------------|
| **Use Case** | Long-running, stateful tasks | High-throughput message passing |
| **Complexity** | Simple: trigger & query | Complex: producer/consumer setup |
| **State Management** | Built-in (automatic) | Manual (need separate table) |
| **Status Queries** | Native `workflow.get()` | Requires polling DB |
| **Retries** | Built-in with step isolation | Manual retry logic |
| **Dead Letter Queue** | Not needed (steps retry independently) | Requires DLQ setup |
| **Cost** | Free tier: 10M step executions/month | Free tier: 1M operations/month |
| **Overhead** | Zero (just trigger workflow) | Queue producer + consumer workers |

**Verdict**: Workflows are **simpler, cheaper, and purpose-built** for this exact use case.

---

## Architecture (Workflows-Based)

```
┌─────────────────────────────────────────────────────────────────┐
│              AI Tenant Intelligence (Workflows)                  │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐         ┌──────────────────────┐
│   Ops Dashboard  │────────▶│  leaselab-worker     │
│   (Remix App)    │         │  (CRUD Only)         │
│                  │         │                      │
│  1. Click "Run   │         │  1. Create job in DB │
│     AI Eval"     │         │  2. Trigger Workflow │
│                  │         │  3. Return job_id    │
│  2. Query job    │◀────────│     immediately      │
│     status       │         │                      │
└──────────────────┘         └──────────┬───────────┘
         ▲                              │
         │                              │ workflow.create()
         │                              ▼
         │                   ┌────────────────────────┐
         │                   │ Cloudflare Workflow    │
         │                   │ (Durable Execution)    │
         │                   │                        │
         │                   │ Step 1: Fetch docs     │
         │                   │ Step 2: Call AI        │
         │                   │ Step 3: Save results   │
         │                   │ Step 4: Update DB      │
         │                   │ Step 5: Email user     │
         │                   └──────────┬─────────────┘
         │                              │
         │                              │ Auto-retries
         │                              │ State tracking
         │                              │
         └──────────────────────────────┘
            Frontend queries
            workflow.get(instanceId)
            to check status

┌────────────────────────────────────────────────────────────────┐
│  Workflow binds to: D1, R2, Workers AI, Email (future)        │
└────────────────────────────────────────────────────────────────┘
```

---

## Database Schema (Simplified)

With Workflows, we **don't need** `ai_evaluation_jobs` table! Workflow state tracking replaces it.

### Option 1: No Job Table (Use Workflow State Only)

```sql
-- No ai_evaluation_jobs table needed!
-- Workflow instance ID is stored in lead_ai_evaluations.workflow_instance_id

ALTER TABLE lead_ai_evaluations ADD COLUMN workflow_instance_id TEXT;
```

**Frontend queries**: `workflow.get(instanceId)` returns:
- Status: `queued`, `running`, `paused`, `complete`, `error`
- Current step
- Output (evaluation result when complete)

### Option 2: Lightweight Job Table (Optional, for historical queries)

```sql
-- Minimal job tracking (optional)
CREATE TABLE ai_evaluation_jobs (
  id TEXT PRIMARY KEY,              -- Workflow instance ID
  lead_id TEXT NOT NULL,
  site_id TEXT NOT NULL,
  requested_by TEXT NOT NULL,
  requested_at TEXT NOT NULL,

  -- No need for status, started_at, completed_at, retry_count
  -- Workflow tracks all of this automatically

  FOREIGN KEY (lead_id) REFERENCES leads(id)
);

CREATE INDEX idx_ai_jobs_lead_id ON ai_evaluation_jobs(lead_id);
```

**Recommendation**: Start with **Option 1** (no table). Add table later if needed for complex queries.

---

## API Design (CRUD Worker)

### 1. Create AI Evaluation (Trigger Workflow)

**Endpoint**: `POST /api/ops/leads/:leadId/ai-evaluation`

**Process**:
1. Check quota (can user create more evaluations this month?)
2. If quota exceeded → return error
3. **Trigger workflow** with `env.AI_WORKFLOW.create()`
4. Get workflow instance ID
5. Increment usage counter
6. Return instance ID immediately

**Response (Immediate - <100ms)**:
```json
{
  "success": true,
  "data": {
    "instance_id": "wf_abc123def456",  // Workflow instance ID
    "lead_id": "lead_xyz789",
    "status": "queued",
    "requested_at": "2025-12-17T10:00:00Z"
  }
}
```

---

### 2. Get Workflow Status (Query Workflow State)

**Endpoint**: `GET /api/ops/ai-workflows/:instanceId`

**Process**:
1. Call `env.AI_WORKFLOW.get(instanceId)`
2. Return workflow status and output

**Response (Queued)**:
```json
{
  "success": true,
  "data": {
    "instance_id": "wf_abc123def456",
    "status": "queued",  // Cloudflare Workflows status
    "queued_at": "2025-12-17T10:00:00Z"
  }
}
```

**Response (Running)**:
```json
{
  "success": true,
  "data": {
    "instance_id": "wf_abc123def456",
    "status": "running",
    "current_step": "Calling Workers AI...",
    "started_at": "2025-12-17T10:00:05Z"
  }
}
```

**Response (Complete)**:
```json
{
  "success": true,
  "data": {
    "instance_id": "wf_abc123def456",
    "status": "complete",
    "started_at": "2025-12-17T10:00:05Z",
    "completed_at": "2025-12-17T10:00:12Z",
    "output": {
      "evaluation_id": "eval_abc123",
      "score": 82,
      "label": "A",
      "recommendation": "approve",
      "summary": "Strong candidate...",
      "risk_flags": ["employment_duration_short"],
      "fraud_signals": []
    }
  }
}
```

**Response (Error)**:
```json
{
  "success": true,
  "data": {
    "instance_id": "wf_abc123def456",
    "status": "error",
    "error": "ModelTimeout: AI model took too long to respond",
    "can_retry": true
  }
}
```

---

## Workflow Definition

### Wrangler Configuration

```toml
# apps/worker/wrangler.toml (add to existing CRUD worker)
name = "leaselab-worker"
main = "worker.ts"
compatibility_date = "2024-11-01"
compatibility_flags = ["nodejs_compat"]

# Existing bindings...
[[d1_databases]]
binding = "DB"
database_name = "leaselab-db"
database_id = "850dc940-1021-4c48-8d40-0f18992424ac"

[[r2_buckets]]
binding = "R2_PRIVATE"
bucket_name = "leaselab-pri"

# NEW: Workflow binding
[[workflows]]
binding = "AI_WORKFLOW"
name = "ai-tenant-evaluation"
script_name = "ai-evaluation-workflow"

[ai]
binding = "AI"

[env.production]
# Production config
```

---

### Workflow Implementation

```typescript
// apps/worker/workflows/ai-evaluation.ts

import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from 'cloudflare:workers';

interface EvaluationWorkflowParams {
  lead_id: string;
  site_id: string;
  requested_by: string;
  model_version?: string;
}

interface Env {
  DB: D1Database;
  R2_PRIVATE: R2Bucket;
  AI: Ai;
  // EMAIL: SendEmailService; // Future
}

export class AiEvaluationWorkflow extends WorkflowEntrypoint<Env, EvaluationWorkflowParams> {
  async run(event: WorkflowEvent<EvaluationWorkflowParams>, step: WorkflowStep) {
    const { lead_id, site_id, requested_by, model_version } = event.payload;

    // Step 1: Fetch lead data
    const lead = await step.do('fetch-lead', async () => {
      const result = await this.env.DB.prepare(`
        SELECT * FROM leads WHERE id = ? AND site_id = ?
      `).bind(lead_id, site_id).first();

      if (!result) {
        throw new Error('Lead not found');
      }

      return result;
    });

    // Step 2: Fetch and load documents from R2
    const documents = await step.do('load-documents', async () => {
      // Fetch file records
      const fileRecords = await this.env.DB.prepare(`
        SELECT * FROM lead_files WHERE lead_id = ? ORDER BY uploaded_at DESC
      `).bind(lead_id).all();

      if (!fileRecords.results || fileRecords.results.length === 0) {
        throw new Error('No documents found for evaluation');
      }

      // Load files from R2
      const docs = await Promise.all(
        fileRecords.results.map(async (file: any) => {
          const r2Object = await this.env.R2_PRIVATE.get(file.r2_key);
          if (!r2Object) {
            console.warn(`File not found in R2: ${file.r2_key}`);
            return null;
          }

          const arrayBuffer = await r2Object.arrayBuffer();
          const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

          return {
            file_type: file.file_type,
            file_name: file.file_name,
            mime_type: file.mime_type,
            content: base64,
          };
        })
      );

      return docs.filter(doc => doc !== null);
    });

    // Step 3: Call Workers AI for evaluation
    const aiResponse = await step.do('call-workers-ai', async () => {
      const prompt = buildEvaluationPrompt(lead, documents);

      const response = await this.env.AI.run(
        model_version || '@cf/meta/llama-3.2-11b-vision-instruct',
        {
          messages: [
            {
              role: 'user',
              content: prompt,
            }
          ],
          max_tokens: 2000,
          temperature: 0.1,
        }
      );

      return response;
    });

    // Step 4: Parse and validate AI response
    const evaluation = await step.do('parse-ai-response', async () => {
      const parsed = parseAiResponse(aiResponse, lead);
      return parsed;
    });

    // Step 5: Save evaluation to database
    const evaluationId = await step.do('save-evaluation', async () => {
      const id = `eval_${generateId()}`;

      await this.env.DB.prepare(`
        INSERT INTO lead_ai_evaluations (
          id, lead_id, score, label, summary, recommendation,
          risk_flags, fraud_signals, model_version, evaluated_at, site_id,
          workflow_instance_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        id,
        lead_id,
        evaluation.score,
        evaluation.label,
        evaluation.summary,
        evaluation.recommendation,
        JSON.stringify(evaluation.risk_flags),
        JSON.stringify(evaluation.fraud_signals),
        model_version || '@cf/meta/llama-3.2-11b-vision-instruct',
        new Date().toISOString(),
        site_id,
        event.instanceId  // Store workflow instance ID
      ).run();

      return id;
    });

    // Step 6: Update lead with AI results
    await step.do('update-lead', async () => {
      await this.env.DB.prepare(`
        UPDATE leads
        SET ai_score = ?, ai_label = ?, status = 'ai_evaluated', updated_at = ?
        WHERE id = ?
      `).bind(
        evaluation.score,
        evaluation.label,
        new Date().toISOString(),
        lead_id
      ).run();
    });

    // Step 7: Email user (placeholder for future)
    await step.do('send-email-notification', async () => {
      // Future: Send email to user who requested evaluation
      // await this.env.EMAIL.send({
      //   to: requested_by_email,
      //   subject: `AI Evaluation Complete for ${lead.first_name} ${lead.last_name}`,
      //   body: `Score: ${evaluation.score}, Label: ${evaluation.label}`
      // });

      console.log('Email notification skipped (not implemented yet)');
    });

    // Return final result (accessible via workflow.get())
    return {
      evaluation_id: evaluationId,
      score: evaluation.score,
      label: evaluation.label,
      recommendation: evaluation.recommendation,
      summary: evaluation.summary,
      risk_flags: evaluation.risk_flags,
      fraud_signals: evaluation.fraud_signals,
    };
  }
}

// Helper functions
function buildEvaluationPrompt(lead: any, documents: any[]): string {
  // Same prompt engineering as before
  return `You are an expert tenant screening assistant...`;
}

function parseAiResponse(aiResponse: any, lead: any): any {
  // Parse and validate AI response
  // Return structured evaluation object
  return {
    score: 82,
    label: 'A',
    recommendation: 'approve',
    summary: '...',
    risk_flags: [],
    fraud_signals: [],
  };
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}
```

---

## CRUD Worker API Endpoints

### Trigger Workflow

```typescript
// apps/worker/routes/ops.ts

import { Hono } from 'hono';

const app = new Hono();

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
      message: `You have reached your monthly AI evaluation limit (${quota.used}/${quota.limit}).`,
      usage: {
        remaining: 0,
        limit: quota.limit,
        month: getCurrentMonth(),
      }
    }, 403);
  }

  // 2. Trigger workflow
  const instance = await c.env.AI_WORKFLOW.create({
    params: {
      lead_id: leadId,
      site_id: siteId,
      requested_by: userId,
      model_version: '@cf/meta/llama-3.2-11b-vision-instruct',
    }
  });

  // 3. Increment usage counter
  await incrementUsageCounter(c.env.DB, siteId);

  // 4. Return instance ID immediately
  return c.json({
    success: true,
    data: {
      instance_id: instance.id,
      lead_id: leadId,
      status: 'queued',
      requested_at: new Date().toISOString(),
    },
    usage: {
      remaining: quota.limit - quota.used - 1,
      limit: quota.limit,
      month: getCurrentMonth(),
    }
  });
});

// Query workflow status
app.get('/api/ops/ai-workflows/:instanceId', async (c) => {
  const { instanceId } = c.req.param();

  // Get workflow status
  const workflow = await c.env.AI_WORKFLOW.get(instanceId);

  if (!workflow) {
    return c.json({
      success: false,
      error: 'WorkflowNotFound',
      message: 'Workflow instance not found',
    }, 404);
  }

  // Map Cloudflare Workflow status to our response format
  const response: any = {
    instance_id: instanceId,
    status: workflow.status, // 'queued', 'running', 'paused', 'complete', 'error'
  };

  if (workflow.status === 'complete') {
    response.output = workflow.output;
    response.completed_at = workflow.output?.completed_at || new Date().toISOString();
  } else if (workflow.status === 'error') {
    response.error = workflow.error;
    response.can_retry = true;
  } else if (workflow.status === 'running') {
    response.current_step = 'Processing...'; // Workflows don't expose current step name
  }

  return c.json({
    success: true,
    data: response,
  });
});

// Get latest evaluation for a lead (alternative to workflow query)
app.get('/api/ops/leads/:leadId/ai-evaluation', async (c) => {
  const { leadId } = c.req.param();
  const siteId = c.req.header('X-Site-Id');

  const result = await c.env.DB.prepare(`
    SELECT * FROM lead_ai_evaluations
    WHERE lead_id = ? AND site_id = ?
    ORDER BY evaluated_at DESC
    LIMIT 1
  `).bind(leadId, siteId).first();

  if (!result) {
    return c.json({
      success: false,
      error: 'NotFound',
      message: 'No evaluation found for this lead',
    }, 404);
  }

  return c.json({
    success: true,
    data: {
      id: result.id,
      score: result.score,
      label: result.label,
      summary: result.summary,
      recommendation: result.recommendation,
      risk_flags: JSON.parse(result.risk_flags),
      fraud_signals: JSON.parse(result.fraud_signals),
      evaluated_at: result.evaluated_at,
      model_version: result.model_version,
      workflow_instance_id: result.workflow_instance_id,
    }
  });
});

// Helper functions
async function checkQuota(db: D1Database, siteId: string): Promise<any> {
  const currentMonth = getCurrentMonth();

  const usage = await db.prepare(`
    SELECT * FROM ai_evaluation_usage WHERE site_id = ? AND month = ?
  `).bind(siteId, currentMonth).first();

  if (!usage) {
    // Create usage record
    await db.prepare(`
      INSERT INTO ai_evaluation_usage (id, site_id, month, evaluation_count, quota_limit, tier, created_at, updated_at)
      VALUES (?, ?, ?, 0, 20, 'free', ?, ?)
    `).bind(`usage_${Date.now()}`, siteId, currentMonth, new Date().toISOString(), new Date().toISOString()).run();

    return { allowed: true, used: 0, limit: 20 };
  }

  return {
    allowed: usage.evaluation_count < usage.quota_limit,
    used: usage.evaluation_count,
    limit: usage.quota_limit,
  };
}

async function incrementUsageCounter(db: D1Database, siteId: string): Promise<void> {
  const currentMonth = getCurrentMonth();

  await db.prepare(`
    UPDATE ai_evaluation_usage
    SET evaluation_count = evaluation_count + 1, updated_at = ?
    WHERE site_id = ? AND month = ?
  `).bind(new Date().toISOString(), siteId, currentMonth).run();
}

function getCurrentMonth(): string {
  return new Date().toISOString().slice(0, 7); // 'YYYY-MM'
}
```

---

## Frontend Integration (Polling)

### React Component

```typescript
// apps/ops/app/components/AiEvaluationButton.tsx

import { useState, useEffect } from 'react';

interface AiEvaluationButtonProps {
  leadId: string;
}

export function AiEvaluationButton({ leadId }: AiEvaluationButtonProps) {
  const [instanceId, setInstanceId] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'queued' | 'running' | 'complete' | 'error'>('idle');
  const [evaluation, setEvaluation] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Start evaluation
  const handleRunEvaluation = async () => {
    try {
      const response = await fetch(`/api/ops/leads/${leadId}/ai-evaluation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (data.success) {
        setInstanceId(data.data.instance_id);
        setStatus('queued');
      } else {
        setError(data.message);
        setStatus('error');
      }
    } catch (err) {
      setError('Failed to start evaluation');
      setStatus('error');
    }
  };

  // Poll workflow status
  useEffect(() => {
    if (!instanceId || status === 'complete' || status === 'error') {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/ops/ai-workflows/${instanceId}`);
        const data = await response.json();

        if (data.success) {
          setStatus(data.data.status);

          if (data.data.status === 'complete') {
            setEvaluation(data.data.output);
            clearInterval(pollInterval);
          } else if (data.data.status === 'error') {
            setError(data.data.error);
            clearInterval(pollInterval);
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [instanceId, status]);

  // Render UI
  if (status === 'idle') {
    return (
      <button onClick={handleRunEvaluation} className="btn-primary">
        Run AI Evaluation
      </button>
    );
  }

  if (status === 'queued' || status === 'running') {
    return (
      <div className="flex items-center gap-2">
        <Spinner />
        <span>
          {status === 'queued' ? 'AI evaluation queued...' : 'AI is analyzing documents...'}
        </span>
      </div>
    );
  }

  if (status === 'complete' && evaluation) {
    return (
      <div className="ai-evaluation-result">
        <div className="score-badge">
          Score: {evaluation.score}/100 | Label: {evaluation.label}
        </div>
        <div className="recommendation">
          {evaluation.recommendation}
        </div>
        <div className="summary">
          {evaluation.summary}
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="error">
        <p>{error}</p>
        <button onClick={handleRunEvaluation}>Retry</button>
      </div>
    );
  }

  return null;
}
```

---

## Error Handling & Retries

### Workflow Step Retries

Each `step.do()` automatically retries on failure:
- **Default**: 3 retries per step
- **Exponential backoff**: 1s, 2s, 4s delays
- **Independent retries**: If Step 3 fails, only Step 3 retries (Steps 1-2 don't re-run)

### Workflow-Level Error Handling

```typescript
// In workflow definition
export class AiEvaluationWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    try {
      // Steps 1-7...

      return { success: true, evaluation };
    } catch (error) {
      // Workflow-level error handler
      await step.do('log-error', async () => {
        console.error('Workflow failed:', error);

        // Optional: Save error to DB for debugging
        await this.env.DB.prepare(`
          INSERT INTO workflow_errors (workflow_id, error_message, created_at)
          VALUES (?, ?, ?)
        `).bind(event.instanceId, error.message, new Date().toISOString()).run();
      });

      // Re-throw to mark workflow as failed
      throw error;
    }
  }
}
```

---

## Cost Analysis (Workflows vs. Queues)

| Component | Workflows | Queues |
|-----------|-----------|--------|
| **Free Tier** | 10M step executions/month | 1M operations/month |
| **Steps per Evaluation** | ~7 steps | ~2 queue operations |
| **Max Evaluations (Free Tier)** | 1.4M evaluations/month | 500k evaluations/month |
| **Infrastructure Overhead** | None (built-in state) | Separate job table + DLQ |
| **Code Complexity** | Low (single workflow file) | High (producer + consumer) |
| **Cost per Evaluation** | ~$0.00 (well within free tier) | ~$0.00 (well within free tier) |

**Winner**: Workflows (simpler, more generous free tier)

---

## Migration from Queue Design

### What Changes

| Aspect | Queue Design | Workflow Design |
|--------|-------------|-----------------|
| **Job Tracking** | Manual `ai_evaluation_jobs` table | Built-in workflow state |
| **Status Query** | Poll DB table | Query `workflow.get()` |
| **Retries** | Manual retry logic + DLQ | Automatic per-step retries |
| **Worker Count** | 2 workers (CRUD + AI) | 1 worker (CRUD only) |
| **Trigger Mechanism** | `queue.send()` | `workflow.create()` |
| **Infrastructure** | Queue + DLQ setup | Just workflow binding |

### What Stays the Same

- ✅ Frontend polling pattern (same 2-second interval)
- ✅ Quota checking logic
- ✅ Multi-modal AI model (LLaMA 3.2 Vision)
- ✅ Database schema for `lead_ai_evaluations`
- ✅ API response formats

---

## Deployment

### 1. Update Wrangler Config

```toml
# apps/worker/wrangler.toml

# Add workflow binding
[[workflows]]
binding = "AI_WORKFLOW"
name = "ai-tenant-evaluation"
script_name = "ai-evaluation-workflow"
```

### 2. Deploy Workflow

```bash
# Deploy workflow definition
npx wrangler deploy apps/worker/workflows/ai-evaluation.ts --name ai-evaluation-workflow

# Deploy main worker with workflow binding
npx wrangler deploy apps/worker
```

### 3. Test Workflow

```bash
# Trigger workflow via API
curl -X POST https://leaselab-worker.yangjeep.workers.dev/api/ops/leads/lead_123/ai-evaluation \
  -H "X-Site-Id: site_abc" \
  -H "X-User-Id: user_xyz"

# Query workflow status
curl https://leaselab-worker.yangjeep.workers.dev/api/ops/ai-workflows/wf_abc123
```

---

## Monitoring & Observability

### Cloudflare Dashboard

Workflows provide built-in monitoring:
- **Instances**: See all workflow runs
- **Status**: Queued, Running, Complete, Error
- **Duration**: Time per step and total
- **Retries**: Which steps failed and retried
- **Logs**: Console logs from each step

### Custom Metrics

```typescript
// In workflow steps, log metrics
await step.do('call-workers-ai', async () => {
  const startTime = Date.now();
  const response = await this.env.AI.run(...);
  const duration = Date.now() - startTime;

  console.log(JSON.stringify({
    metric: 'ai_inference_duration_ms',
    value: duration,
    model: '@cf/meta/llama-3.2-11b-vision-instruct',
  }));

  return response;
});
```

---

## Advantages Over Queue Design

| Advantage | Explanation |
|-----------|-------------|
| ✅ **Simpler** | No separate AI worker, no producer/consumer setup |
| ✅ **Built-in State** | Don't need `ai_evaluation_jobs` table |
| ✅ **Better Retries** | Per-step retries (if Step 3 fails, Steps 1-2 don't re-run) |
| ✅ **Easier Debugging** | See step-by-step execution in Cloudflare dashboard |
| ✅ **Lower Cost** | More generous free tier (10M vs 1M operations) |
| ✅ **No DLQ** | Failed workflows are visible, no separate dead letter queue |
| ✅ **Future-Proof** | Easy to add steps (e.g., email notification) without infrastructure changes |

---

## Summary

**Cloudflare Workflows** is the perfect fit for AI Tenant Intelligence:

1. **Trigger**: CRUD worker calls `workflow.create()` → returns instance ID immediately
2. **Process**: Workflow runs 7 steps (fetch docs → AI → save → email)
3. **Query**: Frontend polls `workflow.get(instanceId)` for status
4. **Done**: Workflow returns evaluation result, frontend displays it

**No Queues. No separate AI worker. No manual state tracking. Just workflows.**

---

**Last Updated**: 2025-12-17
**Version**: 2.0 (Workflows-based)
**Status**: Recommended Architecture ✅
