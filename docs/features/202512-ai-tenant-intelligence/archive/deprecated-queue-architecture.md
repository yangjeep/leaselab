# AI Tenant Intelligence - Async Architecture Specification

## Overview

This document specifies the **stateful, asynchronous architecture** for AI tenant evaluation using a dedicated AI worker separate from the CRUD worker.

---

## Architecture Principles

### Separation of Concerns

```
┌─────────────────────────────────────────────────────────────┐
│                     CURRENT ARCHITECTURE                     │
└─────────────────────────────────────────────────────────────┘

┌──────────────────┐         ┌──────────────────┐
│   Ops Dashboard  │────────▶│  leaselab-worker │
│   (Remix App)    │◀────────│   (CRUD Only)    │
└──────────────────┘         └────────┬─────────┘
                                      │
                                      ▼
                              ┌──────────────┐
                              │  D1 Database │
                              └──────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      NEW ARCHITECTURE                        │
└─────────────────────────────────────────────────────────────┘

┌──────────────────┐         ┌──────────────────┐
│   Ops Dashboard  │────────▶│  leaselab-worker │
│   (Remix App)    │◀────────│   (CRUD Only)    │
└──────────────────┘         └────────┬─────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
                    ▼                 ▼                 ▼
            ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
            │  D1 Database │  │  R2 Storage  │  │ Queue/Jobs   │
            └──────┬───────┘  └──────────────┘  └──────┬───────┘
                   │                                    │
                   │          ┌──────────────────┐      │
                   └─────────▶│ leaselab-ai-     │◀─────┘
                              │ worker (NEW)     │
                              │ AI Processing    │
                              └────────┬─────────┘
                                       │
                                       ▼
                              ┌──────────────────┐
                              │ Cloudflare       │
                              │ Workers AI       │
                              │ (LLaMA 3.2)      │
                              └──────────────────┘
```

### Key Design Decisions

1. **Separate AI Worker** - `leaselab-ai-worker` handles all AI operations
2. **CRUD Worker Unchanged** - `leaselab-worker` only does database CRUD
3. **Stateful Jobs** - DB tracks evaluation job status (`pending`, `processing`, `completed`, `failed`)
4. **Async Processing** - Frontend polls or uses webhooks for results
5. **Queue-Based** - Use Cloudflare Queues for job orchestration

---

## Database Schema (Stateful Jobs)

### New Table: `ai_evaluation_jobs`

This table tracks the **state** of each AI evaluation request.

```sql
CREATE TABLE ai_evaluation_jobs (
  id TEXT PRIMARY KEY,                    -- Job ID (e.g., 'job_abc123')
  lead_id TEXT NOT NULL,                  -- Foreign key to leads table
  site_id TEXT NOT NULL,                  -- Multi-tenancy
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'processing' | 'completed' | 'failed'

  -- Request metadata
  requested_by TEXT NOT NULL,             -- User ID who triggered evaluation
  requested_at TEXT NOT NULL,             -- ISO timestamp

  -- Processing metadata
  started_at TEXT,                        -- When AI worker picked up job
  completed_at TEXT,                      -- When job finished (success or failure)

  -- Results (populated on completion)
  evaluation_id TEXT,                     -- Foreign key to lead_ai_evaluations table
  error_code TEXT,                        -- Error code if failed
  error_message TEXT,                     -- Human-readable error if failed

  -- Retry logic
  retry_count INTEGER NOT NULL DEFAULT 0, -- Number of retries attempted
  max_retries INTEGER NOT NULL DEFAULT 3, -- Max retry attempts

  -- Model configuration
  model_version TEXT NOT NULL DEFAULT '@cf/meta/llama-3.2-11b-vision-instruct',

  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  FOREIGN KEY (lead_id) REFERENCES leads(id),
  FOREIGN KEY (evaluation_id) REFERENCES lead_ai_evaluations(id)
);

-- Indexes for fast lookups
CREATE INDEX idx_ai_jobs_lead_id ON ai_evaluation_jobs(lead_id);
CREATE INDEX idx_ai_jobs_site_id ON ai_evaluation_jobs(site_id);
CREATE INDEX idx_ai_jobs_status ON ai_evaluation_jobs(status);
CREATE INDEX idx_ai_jobs_requested_at ON ai_evaluation_jobs(requested_at DESC);

-- Composite index for polling queries
CREATE INDEX idx_ai_jobs_lead_status ON ai_evaluation_jobs(lead_id, status);
```

### Job Status State Machine

```
┌─────────┐
│ PENDING │  ← Frontend creates job
└────┬────┘
     │
     ▼
┌────────────┐
│ PROCESSING │  ← AI worker picks up job
└─────┬──────┘
      │
      ├──────────────┐
      │              │
      ▼              ▼
┌───────────┐   ┌─────────┐
│ COMPLETED │   │ FAILED  │
└───────────┘   └────┬────┘
                     │
                     ▼ (if retry_count < max_retries)
                ┌─────────┐
                │ PENDING │  ← Retry
                └─────────┘
```

---

## API Design (CRUD Worker)

The **CRUD worker** (`leaselab-worker`) only manages job records in the database. It does NOT perform AI processing.

### 1. Create AI Evaluation Job

**Endpoint**: `POST /api/ops/leads/:leadId/ai-evaluation`

**Purpose**: Frontend submits a request to evaluate a lead. Creates a job record.

**Request**:
```json
{
  "force_refresh": false,  // Optional: re-evaluate even if already evaluated
  "model_version": "auto"  // Optional: specific model or "auto"
}
```

**Process**:
1. Check quota (can user create more jobs this month?)
2. If quota exceeded → return error
3. Create job record in `ai_evaluation_jobs` table with status `pending`
4. Increment usage counter in `ai_evaluation_usage` table
5. **Enqueue job** to Cloudflare Queue for AI worker to process
6. Return job ID immediately (don't wait for AI processing)

**Response (Immediate)**:
```json
{
  "success": true,
  "data": {
    "job_id": "job_abc123",
    "lead_id": "lead_xyz789",
    "status": "pending",
    "requested_at": "2025-12-17T10:00:00Z",
    "estimated_completion": "2025-12-17T10:00:30Z"  // ~30 seconds estimate
  }
}
```

**Error (Quota Exceeded)**:
```json
{
  "success": false,
  "error": "QuotaExceeded",
  "message": "You have reached your monthly AI evaluation limit (20/20).",
  "usage": {
    "remaining": 0,
    "limit": 20,
    "month": "2025-12"
  }
}
```

---

### 2. Get AI Evaluation Job Status

**Endpoint**: `GET /api/ops/ai-evaluation-jobs/:jobId`

**Purpose**: Frontend polls this endpoint to check job status and get results when ready.

**Response (Pending)**:
```json
{
  "success": true,
  "data": {
    "job_id": "job_abc123",
    "lead_id": "lead_xyz789",
    "status": "pending",
    "requested_at": "2025-12-17T10:00:00Z",
    "requested_by": "user_123"
  }
}
```

**Response (Processing)**:
```json
{
  "success": true,
  "data": {
    "job_id": "job_abc123",
    "lead_id": "lead_xyz789",
    "status": "processing",
    "requested_at": "2025-12-17T10:00:00Z",
    "started_at": "2025-12-17T10:00:05Z",
    "progress_message": "Analyzing documents with AI..."
  }
}
```

**Response (Completed)**:
```json
{
  "success": true,
  "data": {
    "job_id": "job_abc123",
    "lead_id": "lead_xyz789",
    "status": "completed",
    "requested_at": "2025-12-17T10:00:00Z",
    "started_at": "2025-12-17T10:00:05Z",
    "completed_at": "2025-12-17T10:00:12Z",
    "duration_ms": 7000,
    "evaluation": {
      "id": "eval_def456",
      "score": 82,
      "label": "A",
      "recommendation": "approve",
      "summary": "Strong candidate with verified income...",
      "risk_flags": ["employment_duration_short"],
      "fraud_signals": []
    }
  }
}
```

**Response (Failed)**:
```json
{
  "success": true,
  "data": {
    "job_id": "job_abc123",
    "lead_id": "lead_xyz789",
    "status": "failed",
    "requested_at": "2025-12-17T10:00:00Z",
    "started_at": "2025-12-17T10:00:05Z",
    "completed_at": "2025-12-17T10:00:08Z",
    "error_code": "ModelTimeout",
    "error_message": "AI model took too long to respond. Please try again.",
    "retry_count": 2,
    "max_retries": 3,
    "can_retry": true
  }
}
```

---

### 3. Get All Jobs for a Lead

**Endpoint**: `GET /api/ops/leads/:leadId/ai-evaluation-jobs`

**Purpose**: Get job history for a lead (useful for debugging, showing past evaluations).

**Response**:
```json
{
  "success": true,
  "data": {
    "lead_id": "lead_xyz789",
    "jobs": [
      {
        "job_id": "job_abc123",
        "status": "completed",
        "requested_at": "2025-12-17T10:00:00Z",
        "completed_at": "2025-12-17T10:00:12Z",
        "evaluation_id": "eval_def456"
      },
      {
        "job_id": "job_xyz999",
        "status": "failed",
        "requested_at": "2025-12-16T14:30:00Z",
        "error_code": "InsufficientDocuments"
      }
    ]
  }
}
```

---

### 4. Retry Failed Job

**Endpoint**: `POST /api/ops/ai-evaluation-jobs/:jobId/retry`

**Purpose**: Manually retry a failed job.

**Response**:
```json
{
  "success": true,
  "data": {
    "job_id": "job_abc123",
    "status": "pending",
    "retry_count": 3,
    "max_retries": 3,
    "requested_at": "2025-12-17T10:05:00Z"
  }
}
```

---

## AI Worker Design (`leaselab-ai-worker`)

The **AI worker** is a separate Cloudflare Worker that:
1. Consumes jobs from a **Cloudflare Queue**
2. Fetches lead data and documents from D1/R2
3. Calls Workers AI to perform evaluation
4. Saves results to `lead_ai_evaluations` table
5. Updates job status in `ai_evaluation_jobs` table

### Worker Configuration

```toml
# apps/ai-worker/wrangler.toml
name = "leaselab-ai-worker"
main = "worker.ts"
compatibility_date = "2024-11-01"
compatibility_flags = ["nodejs_compat"]

# AI Binding
[ai]
binding = "AI"

# Database Binding
[[d1_databases]]
binding = "DB"
database_name = "leaselab-db"
database_id = "850dc940-1021-4c48-8d40-0f18992424ac"

# R2 Private Bucket (for documents)
[[r2_buckets]]
binding = "R2_PRIVATE"
bucket_name = "leaselab-pri"

# Queue Consumer (processes jobs)
[[queues.consumers]]
queue = "ai-evaluation-queue"
max_batch_size = 1        # Process one job at a time
max_retries = 3           # Auto-retry on failure
dead_letter_queue = "ai-evaluation-dlq"

# Queue Producer (in CRUD worker)
[[queues.producers]]
queue = "ai-evaluation-queue"
binding = "AI_QUEUE"

[env.production]
# Production-specific config

[env.preview]
# Preview environment
```

---

### Worker Code Structure

```
apps/ai-worker/
├── worker.ts              # Main entry point (queue consumer)
├── lib/
│   ├── evaluator.ts       # Core AI evaluation logic
│   ├── document-loader.ts # Fetch documents from R2
│   ├── prompt-builder.ts  # Build AI prompts
│   ├── result-parser.ts   # Parse AI response
│   └── db.ts              # Database operations
├── types/
│   └── index.ts           # TypeScript types
└── wrangler.toml          # Worker config
```

### Main Worker Handler

```typescript
// apps/ai-worker/worker.ts

import { evaluateLead } from './lib/evaluator';

interface Env {
  AI: Ai;
  DB: D1Database;
  R2_PRIVATE: R2Bucket;
}

interface AiEvaluationJob {
  job_id: string;
  lead_id: string;
  site_id: string;
  model_version: string;
}

export default {
  async queue(
    batch: MessageBatch<AiEvaluationJob>,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    for (const message of batch.messages) {
      const job = message.body;

      try {
        // Update job status to "processing"
        await updateJobStatus(env.DB, job.job_id, 'processing', {
          started_at: new Date().toISOString()
        });

        // Perform AI evaluation
        const evaluation = await evaluateLead(
          env,
          job.lead_id,
          job.site_id,
          job.model_version
        );

        // Save evaluation to lead_ai_evaluations table
        const evaluationId = await saveEvaluation(env.DB, evaluation);

        // Update lead record with AI score and label
        await updateLeadWithAiResult(env.DB, job.lead_id, evaluation);

        // Update job status to "completed"
        await updateJobStatus(env.DB, job.job_id, 'completed', {
          completed_at: new Date().toISOString(),
          evaluation_id: evaluationId
        });

        // ACK message (remove from queue)
        message.ack();

      } catch (error) {
        console.error(`Job ${job.job_id} failed:`, error);

        // Update job status to "failed"
        await updateJobStatus(env.DB, job.job_id, 'failed', {
          completed_at: new Date().toISOString(),
          error_code: error.code || 'UnknownError',
          error_message: error.message || 'An unknown error occurred',
          retry_count: message.attempts
        });

        // If max retries reached, send to DLQ
        if (message.attempts >= 3) {
          console.error(`Job ${job.job_id} exceeded max retries, moving to DLQ`);
          // Cloudflare Queues automatically moves to DLQ
        } else {
          // Retry (Cloudflare Queues handles this automatically)
          message.retry();
        }
      }
    }
  }
};

async function updateJobStatus(
  db: D1Database,
  jobId: string,
  status: string,
  updates: Record<string, any>
) {
  const setClauses = Object.keys(updates)
    .map(key => `${key} = ?`)
    .join(', ');

  const values = Object.values(updates);

  await db.prepare(`
    UPDATE ai_evaluation_jobs
    SET status = ?, ${setClauses}, updated_at = ?
    WHERE id = ?
  `).bind(status, ...values, new Date().toISOString(), jobId).run();
}

async function saveEvaluation(db: D1Database, evaluation: any): Promise<string> {
  const id = `eval_${generateId()}`;

  await db.prepare(`
    INSERT INTO lead_ai_evaluations (
      id, lead_id, score, label, summary, recommendation,
      risk_flags, fraud_signals, model_version, evaluated_at, site_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    evaluation.lead_id,
    evaluation.score,
    evaluation.label,
    evaluation.summary,
    evaluation.recommendation,
    JSON.stringify(evaluation.risk_flags),
    JSON.stringify(evaluation.fraud_signals),
    evaluation.model_version,
    new Date().toISOString(),
    evaluation.site_id
  ).run();

  return id;
}

async function updateLeadWithAiResult(
  db: D1Database,
  leadId: string,
  evaluation: any
) {
  await db.prepare(`
    UPDATE leads
    SET ai_score = ?, ai_label = ?, status = 'ai_evaluated', updated_at = ?
    WHERE id = ?
  `).bind(
    evaluation.score,
    evaluation.label,
    new Date().toISOString(),
    leadId
  ).run();
}
```

---

### Core Evaluator Logic

```typescript
// apps/ai-worker/lib/evaluator.ts

import { loadDocuments } from './document-loader';
import { buildPrompt } from './prompt-builder';
import { parseAiResponse } from './result-parser';

interface Env {
  AI: Ai;
  DB: D1Database;
  R2_PRIVATE: R2Bucket;
}

export async function evaluateLead(
  env: Env,
  leadId: string,
  siteId: string,
  modelVersion: string
) {
  // 1. Fetch lead record from D1
  const lead = await fetchLead(env.DB, leadId, siteId);
  if (!lead) {
    throw new Error('Lead not found');
  }

  // 2. Fetch associated documents from R2
  const documents = await loadDocuments(env.DB, env.R2_PRIVATE, leadId);
  if (documents.length === 0) {
    throw new Error('No documents found for lead');
  }

  // 3. Build AI prompt with lead info and documents
  const prompt = buildPrompt(lead, documents);

  // 4. Call Cloudflare Workers AI (multi-modal model)
  const aiResponse = await env.AI.run(modelVersion, {
    prompt,
    max_tokens: 2000,
    temperature: 0.1  // Low temperature for consistent results
  });

  // 5. Parse and validate AI response
  const evaluation = parseAiResponse(aiResponse, lead, modelVersion);

  return evaluation;
}

async function fetchLead(db: D1Database, leadId: string, siteId: string) {
  const result = await db.prepare(`
    SELECT * FROM leads WHERE id = ? AND site_id = ?
  `).bind(leadId, siteId).first();

  return result;
}
```

---

### Document Loader

```typescript
// apps/ai-worker/lib/document-loader.ts

export async function loadDocuments(
  db: D1Database,
  r2: R2Bucket,
  leadId: string
) {
  // Fetch file records from D1
  const fileRecords = await db.prepare(`
    SELECT * FROM lead_files WHERE lead_id = ? ORDER BY uploaded_at DESC
  `).bind(leadId).all();

  if (!fileRecords.results || fileRecords.results.length === 0) {
    throw new Error('InsufficientDocuments');
  }

  // Load file contents from R2
  const documents = await Promise.all(
    fileRecords.results.map(async (file) => {
      const r2Object = await r2.get(file.r2_key);
      if (!r2Object) {
        console.warn(`File not found in R2: ${file.r2_key}`);
        return null;
      }

      // For images, convert to base64 for AI model
      const arrayBuffer = await r2Object.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');

      return {
        file_type: file.file_type,
        file_name: file.file_name,
        mime_type: file.mime_type,
        content: base64,  // Multi-modal model can process base64 images
        uploaded_at: file.uploaded_at
      };
    })
  );

  return documents.filter(doc => doc !== null);
}
```

---

## Frontend Integration (Polling Pattern)

### User Flow

1. **User clicks "Run AI Evaluation"**
2. Frontend calls `POST /api/ops/leads/:leadId/ai-evaluation`
3. Backend creates job, returns `job_id` immediately
4. Frontend shows loading state: "AI is analyzing documents..."
5. Frontend **polls** `GET /api/ops/ai-evaluation-jobs/:jobId` every 2 seconds
6. When `status === 'completed'`, show results
7. If `status === 'failed'`, show error with retry option

### React Component Example

```typescript
// apps/ops/app/components/AiEvaluationButton.tsx

import { useState, useEffect } from 'react';

interface AiEvaluationButtonProps {
  leadId: string;
}

export function AiEvaluationButton({ leadId }: AiEvaluationButtonProps) {
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'pending' | 'processing' | 'completed' | 'failed'>('idle');
  const [evaluation, setEvaluation] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Start evaluation
  const handleRunEvaluation = async () => {
    try {
      const response = await fetch(`/api/ops/leads/${leadId}/ai-evaluation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force_refresh: false })
      });

      const data = await response.json();

      if (data.success) {
        setJobId(data.data.job_id);
        setStatus('pending');
      } else {
        setError(data.message);
        setStatus('failed');
      }
    } catch (err) {
      setError('Failed to start evaluation');
      setStatus('failed');
    }
  };

  // Poll for job status
  useEffect(() => {
    if (!jobId || status === 'completed' || status === 'failed') {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
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
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [jobId, status]);

  // Render UI based on status
  if (status === 'idle') {
    return (
      <button onClick={handleRunEvaluation} className="btn-primary">
        Run AI Evaluation
      </button>
    );
  }

  if (status === 'pending' || status === 'processing') {
    return (
      <div className="flex items-center gap-2">
        <Spinner />
        <span>AI is analyzing documents...</span>
      </div>
    );
  }

  if (status === 'completed' && evaluation) {
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
        {/* Show risk flags, fraud signals, etc. */}
      </div>
    );
  }

  if (status === 'failed') {
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

## Alternative: Server-Sent Events (SSE)

For real-time updates without polling, use **Server-Sent Events**:

### Backend SSE Endpoint

```typescript
// apps/worker/routes/ops.ts

app.get('/api/ops/ai-evaluation-jobs/:jobId/stream', async (c) => {
  const { jobId } = c.req.param();

  // Set SSE headers
  c.header('Content-Type', 'text/event-stream');
  c.header('Cache-Control', 'no-cache');
  c.header('Connection', 'keep-alive');

  const stream = new ReadableStream({
    async start(controller) {
      // Poll DB and send updates
      const interval = setInterval(async () => {
        const job = await getJobStatus(c.env.DB, jobId);

        // Send SSE event
        const data = JSON.stringify(job);
        controller.enqueue(`data: ${data}\n\n`);

        // Close stream when job is done
        if (job.status === 'completed' || job.status === 'failed') {
          clearInterval(interval);
          controller.close();
        }
      }, 1000);

      // Cleanup on client disconnect
      c.req.raw.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    }
  });

  return new Response(stream);
});
```

### Frontend SSE Consumer

```typescript
// React component using SSE
const eventSource = new EventSource(`/api/ops/ai-evaluation-jobs/${jobId}/stream`);

eventSource.onmessage = (event) => {
  const job = JSON.parse(event.data);
  setStatus(job.status);

  if (job.status === 'completed') {
    setEvaluation(job.evaluation);
    eventSource.close();
  } else if (job.status === 'failed') {
    setError(job.error_message);
    eventSource.close();
  }
};
```

---

## Error Handling & Retry Logic

### Retry Strategy

| Error Type | Retry? | Max Retries | Action |
|------------|--------|-------------|--------|
| `ModelTimeout` | ✅ Yes | 3 | Retry with exponential backoff |
| `ModelUnavailable` | ✅ Yes | 3 | Retry after 30s delay |
| `InsufficientDocuments` | ❌ No | 0 | Fail immediately, user must upload docs |
| `QuotaExceeded` | ❌ No | 0 | Fail immediately, user must upgrade |
| `InvalidDocument` | ❌ No | 0 | Fail immediately, user must re-upload |

### Dead Letter Queue (DLQ)

Jobs that fail after 3 retries are moved to a **Dead Letter Queue** for manual review:

```toml
# wrangler.toml
[[queues.consumers]]
queue = "ai-evaluation-queue"
max_retries = 3
dead_letter_queue = "ai-evaluation-dlq"
```

**Admin Dashboard** should show:
- DLQ job count
- Ability to manually inspect and retry DLQ jobs
- Alert when DLQ grows beyond threshold (e.g., >10 jobs)

---

## Performance & Scalability

### Expected Performance

| Metric | Target | Notes |
|--------|--------|-------|
| **Job Creation** | <200ms | CRUD worker creates job record + enqueues |
| **Queue Latency** | <1s | Time from enqueue to AI worker pickup |
| **AI Processing** | 5-10s | Workers AI inference time |
| **Total Time** | <15s | End-to-end (user click → results) |
| **Concurrent Jobs** | 100+ | AI worker can process many jobs in parallel |

### Scaling Considerations

1. **Queue Throughput**: Cloudflare Queues can handle 1000s of msgs/sec
2. **AI Worker Concurrency**: Set `max_batch_size = 1` to prevent rate limiting
3. **Database Connections**: D1 can handle high read/write loads
4. **R2 Bandwidth**: Presigned URLs offload file access from worker

---

## Cost Analysis (Async Architecture)

### Additional Costs

| Component | Free Tier | Cost Beyond Free Tier |
|-----------|-----------|----------------------|
| **Cloudflare Queues** | 1M operations/month | $0.40 per 1M operations |
| **AI Worker Invocations** | 100k requests/day | Included in Workers plan |
| **Workers AI** | 10k neurons/day | $0.011 per 1k neurons |

### Cost Per Evaluation (Async)

- Queue enqueue: ~0.001 cents
- Queue consume: ~0.001 cents
- AI Worker invocation: Free (within 100k/day)
- Workers AI: ~$0.0008 (75 neurons × $0.011/1k)
- **Total**: ~$0.001 per evaluation

**Conclusion**: Async architecture adds negligible cost (~0.1 cents per eval)

---

## Migration Plan

### Phase 1: Infrastructure Setup (Week 1)
- [ ] Create `ai_evaluation_jobs` table in D1
- [ ] Set up Cloudflare Queue (`ai-evaluation-queue`)
- [ ] Set up Dead Letter Queue (`ai-evaluation-dlq`)
- [ ] Create new AI worker project (`apps/ai-worker`)

### Phase 2: AI Worker Development (Week 2)
- [ ] Implement queue consumer handler
- [ ] Implement document loader (R2 integration)
- [ ] Implement AI evaluation logic (Workers AI)
- [ ] Implement result parser and validation
- [ ] Add error handling and retry logic

### Phase 3: CRUD Worker Integration (Week 3)
- [ ] Add job creation endpoint (`POST /api/ops/leads/:id/ai-evaluation`)
- [ ] Add job status endpoint (`GET /api/ops/ai-evaluation-jobs/:id`)
- [ ] Add quota checking logic
- [ ] Integrate with Cloudflare Queue producer
- [ ] Add retry endpoint

### Phase 4: Frontend Integration (Week 4)
- [ ] Build AI evaluation button component
- [ ] Implement polling logic (or SSE)
- [ ] Add loading states and progress indicators
- [ ] Add error handling and retry UI
- [ ] Add evaluation results display

### Phase 5: Testing & Optimization (Week 5)
- [ ] Load testing with 100 concurrent jobs
- [ ] Test retry logic with simulated failures
- [ ] Test DLQ behavior
- [ ] Optimize polling frequency
- [ ] Monitor queue latency and AI worker performance

---

## Monitoring & Observability

### Key Metrics to Track

1. **Job Throughput**
   - Jobs created per hour
   - Jobs completed per hour
   - Success rate (%)

2. **Processing Time**
   - P50, P95, P99 processing time
   - Queue latency (enqueue → pickup)
   - AI inference time

3. **Error Rates**
   - Failed jobs by error type
   - DLQ job count
   - Retry rate

4. **Cost Tracking**
   - Neurons used per day
   - Queue operations per day
   - Projected monthly cost

### Cloudflare Analytics Integration

```typescript
// Track metrics in AI worker
async function trackMetrics(env: Env, job: any, duration: number) {
  await env.ANALYTICS.writeDataPoint({
    blobs: [job.job_id, job.site_id],
    doubles: [duration, job.score || 0],
    indexes: [job.status]
  });
}
```

---

## Summary

### Key Benefits of Async Architecture

✅ **Separation of Concerns**: CRUD worker stays simple, AI worker handles complex processing
✅ **Scalability**: Queue-based design handles high load gracefully
✅ **Reliability**: Automatic retries, DLQ for failed jobs
✅ **User Experience**: Immediate response, real-time progress updates
✅ **Cost Control**: Quota enforcement before job creation
✅ **Observability**: Stateful jobs enable detailed monitoring

### Architecture Comparison

| Aspect | Sync (Old) | Async (New) |
|--------|-----------|-------------|
| **Response Time** | 5-15s (blocking) | <200ms (job created) |
| **Scalability** | Limited (blocking) | High (queue-based) |
| **Error Handling** | Basic retry | Automatic retry + DLQ |
| **User Feedback** | Spinner (no progress) | Real-time status updates |
| **Complexity** | Low | Medium (more components) |
| **Cost** | Same AI cost | +~$0.001 per eval (queue) |

**Recommendation**: Use **async architecture** for production deployment.

---

**Last Updated**: 2025-12-17
**Version**: 1.0
**Status**: Architecture Approved - Ready for Implementation
