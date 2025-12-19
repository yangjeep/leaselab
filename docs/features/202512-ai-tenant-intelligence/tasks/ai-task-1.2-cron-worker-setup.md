# Task 1.2: Cron Worker Setup

**Estimated Time**: 45 minutes
**Dependencies**: Task 1.1 (Database Schema)
**Files to Create**: `apps/ai-cron/` directory

---

## Objective

Create a new Cloudflare Worker that runs on a cron schedule (every hour) to process pending AI evaluation jobs.

---

## Directory Structure

```
apps/ai-cron/
├── package.json
├── tsconfig.json
├── wrangler.toml
└── src/
    ├── index.ts          # Main cron handler
    ├── types.ts          # TypeScript types
    └── lib/
        ├── job-processor.ts   # Job processing logic
        └── db.ts              # Database queries
```

---

## Step 1: Create Package Files

### `apps/ai-cron/package.json`

```json
{
  "name": "leaselab-ai-cron",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "tail": "wrangler tail"
  },
  "dependencies": {
    "@cloudflare/workers-types": "^4.20241127.0"
  },
  "devDependencies": {
    "typescript": "^5.3.3",
    "wrangler": "^3.94.0"
  }
}
```

### `apps/ai-cron/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "lib": ["ES2022"],
    "moduleResolution": "node",
    "types": ["@cloudflare/workers-types"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"]
}
```

---

## Step 2: Wrangler Configuration

### `apps/ai-cron/wrangler.toml`

```toml
name = "leaselab-ai-cron"
main = "src/index.ts"
compatibility_date = "2024-11-01"
compatibility_flags = ["nodejs_compat"]

# Cron trigger - runs every hour at :00
[triggers]
crons = ["0 * * * *"]

# Database binding
[[d1_databases]]
binding = "DB"
database_name = "leaselab-db"
database_id = "850dc940-1021-4c48-8d40-0f18992424ac"

# R2 storage binding
[[r2_buckets]]
binding = "R2_PRIVATE"
bucket_name = "leaselab-pri"

# Workers AI binding
[ai]
binding = "AI"

# Environment-specific config
[env.production]
# Production-specific settings

[env.preview]
# Preview environment
```

---

## Step 3: TypeScript Types

### `apps/ai-cron/src/types.ts`

```typescript
export interface Env {
  DB: D1Database;
  R2_PRIVATE: R2Bucket;
  AI: Ai;
}

export interface AIEvaluationJob {
  id: string;
  lead_id: string;
  site_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requested_by: string;
  requested_at: string;
  started_at: string | null;
  completed_at: string | null;
  evaluation_id: string | null;
  error_code: string | null;
  error_message: string | null;
  retry_count: number;
  max_retries: number;
  model_version: string;
  created_at: string;
  updated_at: string;
}

export interface UsageRecord {
  id: string;
  site_id: string;
  month: string;
  evaluation_count: number;
  quota_limit: number;
  tier: 'free' | 'pro' | 'enterprise';
}
```

---

## Step 4: Main Cron Handler

### `apps/ai-cron/src/index.ts`

```typescript
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
```

---

## Step 5: Job Processor Stub

### `apps/ai-cron/src/lib/job-processor.ts`

```typescript
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
```

---

## Step 6: Install Dependencies

```bash
cd apps/ai-cron
npm install
```

---

## Step 7: Test Locally

```bash
cd apps/ai-cron
npm run dev
```

To manually trigger the cron (for testing):
```bash
curl "http://localhost:8787/__scheduled?cron=0+*+*+*+*"
```

---

## Step 8: Deploy

```bash
cd apps/ai-cron
npm run deploy
```

---

## Verification

1. **Check deployment**:
   ```bash
   wrangler deployments list
   ```

2. **View logs**:
   ```bash
   npm run tail
   ```

3. **Verify cron trigger**:
   - Go to Cloudflare Dashboard → Workers → leaselab-ai-cron
   - Check "Triggers" tab → Should show "0 * * * *"

---

## Next Step

➡️ **[Task 2.1: Job Creation API](./ai-task-2.1-job-creation-api.md)**

Build the API endpoint that creates AI evaluation jobs in the CRUD worker.
