# AI Tenant Intelligence - Implementation Tasks

**Bite-sized, focused guides optimized for vibe coding**

Each task is standalone, has clear objectives, and includes full implementation code.

---

## 📋 Task Overview

| Phase | Task | Time | Description |
|-------|------|------|-------------|
| **Phase 1: Infrastructure** ||||
| 1.1 | [Database Schema](./ai-task-1.1-database-schema.md) | 30min | Create DB tables for jobs & quotas |
| 1.2 | [Cron Worker Setup](./ai-task-1.2-cron-worker-setup.md) | 45min | New worker project with cron trigger |
| **Phase 2: Backend** ||||
| 2.1 | [Job Creation API](./ai-task-2.1-job-creation-api.md) | 1hr | POST endpoint to create jobs |
| 2.2 | [Job Status API](./ai-task-2.2-job-status-api.md) | 30min | GET endpoint for polling |
| 2.3 | [Cron Processor](./ai-task-2.3-cron-processor.md) | 2hr | Batch job processing logic |
| 2.4 | [AI Evaluation](./ai-task-2.4-ai-evaluation.md) | 2-3hr | Workers AI integration & scoring |

---

## 🚀 Getting Started

### Recommended Order

Follow tasks in numeric order. Each task builds on the previous:

```
1. Database Schema (1.1)
   ↓
2. Cron Worker Setup (1.2)
   ↓
3. Job Creation API (2.1)  ← CRUD worker
   ↓
4. Job Status API (2.2)    ← CRUD worker
   ↓
5. AI Evaluation Logic (2.4)  ← Can work in parallel with 2.3
   ↓
6. Cron Processor (2.3)    ← Ties everything together
```

**Total Backend Implementation Time**: ~8-10 hours

---

## 📦 What Each Task Includes

Every task guide contains:
- ✅ Clear objective and dependencies
- ✅ Full implementation code (copy-paste ready)
- ✅ Testing instructions
- ✅ Verification steps
- ✅ Link to next task

**No context switching needed** - each task is self-contained.

---

## 🎯 Task Details

### Phase 1: Infrastructure

#### [Task 1.1: Database Schema](./ai-task-1.1-database-schema.md)
Create two tables:
- `ai_evaluation_jobs` - Job state tracking
- `ai_evaluation_usage` - Quota management

**Output**: Migration SQL file ready to run

---

#### [Task 1.2: Cron Worker Setup](./ai-task-1.2-cron-worker-setup.md)
Bootstrap new worker project:
- `apps/ai-cron/` directory structure
- Cron trigger configuration (every hour)
- Wrangler bindings (D1, R2, Workers AI)

**Output**: Worker deployed and cron trigger active

---

### Phase 2: Backend

#### [Task 2.1: Job Creation API](./ai-task-2.1-job-creation-api.md)
CRUD worker endpoint:
- Check quota
- Create job record
- Return job ID immediately

**Output**: `POST /api/ops/leads/:id/ai-evaluation` working

---

#### [Task 2.2: Job Status API](./ai-task-2.2-job-status-api.md)
CRUD worker endpoint:
- Poll job status
- Return results when completed

**Output**: `GET /api/ops/ai-evaluation-jobs/:id` working

---

#### [Task 2.3: Cron Processor](./ai-task-2.3-cron-processor.md)
Cron worker logic:
- Load pending jobs from DB
- Process each job
- Update status & save results

**Output**: Hourly batch processing working

---

#### [Task 2.4: AI Evaluation](./ai-task-2.4-ai-evaluation.md)
AI integration:
- Build prompt
- Call Workers AI multi-modal model
- Parse response
- Calculate score & label
- Detect fraud signals

**Output**: AI evaluation function ready to use

---

## 🧪 Testing Strategy

Each task includes:
1. **Unit tests** - Test the function in isolation
2. **Integration tests** - Test with real DB/API calls
3. **Manual verification** - Quick smoke test

**Example flow test** (after all tasks):
```bash
# 1. Create job
curl -X POST .../leads/test123/ai-evaluation

# 2. Trigger cron manually
curl "http://localhost:8787/__scheduled?cron=0+*+*+*+*"

# 3. Poll for results
curl .../ai-evaluation-jobs/job_abc123

# Expected: status: "completed" + evaluation data
```

---

## ⚡ Quick Reference

### Key Files

| File | Purpose |
|------|---------|
| `apps/worker/migrations/XXXX_ai_evaluation_tables.sql` | Database schema |
| `apps/ai-cron/src/index.ts` | Cron main handler |
| `apps/ai-cron/src/lib/job-processor.ts` | Job processing logic |
| `apps/ai-cron/src/lib/ai-evaluator.ts` | AI evaluation function |
| `apps/worker/src/routes/ops/leads/ai-evaluation.ts` | CRUD endpoints |

### Key Commands

```bash
# Run DB migration
npx wrangler d1 execute leaselab-db --file=./migration.sql

# Deploy cron worker
cd apps/ai-cron && npm run deploy

# Tail logs
cd apps/ai-cron && npm run tail

# Manual cron trigger (local dev)
curl "http://localhost:8787/__scheduled?cron=0+*+*+*+*"
```

---

## 📚 Related Documentation

- **[Quick Reference Summary](../ai-tenant-intelligence-SUMMARY.md)** - Architecture overview
- **[Main README](../README-AI-Feature.md)** - Documentation index
- **[Cron Architecture](../prd-ai-cron-architecture.md)** - Deep dive
- **[Main PRD](../prd-ai-tenant-intelligence.md)** - Full requirements

---

## ❓ FAQ

**Q: Can I skip tasks?**
A: No - they build on each other. Follow in order.

**Q: Can I do tasks in parallel?**
A: Task 2.4 (AI Evaluation) can be done in parallel with 2.1-2.3 since it's a pure function.

**Q: What if I get stuck?**
A: Check the full PRD or architecture doc for context. Each task links to relevant sections.

**Q: How long does full implementation take?**
A: Backend: ~8-10 hours spread across tasks. Frontend: TBD (tasks coming soon).

---

**Ready?** Start with [Task 1.1: Database Schema](./ai-task-1.1-database-schema.md)
