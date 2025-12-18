# AI Tenant Intelligence

**Status**: Ready for Implementation  
**Architecture**: Cron Worker (Hourly Batch Processing)  
**Last Updated**: 2025-12-17

---

## One-Page Summary

AI Tenant Intelligence automatically evaluates rental applicants using multi-modal Workers AI to:
- **Score** tenants 0-100 (100 = lowest risk)
- **Label** them A/B/C (A = strongly recommend, B = keep warm, C = no go)
- **Explain decisions** for Fair Housing compliance with clear summaries + risk flags
- **Detect fraud** signals ranging from forged paystubs to "too perfect" document sets

**Tenant Label Matrix**

| Label | Score | Meaning | Recommended Action |
|-------|-------|---------|--------------------|
| **A** | 80-100 | Strongly Recommend | Move quickly to secure tenant |
| **B** | 50-79 | Check Further / Keep Warm | Verify a few items, then proceed |
| **C** | 0-49 | No Go | Reject or request major remediation |

**Cost Guardrails**: 20 evaluations/site/month (Free) → 100 (Pro) → Custom (Enterprise). Cron usage plus LLaMA 3.2 11B Vision keeps us inside Workers AI free tier.

---

## Architecture Snapshot (Cron Worker)

```
Frontend → CRUD Worker → ai_evaluation_jobs (status: pending)
                                  ↓
                           Cron Worker (hourly)
                                  ↓
                        Workers AI → lead_ai_evaluations
                                  ↓
                           Frontend polls status
```

**Why Cron Worker**

| Reason | Benefit |
|--------|---------|
| Zero-cost triggers | Unlimited hourly runs without quotas |
| Simple state | One D1 table (`ai_evaluation_jobs`) tracks pending → completed |
| Batch-friendly | Process up to 100 jobs/run + skip duplicates via MD5 fingerprints |
| Isolation | CRUD worker stays fast; cron does heavy AI work |

See `01-prd-complete.md` → *Technical Architecture* for the deep dive diagram + dedup module details.

---

## Implementation Flow

1. **Read this README (5 min)** to understand outcomes, architecture, and task order.
2. **Dive into the PRD** (`01-prd-complete.md`) only if you need the full business context, compliance appendix, or schema diffs.
3. **Build via tasks** – each markdown under `tasks/` is standalone with copy/paste code, tests, and verification steps.
4. **Use the checklist** (below) to track progress across the cron worker, APIs, AI integration, and dedup guardrails.

This approach collapses six previous docs (00, 02, 99, README, tasks/README, and scattered notes) into this single hub + the authoritative PRD.

---

## Document Map

| Document | Purpose |
|----------|---------|
| `README.md` *(this file)* | Quick reference, architecture snapshot, workflow, tasks checklist |
| `01-prd-complete.md` | Canonical PRD covering requirements, schema, APIs, dedup module, compliance |
| `tasks/ai-task-*.md` | Focused build guides (see checklist) |
| `archive/` | Deprecated architectures (Workflows, Queues) for historical context |

---

## Task Checklist

> ✅ Tip: Follow phases in order; each item links directly to its guide.

### Phase 1 – Infrastructure
- [ ] [Task 1.1: Database Schema](./tasks/ai-task-1.1-database-schema.md) – Create `ai_evaluation_jobs`, `ai_evaluation_usage`, fingerprint tables, and add `md5_hash` fields.
- [ ] [Task 1.2: Cron Worker Setup](./tasks/ai-task-1.2-cron-worker-setup.md) – Scaffold `leaselab-ai-cron`, bind D1/R2/AI, configure hourly trigger.

### Phase 2 – Backend APIs & Logic
- [ ] [Task 2.1: Job Creation API](./tasks/ai-task-2.1-job-creation-api.md) – POST endpoint, quota check, document fingerprint guard, queue job.
- [ ] [Task 2.2: Job Status API](./tasks/ai-task-2.2-job-status-api.md) – GET endpoint for polling + duplicate response surface.
- [ ] [Task 2.3: Cron Processor](./tasks/ai-task-2.3-cron-processor.md) – Batch pending jobs, re-check quota, update states, record evaluations.
- [ ] [Task 2.4: AI Evaluation Logic](./tasks/ai-task-2.4-ai-evaluation.md) – Multi-modal prompt, fraud flag parsing, recommendation logic.
### Phase 3 – Frontend Pane & Controls
- [ ] [Task 3.1: Tenant Detail AI Evaluation Pane](./tasks/ai-task-3.1-tenant-pane.md) – Slide-over UI, job creation, polling, activity log.
- [ ] [Task 3.2: Quota & Settings Section](./tasks/ai-task-3.2-quota-settings-pane.md) – Quota meter, upgrade CTA, and AI settings form.

### Phase 4 – Testing & Deployment
- [ ] [Task 4.2: Deployment & Verification](./tasks/ai-task-4.2-deployment.md) – Deploy CRUD worker, cron worker, and Ops UI; run smoke tests.

Use this checklist to track implementation progress in GitHub issues, Notion, or by simply checking boxes inside this file.

---

## Need More Detail?

- **Deep requirements, personas, KPIs, appendices** → `01-prd-complete.md`
- **Historical architectures (Workflows, Queues)** → `archive/`
- **Per-task copy/paste code** → `tasks/`

Ping #ai-tenant-intelligence on Slack for open questions.
