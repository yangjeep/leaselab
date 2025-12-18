# AI Tenant Intelligence - Quick Reference

**Status**: Ready for Implementation
**Architecture**: Cron Worker (Hourly Batch Processing)
**Last Updated**: 2025-12-17

---

## 🎯 What It Does

Automatically evaluates rental applicants using AI to:
- **Score** tenants 0-100 (100 = lowest risk)
- **Label** them A/B/C (A = strongly recommend, B = check further, C = no go)
- **Detect fraud** including "too good to be true" sophisticated scams
- **Explain decisions** for Fair Housing compliance

---

## 🏗️ Architecture (30-Second Overview)

```
Frontend → CRUD Worker (creates job) → DB (job_status: pending)
                                        ↓
                                   Cron Worker (runs hourly)
                                        ↓
                                   Processes jobs → Workers AI → Updates DB
                                        ↓
Frontend (polls) → Shows results
```

**Why Cron Worker?**
- ✅ Simplest (just cron trigger + DB table)
- ✅ FREE (cron triggers have NO limits)
- ✅ Future-proof (no service usage caps)

📄 **Full architecture**: [prd-ai-cron-architecture.md](./prd-ai-cron-architecture.md)

---

## 📊 3-Tier Labeling System

| Label | Score | Meaning | Action |
|-------|-------|---------|--------|
| **A** | 80-100 | Strongly Recommend | Move quickly to secure tenant |
| **B** | 50-79 | Check Further / Keep Warm | Promising but needs verification |
| **C** | 0-49 | No Go | Reject or significant red flags |

**Fraud Detection**:
- **Obvious**: Forged docs, altered paystubs → Auto-reject
- **Sophisticated**: "Too perfect" documents, unusually high income → Verify first

---

## 🛠️ Implementation Tasks

Each task is a standalone guide optimized for vibe coding:

### Phase 1: Database & Infrastructure
- **[Task 1.1: Database Schema](./tasks/ai-task-1.1-database-schema.md)** - Create tables
- **[Task 1.2: Cron Worker Setup](./tasks/ai-task-1.2-cron-worker-setup.md)** - New worker project

### Phase 2: Backend Logic
- **[Task 2.1: Job Creation API](./tasks/ai-task-2.1-job-creation-api.md)** - POST endpoint
- **[Task 2.2: Job Status API](./tasks/ai-task-2.2-job-status-api.md)** - GET endpoint
- **[Task 2.3: Cron Job Processor](./tasks/ai-task-2.3-cron-processor.md)** - Batch processing
- **[Task 2.4: AI Evaluation Logic](./tasks/ai-task-2.4-ai-evaluation.md)** - Workers AI integration
- **[Task 2.5: Quota Management](./tasks/ai-task-2.5-quota-management.md)** - Usage tracking

### Phase 3: Frontend
- **[Task 3.1: Evaluation Button](./tasks/ai-task-3.1-evaluation-button.md)** - UI component
- **[Task 3.2: Polling & Results](./tasks/ai-task-3.2-polling-results.md)** - Real-time updates
- **[Task 3.3: Results Display](./tasks/ai-task-3.3-results-display.md)** - Score/label UI

### Phase 4: Testing & Deployment
- **[Task 4.1: Testing](./tasks/ai-task-4.1-testing.md)** - Load tests & fraud samples
- **[Task 4.2: Deployment](./tasks/ai-task-4.2-deployment.md)** - Wrangler deploy

---

## 🔑 Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Architecture** | Cron Worker | Simplest, free, no limits |
| **AI Model** | LLaMA 3.2 11B Vision | Multi-modal (no OCR needed) |
| **Processing** | Async (batch hourly) | Better UX than blocking requests |
| **State Management** | Simple DB table | No complex Queue/Workflow setup |
| **Quota** | 20 evals/site/month | Stay under free tier |

---

## 📐 Database Schema (Quick Reference)

```sql
-- Job tracking
CREATE TABLE ai_evaluation_jobs (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL,
  site_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | processing | completed | failed
  requested_by TEXT NOT NULL,
  requested_at TEXT NOT NULL,
  evaluation_id TEXT,  -- FK to results
  error_code TEXT,
  retry_count INTEGER DEFAULT 0
);

-- Usage tracking
CREATE TABLE ai_evaluation_usage (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  month TEXT NOT NULL,  -- 'YYYY-MM'
  evaluation_count INTEGER DEFAULT 0,
  quota_limit INTEGER DEFAULT 20
);
```

📄 **Full schema**: [Task 1.1](./tasks/ai-task-1.1-database-schema.md)

---

## 🔌 API Endpoints (Quick Reference)

### Create Job (Async)
```typescript
POST /api/ops/leads/:leadId/ai-evaluation
→ Returns: { job_id, status: 'pending' }
```

### Check Status (Polling)
```typescript
GET /api/ops/ai-evaluation-jobs/:jobId
→ Returns: { status, evaluation: {...} } // when completed
```

📄 **Full API spec**: Main PRD Section 8

---

## 💰 Cost & Quotas

| Site Type | Evals/Month | Cost |
|-----------|-------------|------|
| Free Tier | 20 | $0 |
| Pro | 100 | ~$5 |
| Enterprise | 500+ | Custom |

**Free Tier Strategy**: 20 evals/site/month stays well under 10k neurons/day limit

---

## 📋 Compliance Checklist

- ✅ No protected class data (race, religion, family status, etc.)
- ✅ Human-readable explanations for all decisions
- ✅ Full audit trail in `ai_evaluation_audit` table
- ✅ Manual override capability with justification required

📄 **Full compliance**: Main PRD Appendix A

---

## 📖 Full Documentation

| Document | Purpose | When to Use |
|----------|---------|-------------|
| **This file** | Quick reference | Always start here |
| [prd-ai-tenant-intelligence.md](./prd-ai-tenant-intelligence.md) | Comprehensive PRD (68 pages) | Deep dive on requirements |
| [prd-ai-cron-architecture.md](./prd-ai-cron-architecture.md) | Architecture details | Implementation planning |
| [tasks/ai-task-*.md](./tasks/) | Bite-sized implementation guides | Vibe coding sessions |

---

## 🚦 Getting Started

**For Product/Business**:
1. Read this summary
2. Review [3-tier labeling system](#-3-tier-labeling-system)
3. Check [cost projections](#-cost--quotas)

**For Engineering**:
1. Read this summary
2. Review [architecture diagram](#️-architecture-30-second-overview)
3. Start with [Task 1.1: Database Schema](./tasks/ai-task-1.1-database-schema.md)
4. Follow tasks in order

**For Legal/Compliance**:
1. Read [compliance checklist](#-compliance-checklist)
2. Review main PRD Appendix A

---

## ❓ FAQ

**Q: Why not use Workflows or Queues?**
A: Cron worker is simpler and has no service limits. Workflows have 10M steps/month cap, Queues have 1M ops/month cap. Cron triggers are unlimited and free.

**Q: Why hourly processing instead of real-time?**
A: Simpler architecture, batch-efficient, and users don't need instant results. 1-hour SLA is acceptable for screening decisions.

**Q: What if we exceed quota?**
A: API returns clear error with upgrade path. No silent failures.

**Q: How do we detect fraud?**
A: Multi-modal AI visually inspects documents for alterations, font mismatches, pixelated logos, and "too perfect" patterns.

---

**Ready to implement?** Start with [Task 1.1: Database Schema](./tasks/ai-task-1.1-database-schema.md)
