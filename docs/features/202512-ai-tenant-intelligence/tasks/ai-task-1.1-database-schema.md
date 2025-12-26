# Task 1.1: Database Schema Setup

**Estimated Time**: 30 minutes
**Dependencies**: None
**Files to Modify**: New migration file in `apps/worker/migrations/`

---

## Objective

Create database tables for AI evaluation job tracking and usage quota management.

---

## Tables to Create

### 1. `ai_evaluation_jobs` - Job State Tracking

Tracks async AI evaluation jobs from creation to completion.

```sql
CREATE TABLE ai_evaluation_jobs (
  -- Primary
  id TEXT PRIMARY KEY,                    -- 'job_abc123'
  lead_id TEXT NOT NULL,
  site_id TEXT NOT NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'processing' | 'completed' | 'failed'

  -- Request metadata
  requested_by TEXT NOT NULL,             -- User ID who clicked button
  requested_at TEXT NOT NULL,             -- ISO timestamp

  -- Processing metadata
  started_at TEXT,                        -- When cron picked up job
  completed_at TEXT,                      -- When finished

  -- Results
  evaluation_id TEXT,                     -- FK to lead_ai_evaluations
  error_code TEXT,                        -- 'QuotaExceeded', 'ModelTimeout', etc.
  error_message TEXT,

  -- Retry logic
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,

  -- Model version tracking
  model_version TEXT NOT NULL DEFAULT '@cf/meta/llama-3.2-11b-vision-instruct',

  -- Timestamps
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
CREATE INDEX idx_ai_jobs_lead_status ON ai_evaluation_jobs(lead_id, status);
```

### 2. `ai_evaluation_usage` - Quota Tracking

Tracks monthly usage per site to enforce free tier limits.

```sql
CREATE TABLE ai_evaluation_usage (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  month TEXT NOT NULL,                    -- 'YYYY-MM'

  -- Usage tracking
  evaluation_count INTEGER NOT NULL DEFAULT 0,
  quota_limit INTEGER NOT NULL DEFAULT 20,  -- Free tier: 20/month
  tier TEXT NOT NULL DEFAULT 'free',        -- 'free' | 'pro' | 'enterprise'

  -- Timestamps
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  UNIQUE(site_id, month)  -- One row per site per month
);

CREATE INDEX idx_ai_usage_site_month ON ai_evaluation_usage(site_id, month);
```

---

## Migration File

Create: `apps/worker/migrations/XXXX_ai_evaluation_tables.sql`

```sql
-- Migration: AI Evaluation Tables
-- Created: 2025-12-17
-- Description: Tables for async AI evaluation jobs and quota tracking

-- Job tracking table
CREATE TABLE ai_evaluation_jobs (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL,
  site_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_by TEXT NOT NULL,
  requested_at TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT,
  evaluation_id TEXT,
  error_code TEXT,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  model_version TEXT NOT NULL DEFAULT '@cf/meta/llama-3.2-11b-vision-instruct',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (lead_id) REFERENCES leads(id),
  FOREIGN KEY (evaluation_id) REFERENCES lead_ai_evaluations(id)
);

CREATE INDEX idx_ai_jobs_lead_id ON ai_evaluation_jobs(lead_id);
CREATE INDEX idx_ai_jobs_site_id ON ai_evaluation_jobs(site_id);
CREATE INDEX idx_ai_jobs_status ON ai_evaluation_jobs(status);
CREATE INDEX idx_ai_jobs_requested_at ON ai_evaluation_jobs(requested_at DESC);
CREATE INDEX idx_ai_jobs_lead_status ON ai_evaluation_jobs(lead_id, status);

-- Usage tracking table
CREATE TABLE ai_evaluation_usage (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  month TEXT NOT NULL,
  evaluation_count INTEGER NOT NULL DEFAULT 0,
  quota_limit INTEGER NOT NULL DEFAULT 20,
  tier TEXT NOT NULL DEFAULT 'free',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(site_id, month)
);

CREATE INDEX idx_ai_usage_site_month ON ai_evaluation_usage(site_id, month);
```

---

## Run Migration

```bash
# Local development
npx wrangler d1 execute leaselab-db --local --file=./apps/worker/migrations/XXXX_ai_evaluation_tables.sql

# Production
npx wrangler d1 execute leaselab-db --file=./apps/worker/migrations/XXXX_ai_evaluation_tables.sql
```

---

## Verification

After running migration, verify tables exist:

```bash
npx wrangler d1 execute leaselab-db --local --command="SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'ai_%'"
```

Expected output:
```
ai_evaluation_jobs
ai_evaluation_usage
```

---

## Next Step

➡️ **[Task 1.2: Cron Worker Setup](./ai-task-1.2-cron-worker-setup.md)**
