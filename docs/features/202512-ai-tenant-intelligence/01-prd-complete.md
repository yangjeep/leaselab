# PRD: AI Tenant Intelligence
**AI自动租客风险排序与解释系统**

---

## Document Metadata

| Field | Value |
|-------|-------|
| **Document Type** | Product Requirements Document (PRD) |
| **Feature Name** | AI Tenant Intelligence |
| **Version** | 1.0 (Draft) |
| **Created** | 2025-12-17 |
| **Owner** | Product Team |
| **Status** | Draft - Pending Approval |
| **Target Release** | TBD |

---

## Executive Summary

**AI Tenant Intelligence** is a Cloudflare Workers AI-powered system that automatically evaluates tenant applications, ranks candidates by risk level, and provides explainable recommendations to landlords. The system enables property managers to quickly identify the best tenant candidates while maintaining full compliance records and audit trails.

### Key Benefits
- **Speed**: Automated risk assessment in seconds vs. hours of manual review
- **Consistency**: Standardized evaluation criteria across all applications
- **Compliance**: Full audit trail with explainable decision-making
- **Risk Mitigation**: Early detection of fraud signals and red flags
- **Cost Control**: Usage caps per site and user with free tier optimization

---

## Problem Statement

### Current Pain Points

1. **Manual Application Review is Time-Consuming**
   - Landlords spend 30-60 minutes per application reviewing documents
   - High volume of applications makes it difficult to compare candidates objectively
   - No standardized scoring system leads to inconsistent decisions

2. **Risk Assessment is Subjective**
   - Gut feelings rather than data-driven decisions
   - Difficult to identify fraud or forged documents
   - Hard to explain rejection decisions to applicants (compliance risk)

3. **No Prioritization System**
   - All applications appear equal in the queue
   - Best candidates may be missed while reviewing mediocre ones
   - No way to quickly triage high-quality vs. problematic applications

4. **Compliance Burden**
   - Manual notes are inconsistent and hard to audit
   - Risk of discrimination claims without documented criteria
   - Difficult to prove fair housing compliance

### Success Metrics

| Metric | Baseline (Manual) | Target (AI-Enabled) |
|--------|-------------------|---------------------|
| Time to evaluate application | 30-60 min | < 30 seconds |
| Applications reviewed per hour | 1-2 | 20+ |
| Fraud detection rate | ~5% (manual catch) | 15-20% |
| Landlord confidence in decisions | Medium | High |
| Compliance documentation | Incomplete | 100% complete |

---

## User Personas

### Primary Users

1. **Property Manager (Admin)**
   - Manages 5-20 properties
   - Reviews 20-50 applications per month
   - Needs: Fast triage, clear recommendations, compliance records
   - Pain: Overwhelmed by volume, afraid of making bad decisions

2. **Landlord (Manager)**
   - Owns 1-3 properties
   - Reviews 5-10 applications per month
   - Needs: Simple explanations, risk warnings, time savings
   - Pain: Lacks experience evaluating tenants, fears rental scams

3. **Super Admin**
   - Manages multiple customer sites
   - Monitors system-wide AI usage
   - Needs: Cost control, usage analytics, quality monitoring
   - Pain: Budget constraints, need to stay within free tier

### Secondary Users

4. **Tenant Applicant**
   - Submits rental application with documents
   - Needs: Fair evaluation, timely response, clear feedback
   - Pain: Anxiety about application status, unexplained rejections

---

## Product Requirements

### Functional Requirements

#### FR-1: AI Evaluation Engine (Core)

**Priority**: P0 (Must-Have)

The system SHALL automatically evaluate tenant applications using Cloudflare Workers AI and provide a risk score, label, and recommendation.

**Acceptance Criteria**:
- [x] System accepts lead ID and retrieves all associated documents from R2
- [x] **Multi-modal AI model** analyzes documents directly (images + PDFs) without separate OCR step
- [x] System generates:
  - Risk score (0-100, where 100 = lowest risk)
  - Risk label ('A' = strongly recommend, 'B' = check further/keep warm, 'C' = no go)
  - Recommendation ('approve', 'approve_with_conditions', 'approve_with_verification', 'reject')
  - Summary explanation (2-3 sentences)
  - Risk flags array (JSON)
  - Fraud signals array (JSON, including "too good to be true" scenarios)
- [x] Results saved to `lead_ai_evaluations` table with model version tracking
- [x] Lead status updated from `documents_received` → `ai_evaluating` → `ai_evaluated`

**Technical Approach** (Workflows):

📄 **See full workflow architecture**: [AI Workflow Architecture](./prd-ai-workflow-architecture.md)

```typescript
// STEP 1: Frontend triggers workflow (CRUD Worker)
POST /api/ops/leads/:id/ai-evaluation

Process (CRUD Worker):
1. Check quota (ai_evaluation_usage table)
2. If quota exceeded → return error
3. Trigger Cloudflare Workflow via workflow.create()
4. Get workflow instance ID
5. Increment usage counter
6. Return instance_id immediately (don't wait for AI)

Output (Immediate - <100ms):
{
  success: true,
  data: {
    instance_id: 'wf_abc123def456',  // Workflow instance ID
    lead_id: 'lead_xyz789',
    status: 'queued',
    requested_at: '2025-12-17T10:00:00Z'
  }
}

// STEP 2: Workflow executes (Background - Durable)
Cloudflare Workflow steps (automatic):
Step 1: Fetch lead record from D1
Step 2: Load documents from R2
Step 3: Call Workers AI (multi-modal model)
Step 4: Parse AI response
Step 5: Save to lead_ai_evaluations table
Step 6: Update lead.ai_score, lead.ai_label, lead.status
Step 7: Email user (placeholder for future)

Each step retries independently on failure (3x with exponential backoff)

// STEP 3: Frontend polls workflow status
GET /api/ops/ai-workflows/:instanceId

Output (When completed - 5-15s later):
{
  success: true,
  data: {
    instance_id: 'wf_abc123def456',
    status: 'complete',  // Workflow status
    completed_at: '2025-12-17T10:00:12Z',
    output: {
      evaluation_id: 'eval_def456',
      score: 82,
      label: 'A',
      recommendation: 'approve',
      summary: '...',
      risk_flags: [...],
      fraud_signals: []
    }
  }
}
```

#### FR-2: Document Intelligence (Multi-Modal Analysis)

**Priority**: P0 (Must-Have)

The system SHALL use a **multi-modal AI model** to extract structured data directly from document images/PDFs without separate OCR preprocessing.

**Acceptance Criteria**:
- [x] System uses vision-capable model (e.g., LLaMA 3.2 11B Vision) to read documents directly
- [x] Single-pass analysis extracts key fields AND detects fraud simultaneously:
  - From Government ID: Name, DOB, Address, ID number, authenticity indicators
  - From Paystubs: Employer name, gross income, YTD earnings, pay period, formatting quality
  - From Bank Statements: Account balance, transaction history, NSF flags, bank logo verification
  - From Employment Letters: Job title, salary, employment status, start date, letterhead quality
- [x] System validates consistency:
  - Name matches across all documents
  - Income from paystub matches employment letter (±10%)
  - Bank balance supports claimed income level
  - Document formatting matches known authentic templates
- [x] System flags discrepancies AND "too good to be true" scenarios as risk signals

**Why Multi-Modal** (No Separate OCR):
- ✅ Faster: Single API call instead of OCR → text analysis pipeline
- ✅ More accurate: Vision models detect visual fraud signals (altered fonts, pixelation)
- ✅ Simpler architecture: No OCR preprocessing step to maintain
- ✅ Cost-effective: One model call instead of two (OCR + LLM)

**Document Type Handling**:
| Document Type | Required Fields | Validation Rules |
|---------------|----------------|------------------|
| `government_id` | Name, DOB, Address | Name must match lead record |
| `paystub` | Employer, Gross Pay, Pay Period | Income ≥ 3x monthly rent |
| `bank_statement` | Balance, Transaction History | Balance > security deposit |
| `employment_letter` | Job Title, Salary, Status | Salary matches paystub ±10% |
| `tax_return` | AGI, Filing Status | AGI supports claimed income |

#### FR-3: Risk Scoring Algorithm

**Priority**: P0 (Must-Have)

The system SHALL calculate a composite risk score based on multiple weighted factors.

**Scoring Factors** (Total = 100 points):

| Factor | Weight | Criteria |
|--------|--------|----------|
| **Income Verification** | 30 pts | - Income ≥ 3x rent: 30 pts<br>- Income 2.5-3x rent: 20 pts<br>- Income 2-2.5x rent: 10 pts<br>- Income < 2x rent: 0 pts |
| **Employment Stability** | 20 pts | - Employed full-time > 2 years: 20 pts<br>- Employed full-time < 2 years: 15 pts<br>- Self-employed with proof: 10 pts<br>- Unemployed/Student: 5 pts |
| **Document Completeness** | 15 pts | - All required docs: 15 pts<br>- Missing 1 doc: 10 pts<br>- Missing 2+ docs: 5 pts |
| **Document Authenticity** | 15 pts | - No fraud signals: 15 pts<br>- 1 minor signal: 10 pts<br>- 2+ signals: 0 pts |
| **Financial Health** | 10 pts | - Savings ≥ 6 months rent: 10 pts<br>- Savings 3-6 months: 7 pts<br>- Savings < 3 months: 3 pts |
| **Application Quality** | 10 pts | - Complete profile, no typos: 10 pts<br>- Minor issues: 5 pts<br>- Sloppy/incomplete: 0 pts |

**Risk Labels** (Simplified 3-Tier System):
- **A (Strongly Recommend)**: 80-100 points - High-quality candidate, move quickly
- **B (Check Further, Keep Warm)**: 50-79 points - Promising but needs additional verification
- **C (No Go)**: 0-49 points - Recommend reject or significant red flags

**Recommendation Logic**:
```typescript
// Check for "too good to be true" scenarios first
if (score >= 95 && hasSuspiciouslyPerfectDocuments()) {
  return 'approve_with_verification'; // Flag for manual review
}

// Standard scoring
if (score >= 80) return 'approve';
if (score >= 50) return 'approve_with_conditions';
return 'reject';

// Override if fraud signals detected
if (fraud_signals.length > 0 && fraud_signals.includes('forged_document')) {
  return 'reject';
}

// "Too good to be true" flags
if (fraud_signals.includes('too_perfect_documents') ||
    fraud_signals.includes('unusually_high_income')) {
  return 'approve_with_verification'; // Requires extra scrutiny
}
```

#### FR-4: Explainability & Compliance

**Priority**: P0 (Must-Have)

The system SHALL provide human-readable explanations for all AI decisions to ensure Fair Housing compliance.

**Acceptance Criteria**:
- [x] Every evaluation includes a `summary` field (2-3 sentences)
- [x] Risk flags are categorized and explained:
  - `income_insufficient` - "Monthly income is only 2.1x the rent (recommended: 3x)"
  - `employment_unstable` - "Applicant has been at current job for only 4 months"
  - `documents_incomplete` - "Missing bank statement and employment letter"
  - `fraud_signal_detected` - "Paystub appears digitally altered"
- [x] System generates a compliance report for rejected applications showing:
  - Objective criteria used (income ratio, employment length, etc.)
  - No protected class information used (race, religion, family status, etc.)
  - Fair Housing Act compliance statement
- [x] All evaluation data stored permanently in `lead_ai_evaluations` table

**Example Output**:
```json
{
  "score": 72,
  "label": "B",
  "recommendation": "approve_with_conditions",
  "summary": "Promising candidate with verified employment and income 3.2x monthly rent. Bank statements show healthy savings. Recommend standard approval, but note: only 8 months at current job (verify job stability).",
  "risk_flags": [
    "employment_duration_short"
  ],
  "fraud_signals": [],
  "compliance_notes": "Evaluation based solely on financial qualifications and document verification. No protected class information considered."
}
```

#### FR-5: Usage Caps & Quota Management

**Priority**: P0 (Must-Have)

The system SHALL enforce per-site and per-user usage limits to control costs and prevent abuse.

**Acceptance Criteria**:
- [x] New table: `ai_evaluation_usage` tracks monthly usage per site
- [x] Default quota tiers:
  - **Free Tier**: 20 evaluations per site per month
  - **Pro Tier**: 100 evaluations per site per month
  - **Enterprise**: Unlimited (or 1000+)
- [x] Super Admin quota: Aggregate across all sites ≤ Free Tier limit for Cloudflare Workers AI
- [x] System checks quota before evaluation:
  - If quota exceeded → return error with upgrade prompt
  - If within quota → proceed and increment counter
- [x] Usage resets on 1st of each month (UTC)
- [x] UI shows remaining quota in admin dashboard

**Database Schema**:
```sql
CREATE TABLE ai_evaluation_usage (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  month TEXT NOT NULL, -- Format: 'YYYY-MM'
  evaluation_count INTEGER NOT NULL DEFAULT 0,
  quota_limit INTEGER NOT NULL DEFAULT 20,
  tier TEXT NOT NULL DEFAULT 'free', -- 'free', 'pro', 'enterprise'
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(site_id, month)
);

-- Index for fast quota checks
CREATE INDEX idx_ai_usage_site_month ON ai_evaluation_usage(site_id, month);
```

**Quota Check Logic**:
```typescript
async function checkAndIncrementQuota(siteId: string): Promise<{ allowed: boolean, remaining: number }> {
  const currentMonth = new Date().toISOString().slice(0, 7); // 'YYYY-MM'

  // Get or create usage record
  let usage = await getUsageForMonth(siteId, currentMonth);
  if (!usage) {
    usage = await createUsageRecord(siteId, currentMonth);
  }

  // Check limit
  if (usage.evaluation_count >= usage.quota_limit) {
    return { allowed: false, remaining: 0 };
  }

  // Increment and save
  await incrementUsageCount(usage.id);
  return {
    allowed: true,
    remaining: usage.quota_limit - usage.evaluation_count - 1
  };
}
```

#### FR-6: UI Integration (Ops Dashboard)

**Priority**: P1 (Should-Have for MVP)

The admin dashboard SHALL display AI evaluation results and allow manual overrides.

**Acceptance Criteria**:
- [x] Lead list view shows AI label badge ('A', 'B', 'C', 'D') and score
- [x] Leads are sortable by AI score (highest first by default)
- [x] Lead detail page shows:
  - "Run AI Evaluation" button (if not yet evaluated)
  - AI score gauge (0-100 with color coding)
  - Risk label badge with color (A=green, B=blue, C=yellow, D=red)
  - Summary explanation
  - Risk flags list with icons
  - Fraud signals (if any) with warning icons
  - Recommendation chip ('Approve', 'Approve with Conditions', 'Reject')
  - Timestamp of evaluation
- [x] Manual override option:
  - Landlord can change recommendation with required note
  - Override logged in `landlord_note` field
  - AI evaluation preserved for audit

**UI Mockup** (Lead Detail Page):
```
┌─────────────────────────────────────────────────────────┐
│ Lead: John Doe                         Status: AI Evaluated │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  AI EVALUATION                         [Re-evaluate]      │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Score: 82/100    Label: A (Strongly Recommend)  │    │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │    │
│  │           ↑ (82% - Green zone)                   │    │
│  │                                                   │    │
│  │  Recommendation: APPROVE ✓                      │    │
│  │                                                   │    │
│  │  Summary:                                        │    │
│  │  Strong candidate with verified income 3.1x rent.│    │
│  │  Stable employment history and good financial    │    │
│  │  health. Minor: Only 9 months at current job.    │    │
│  │                                                   │    │
│  │  Risk Flags:                                     │    │
│  │  ⚠️ employment_duration_short                    │    │
│  │                                                   │    │
│  │  Evaluated: 2025-12-17 10:23 AM                  │    │
│  │  Model: workers-ai/llama-3.2-11b-vision-instruct │    │
│  └─────────────────────────────────────────────────┘    │
│                                                           │
│  Override AI Recommendation?                              │
│  [ ] Approve  [ ] Reject  [Text area for note]           │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

### Non-Functional Requirements

#### NFR-1: Performance

- AI evaluation SHALL complete within 10 seconds (P95)
- API endpoint SHALL return within 15 seconds (P99)
- Quota check SHALL complete within 100ms

#### NFR-2: Security

- Document URLs SHALL use presigned R2 URLs with 5-minute expiration
- AI prompts SHALL NOT include PII beyond what's necessary for evaluation
- All AI evaluations SHALL be logged with site_id and user_id for audit
- API keys for Workers AI SHALL be stored as Wrangler secrets (not in code)

#### NFR-3: Cost Control

- Super Admin total usage SHALL stay within Cloudflare Workers AI free tier (10,000 neurons per day)
- System SHALL throttle requests if approaching daily limit
- Monitoring alert when usage reaches 80% of free tier

#### NFR-4: Reliability

- System SHALL handle AI service failures gracefully (return error, don't crash)
- Failed evaluations SHALL be retryable
- System SHALL support multiple AI model versions simultaneously

#### NFR-5: Compliance

- All data retention SHALL comply with Fair Housing Act requirements
- System SHALL NOT use protected class information (race, religion, family status, disability, national origin)
- Evaluation explanations SHALL be human-readable and defensible

---

## Technical Architecture

**IMPORTANT**: This feature uses an **async, stateful architecture** with a **scheduled cron worker** (simplest and most future-proof).

📄 **See detailed architecture specification**: [AI Cron Architecture](./prd-ai-cron-architecture.md)

### System Components (Cron Worker Design)

```
┌─────────────────────────────────────────────────────────────────┐
│          LeaseLab2 AI Tenant Intelligence (Cron Worker)          │
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
│  Runs automatically every hour, no manual triggers             │
└────────────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

1. ✅ **Scheduled Cron Worker** - Runs every hour, processes pending jobs in batches
2. ✅ **Two Workers** - CRUD worker + Cron worker (separate concerns)
3. ✅ **Simple DB Table** - `ai_evaluation_jobs` tracks job status (pending → completed)
4. ✅ **Async Processing** - Frontend creates job, cron processes within 1 hour
5. ✅ **Batch Efficient** - Process up to 100 jobs per cron run
6. ✅ **Zero Cost** - Cron triggers are FREE (unlimited, no usage caps)

### Why Cron Worker > Workflows > Queues

| Aspect | Cron Worker ✅ (FINAL) | Workflows | Queues |
|--------|----------------------|-----------|--------|
| **Complexity** | Extremely simple | Simple | Complex |
| **Cost** | **FREE** (unlimited) | 10M steps/month | 1M ops/month |
| **Limits** | **None** | 10M steps/month | 1M ops/month |
| **State** | Simple DB table | Built-in | Manual table |
| **Scaling** | Batch processing | Per-request | Per-request |
| **Future-Proof** | ✅ No limits | Service limits | Service limits |

### Data Flow

**Scenario: Landlord Triggers AI Evaluation**

```
1. User clicks "Run AI Evaluation" in Ops Dashboard
   │
   ▼
2. POST /api/ops/leads/:id/evaluate
   │
   ▼
3. Worker checks quota (ai_evaluation_usage table)
   │── If quota exceeded → Return error
   │
   ▼
4. Worker fetches lead + lead_files from D1
   │
   ▼
5. Worker generates presigned R2 URLs for documents
   │
   ▼
6. Worker calls Cloudflare Workers AI
   │  - Model: @cf/meta/llama-3.2-11b-vision-instruct
   │  - Input: Structured prompt + document URLs
   │
   ▼
7. Workers AI processes documents and returns JSON
   │
   ▼
8. Worker parses response and validates schema
   │
   ▼
9. Worker saves to lead_ai_evaluations table
   │  - Includes model_version for audit
   │
   ▼
10. Worker updates lead.ai_score, lead.ai_label, lead.status
    │
    ▼
11. Worker increments ai_evaluation_usage.evaluation_count
    │
    ▼
12. Return result to Ops Dashboard
```

### Worker Deployment

**Single Worker + Workflow** (Simpler Architecture):

#### CRUD Worker: `leaselab-worker` (Enhanced)

**Responsibilities**:
- Handle all database CRUD operations
- Trigger Cloudflare Workflows
- Query workflow status
- Serve evaluation results

**Wrangler Config** (add Workflow binding):
```toml
# apps/worker/wrangler.toml
name = "leaselab-worker"
main = "worker.ts"
compatibility_date = "2024-11-01"
compatibility_flags = ["nodejs_compat"]

# Existing bindings
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

# AI binding (for workflow use)
[ai]
binding = "AI"

[env.production]
# Production config

[env.preview]
# Preview environment
```

#### Workflow Definition: `ai-evaluation-workflow` (NEW)

**File**: `apps/worker/workflows/ai-evaluation.ts`

**Responsibilities**:
- Durable execution of AI evaluation pipeline
- Automatic per-step retries
- State tracking (queued → running → complete/error)

**Steps**:
1. Fetch lead from D1
2. Load documents from R2
3. Call Workers AI (multi-modal)
4. Parse AI response
5. Save evaluation to D1
6. Update lead status
7. Send email notification (future)

**Why Workflows (Not Separate Worker)**:
✅ **Simpler**: One worker instead of two
✅ **Built-in State**: No manual job tracking table needed
✅ **Better Retries**: Per-step retries (more efficient)
✅ **Lower Cost**: More generous free tier (10M vs 1M operations)
✅ **Easier Debugging**: See step execution in Cloudflare dashboard
✅ **No Infrastructure**: No Queue/DLQ setup required

📄 **Full implementation details**: [AI Workflow Architecture](./prd-ai-workflow-architecture.md)

### AI Model Selection

**Cloudflare Workers AI Models** (Free Tier Compatible):

| Model | Use Case | Cost (Free Tier) | Pros | Cons |
|-------|----------|------------------|------|------|
| `@cf/meta/llama-3.2-11b-vision-instruct` ⭐ | **Multi-modal document analysis** | 10k neurons/day | Vision + text in one call, fraud detection, no OCR needed | Slower inference (~5-10s) |
| `@cf/meta/llama-3.2-90b-vision-instruct` | Premium multi-modal (future) | 10k neurons/day | Higher accuracy | Much slower, higher neuron cost |
| `@cf/openai/gpt-4o-mini` | Premium fallback | Pay-per-use | Best accuracy | Not free tier ($$$) |

**Recommended** (FINAL DECISION):
✅ **`@cf/meta/llama-3.2-11b-vision-instruct`** for MVP
- **Multi-modal**: Processes images + PDFs directly (no separate OCR step)
- **Fraud detection**: Can visually detect altered documents, font inconsistencies, template mismatches
- **Single API call**: Faster and simpler than OCR → text analysis pipeline
- **Free tier**: Well within 10k neurons/day budget

**Why Multi-Modal is Critical**:
1. **Visual fraud signals**: OCR alone can't detect photoshopped paystubs or altered bank statements
2. **Document authenticity**: Model can verify logos, letterheads, formatting against known templates
3. **"Too good to be true" detection**: Spotting overly perfect documents that may be fake templates
4. **Efficiency**: One model call instead of OCR preprocessing + text analysis

**Prompt Engineering**:
```typescript
const evaluationPrompt = `
You are an expert tenant screening assistant. Analyze the provided rental application documents and evaluate the applicant's suitability as a tenant.

APPLICANT INFORMATION:
- Name: ${lead.first_name} ${lead.last_name}
- Email: ${lead.email}
- Phone: ${lead.phone}
- Desired Move-in Date: ${lead.move_in_date}
- Employment Status: ${lead.employment_status}
- Monthly Rent: $${property.rent}

DOCUMENTS PROVIDED:
${documentList}

EVALUATION CRITERIA:
1. Income Verification: Monthly income should be ≥3x monthly rent ($${property.rent * 3})
2. Employment Stability: Prefer full-time employment >2 years
3. Document Completeness: All required documents present and legible
4. Document Authenticity: No signs of forgery or alteration
5. Financial Health: Savings ≥3-6 months rent
6. Application Quality: Complete information, professional presentation

INSTRUCTIONS:
Analyze all documents and return a JSON response with this exact structure:
{
  "score": <0-100>,
  "label": "A" | "B" | "C" | "D",
  "recommendation": "approve" | "approve_with_conditions" | "reject",
  "summary": "<2-3 sentence explanation>",
  "risk_flags": ["<flag1>", "<flag2>"],
  "fraud_signals": ["<signal1>", "<signal2>"]
}

RISK FLAGS (use these exact strings):
- "income_insufficient"
- "employment_unstable"
- "employment_duration_short"
- "documents_incomplete"
- "documents_illegible"
- "financial_health_poor"
- "application_quality_poor"

FRAUD SIGNALS (use these exact strings):
- "forged_document"
- "altered_paystub"
- "inconsistent_information"
- "suspicious_bank_statement"
- "fake_employment_letter"

IMPORTANT:
- DO NOT consider race, religion, family status, disability, or national origin
- Base evaluation solely on financial qualifications and document quality
- Provide objective, defensible explanations
- Flag any documents that appear altered or suspicious
`;
```

---

## Database Schema Changes

### New Tables

```sql
-- AI Evaluation Jobs (Stateful Async Processing)
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
CREATE INDEX idx_ai_jobs_lead_status ON ai_evaluation_jobs(lead_id, status);

-- AI Evaluation Usage Tracking
CREATE TABLE ai_evaluation_usage (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  month TEXT NOT NULL, -- 'YYYY-MM'
  evaluation_count INTEGER NOT NULL DEFAULT 0,
  quota_limit INTEGER NOT NULL DEFAULT 20,
  tier TEXT NOT NULL DEFAULT 'free', -- 'free' | 'pro' | 'enterprise'
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(site_id, month)
);

CREATE INDEX idx_ai_usage_site_month ON ai_evaluation_usage(site_id, month);

-- AI Model Configuration (for future multi-model support)
CREATE TABLE ai_model_configs (
  id TEXT PRIMARY KEY,
  model_name TEXT NOT NULL UNIQUE, -- '@cf/meta/llama-3.2-11b-vision-instruct'
  display_name TEXT NOT NULL, -- 'LLaMA 3.2 11B Vision'
  provider TEXT NOT NULL, -- 'cloudflare' | 'openai' | 'anthropic'
  is_active BOOLEAN NOT NULL DEFAULT 1,
  cost_per_evaluation REAL, -- For cost tracking
  version TEXT NOT NULL, -- '1.0', '2.0', etc.
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Audit Log for AI Evaluations (compliance)
CREATE TABLE ai_evaluation_audit (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL,
  evaluation_id TEXT NOT NULL,
  user_id TEXT NOT NULL, -- Who triggered evaluation
  site_id TEXT NOT NULL,
  action TEXT NOT NULL, -- 'evaluated' | 'overridden' | 're-evaluated'
  previous_recommendation TEXT, -- For overrides
  new_recommendation TEXT,
  reason TEXT, -- User-provided reason for override
  created_at TEXT NOT NULL,
  FOREIGN KEY (lead_id) REFERENCES leads(id),
  FOREIGN KEY (evaluation_id) REFERENCES lead_ai_evaluations(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_ai_audit_lead ON ai_evaluation_audit(lead_id);
CREATE INDEX idx_ai_audit_site ON ai_evaluation_audit(site_id);
```

### Schema Modifications

**Existing Tables** (No changes needed):
- `leads` - Already has `ai_score`, `ai_label` fields
- `lead_ai_evaluations` - Already exists with all required fields
- `lead_files` - Already exists for document storage

**Field Additions** (Optional enhancements):
```sql
-- Add quota tier to sites table (future)
ALTER TABLE sites ADD COLUMN ai_quota_tier TEXT DEFAULT 'free';

-- Add AI feature flag to sites table
ALTER TABLE sites ADD COLUMN ai_enabled BOOLEAN DEFAULT 0;
```

---

## API Specification

### Endpoints

#### 1. Create AI Evaluation Job (Async)

```http
POST /api/ops/leads/:leadId/ai-evaluation
```

**Headers**:
```
X-Site-Id: <site-id>
X-User-Id: <user-id> (for audit trail)
Authorization: Bearer <token>
```

**Request Body** (optional):
```json
{
  "force_refresh": false, // If true, re-evaluate even if already evaluated
  "model_version": "auto" // 'auto' | specific model name
}
```

**Response (Immediate - Job Created)**:
```json
{
  "success": true,
  "data": {
    "job_id": "job_abc123",
    "lead_id": "lead_xyz789",
    "status": "pending",
    "requested_at": "2025-12-17T10:00:00Z",
    "estimated_completion": "2025-12-17T10:00:30Z"
  },
  "usage": {
    "remaining": 15,
    "limit": 20,
    "month": "2025-12"
  }
}
```

**Response (Quota Exceeded)**:
```json
{
  "success": false,
  "error": "QuotaExceeded",
  "message": "You have reached your monthly AI evaluation limit (20/20). Upgrade to Pro for more evaluations.",
  "usage": {
    "remaining": 0,
    "limit": 20,
    "month": "2025-12"
  }
}
```

**Response (Missing Documents)**:
```json
{
  "success": false,
  "error": "InsufficientDocuments",
  "message": "At least one document is required for AI evaluation.",
  "missing": ["government_id", "paystub"]
}
```

#### 2. Get AI Evaluation Job Status (Polling)

```http
GET /api/ops/ai-evaluation-jobs/:jobId
```

**Response (Pending)**:
```json
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

**Response (Processing)**:
```json
{
  "success": true,
  "data": {
    "job_id": "job_abc123",
    "status": "processing",
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
    "status": "completed",
    "completed_at": "2025-12-17T10:00:12Z",
    "duration_ms": 7000,
    "evaluation": {
      "id": "eval_abc123",
      "score": 82,
      "label": "A",
      "summary": "...",
      "recommendation": "approve",
      "risk_flags": ["employment_duration_short"],
      "fraud_signals": [],
      "evaluated_at": "2025-12-17T10:00:12Z",
      "model_version": "@cf/meta/llama-3.2-11b-vision-instruct"
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
    "status": "failed",
    "error_code": "ModelTimeout",
    "error_message": "AI model took too long to respond. Please try again.",
    "can_retry": true
  }
}
```

#### 3. Get AI Evaluation (Latest Result)

```http
GET /api/ops/leads/:leadId/ai-evaluation
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "eval_abc123",
    "score": 82,
    "label": "A",
    "summary": "...",
    "recommendation": "approve",
    "risk_flags": [...],
    "fraud_signals": [],
    "evaluated_at": "2025-12-17T10:00:12Z",
    "model_version": "@cf/meta/llama-3.2-11b-vision-instruct"
  }
}
```

#### 3. Get AI Usage Stats

```http
GET /api/ops/sites/:siteId/ai-usage
GET /api/ops/sites/:siteId/ai-usage/:month
```

**Response**:
```json
{
  "success": true,
  "data": {
    "site_id": "site_abc",
    "month": "2025-12",
    "evaluation_count": 12,
    "quota_limit": 20,
    "tier": "free",
    "remaining": 8,
    "usage_percentage": 60.0,
    "evaluations": [
      {
        "lead_id": "lead_123",
        "lead_name": "John Doe",
        "score": 82,
        "label": "A",
        "evaluated_at": "2025-12-17T10:23:45Z"
      }
    ]
  }
}
```

#### 4. Override AI Recommendation (Audit Trail)

```http
POST /api/ops/leads/:id/evaluation/override
```

**Request Body**:
```json
{
  "new_recommendation": "reject",
  "reason": "Landlord identified concerns not captured by AI: previous eviction from reference check."
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "lead_id": "lead_123",
    "original_recommendation": "approve",
    "new_recommendation": "reject",
    "overridden_by": "user_456",
    "reason": "...",
    "overridden_at": "2025-12-17T11:00:00Z"
  }
}
```

---

## Usage Scenarios

### Scenario 1: Happy Path (First-Time Evaluation)

1. Tenant submits application via public site (`/apply`)
2. Tenant uploads documents (ID, paystubs, bank statement)
3. Lead status: `new` → `documents_received`
4. Landlord opens lead in Ops Dashboard
5. Landlord clicks "Run AI Evaluation" button
6. System checks quota: 5/20 used ✓
7. System fetches documents from R2
8. System calls Workers AI with structured prompt
9. AI analyzes documents and returns score: 82 (Label: B)
10. System saves to `lead_ai_evaluations` table
11. Lead status: `documents_received` → `ai_evaluated`
12. Dashboard shows: "Score: 82/100 | Label: B | Recommendation: APPROVE"
13. Landlord reviews AI summary and approves tenant
14. Lead status: `ai_evaluated` → `approved`

**Time Saved**: 30-45 minutes → 30 seconds

---

### Scenario 2: Quota Exceeded (Upgrade Prompt)

1. Landlord tries to evaluate 21st application in the month
2. System checks quota: 20/20 used ✗
3. System returns error: "Quota Exceeded"
4. Dashboard shows: "You've used all 20 evaluations this month. Upgrade to Pro for 100 evaluations/month."
5. Landlord either:
   - Waits until next month
   - Upgrades to Pro tier
   - Manually reviews without AI

**Expected Outcome**: Clear upgrade path, no silent failures

---

### Scenario 3: Fraud Detection (Obvious Forgery)

1. Tenant submits application with forged paystub
2. Landlord triggers AI evaluation
3. **Multi-modal AI visually analyzes documents** and detects:
   - Paystub font doesn't match standard ADP format
   - Company logo appears pixelated (copied from web)
   - Income amount shows digital alteration artifacts
   - Employer name doesn't match public records
4. System returns:
   - Score: 35 (Label: C - No Go)
   - Recommendation: REJECT
   - Fraud Signals: `["altered_paystub", "forged_document"]`
5. Dashboard shows big red warning: "⚠️ FRAUD SIGNALS DETECTED"
6. Landlord rejects application with documentation
7. System logs rejection reason in `ai_evaluation_audit` table

**Benefit**: Early fraud detection saves landlord from bad tenant

---

### Scenario 3B: "Too Good to Be True" Detection (NEW)

1. Tenant submits application with **suspiciously perfect** documents
2. Landlord triggers AI evaluation
3. **Multi-modal AI notices unusual patterns**:
   - All documents are pristine PDFs (no natural scanning artifacts)
   - Paystub shows $15,000/month income for "junior analyst" role (unusually high)
   - Bank statement has perfectly round numbers, no normal transaction variety
   - Employment letter uses generic template wording
   - Everything matches perfectly (too perfect)
4. System returns:
   - Score: 92 (Label: A - but flagged)
   - Recommendation: **APPROVE_WITH_VERIFICATION** ⚠️
   - Fraud Signals: `["too_perfect_documents", "unusually_high_income"]`
   - Summary: "Excellent credentials on paper, but documents appear unusually pristine. Recommend direct employer verification before approval."
5. Dashboard shows yellow warning: "⚠️ HIGH SCORE BUT VERIFY FIRST"
6. Landlord calls employer directly to verify before approving
7. Employer confirms income is fake → Application rejected

**Benefit**: Catches sophisticated fraud that passes basic checks but raises red flags on closer inspection

---

### Scenario 4: Manual Override (Audit Trail)

1. AI recommends "APPROVE" for candidate with score 75
2. Landlord runs reference check and discovers previous eviction (not in documents)
3. Landlord overrides AI recommendation to "REJECT"
4. System prompts for reason: "Previous eviction confirmed by reference check"
5. System logs override in `ai_evaluation_audit` table:
   ```json
   {
     "action": "overridden",
     "previous_recommendation": "approve",
     "new_recommendation": "reject",
     "reason": "Previous eviction confirmed by reference check",
     "overridden_by": "user_landlord_123"
   }
   ```
6. Lead marked as rejected with full audit trail

**Benefit**: Preserves AI recommendation + human judgment for compliance

---

### Scenario 5: Super Admin Cost Monitoring

1. Super Admin manages 10 customer sites
2. Each site has 20 evaluations/month quota (free tier)
3. Total possible usage: 200 evaluations/month
4. Cloudflare Workers AI free tier: ~10,000 neurons/day ≈ 300,000/month
5. Each evaluation costs ~50 neurons
6. Total cost at max usage: 200 × 50 = 10,000 neurons/month
7. Super Admin dashboard shows:
   - "Total AI Usage: 10,000 neurons (3.3% of free tier)"
   - "Projected Cost: $0.00 (within free tier)"
8. Alert triggers at 80% free tier usage (240k neurons)

**Benefit**: Cost control, stay within free tier

---

## Rollout Plan

### Phase 1: MVP (Week 1-2)

**Scope**:
- Basic AI evaluation endpoint (POST /api/ops/leads/:id/evaluate)
- Integration with Cloudflare Workers AI (llama-3.2-11b-vision-instruct)
- Simple scoring algorithm (income + employment + docs)
- Store results in `lead_ai_evaluations` table
- Basic quota tracking (20 evals/site/month)
- UI: "Run AI Evaluation" button + results display

**Success Criteria**:
- 90% of evaluations complete within 10 seconds
- AI score accuracy ≥70% compared to manual review (spot check)
- Zero quota bypasses (100% enforcement)

---

### Phase 2: Enhanced Intelligence (Week 3-4)

**Scope**:
- Document OCR and structured data extraction
- Cross-document consistency validation
- Fraud signal detection (basic)
- Risk flag explanations
- Manual override workflow with audit trail
- Usage analytics dashboard

**Success Criteria**:
- Fraud detection catches ≥10% of known test cases
- Manual override workflow tested with 10+ users
- 100% of evaluations have human-readable explanations

---

### Phase 3: Advanced Features (Week 5-6)

**Scope**:
- Async evaluation with webhooks (for slow AI responses)
- Multi-model support (fallback models)
- Landlord preference profiles (adjust scoring weights)
- Batch evaluation (evaluate multiple leads at once)
- Email notifications for high-priority candidates (A-rated)

**Success Criteria**:
- Async evaluations reduce timeout errors to <1%
- Batch evaluation saves 50% time for high-volume landlords
- Email notifications increase response time by 30%

---

### Phase 4: Optimization & Scale (Week 7-8)

**Scope**:
- Model fine-tuning with historical data
- A/B testing different scoring algorithms
- Cost optimization (switch to cheaper models for simple cases)
- Integration with external credit check APIs (optional)
- Mobile-optimized UI for on-the-go landlords

**Success Criteria**:
- Model accuracy improves to ≥85% vs. manual review
- Cost per evaluation reduced by 30%
- Mobile usage accounts for 40%+ of evaluations

---

## Open Questions & Decisions Needed

### Technical Decisions

1. **AI Model Selection**
   - Q: Start with Cloudflare Workers AI or integrate OpenAI GPT-4o?
   - Recommendation: Start with Workers AI (llama-3.2) for free tier, add GPT-4o as premium option later
   - Decision Maker: Engineering Lead

2. **Async vs. Sync Evaluation**
   - Q: Should AI evaluation be synchronous (block UI) or asynchronous (background job)?
   - Recommendation: Start sync for MVP (simpler), add async in Phase 3
   - Decision Maker: Product Manager

3. **Document Storage Duration**
   - Q: How long should we store uploaded documents in R2?
   - Recommendation: 90 days after lease signed or application rejected (compliance)
   - Decision Maker: Legal/Compliance Team

4. **Model Version Tracking**
   - Q: How do we handle model updates without invalidating old evaluations?
   - Recommendation: Store `model_version` in evaluation record, support multiple versions simultaneously
   - Decision Maker: Engineering Lead

---

### Product Decisions

5. **Quota Upgrade Path**
   - Q: What's the pricing for Pro tier?
   - Recommendation: Free (20/mo) → Pro ($29/mo, 100 evals) → Enterprise (Custom)
   - Decision Maker: Business Team

6. **Fraud Signal Handling**
   - Q: Should fraud signals auto-reject or just warn landlord?
   - Recommendation: Warn only (landlord makes final decision), but log prominently
   - Decision Maker: Product Manager

7. **Fair Housing Compliance**
   - Q: Do we need legal review of AI prompts and scoring algorithm?
   - Recommendation: Yes, get legal sign-off before public launch
   - Decision Maker: Legal Team

8. **Tenant Visibility**
   - Q: Should tenants see their AI score/evaluation?
   - Recommendation: No for MVP (privacy concerns), consider transparency later
   - Decision Maker: Product Manager + Legal

---

### Business Decisions

9. **Target Market**
   - Q: Focus on small landlords (1-5 properties) or large property managers (50+ units)?
   - Recommendation: Start with small-medium landlords (5-20 properties), easier adoption
   - Decision Maker: Business Strategy

10. **Competitive Positioning**
    - Q: How do we differentiate from existing tenant screening services (e.g., TransUnion, Zillow)?
    - Recommendation: Speed + Explainability + Built-in workflow (not standalone service)
    - Decision Maker: Product Strategy

---

## Success Metrics (KPIs)

### Adoption Metrics

| Metric | Target (3 months) | Measurement |
|--------|-------------------|-------------|
| % of leads evaluated by AI | 60% | `COUNT(ai_evaluated) / COUNT(total_leads)` |
| Avg evaluations per site/month | 12 | `AVG(evaluation_count) per site` |
| AI feature activation rate | 70% | `COUNT(sites with ai_enabled=true) / COUNT(total_sites)` |

### Quality Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| AI accuracy vs. manual review | 85% | Spot check 100 evaluations |
| Fraud detection rate | 15% | `COUNT(fraud_signals > 0) / COUNT(evaluations)` |
| Manual override rate | <20% | `COUNT(overrides) / COUNT(evaluations)` |

### Business Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Time saved per evaluation | 30 min → 30 sec | User survey |
| Landlord satisfaction (NPS) | 70+ | Post-feature survey |
| Conversion: Free → Pro tier | 10% | `COUNT(upgraded) / COUNT(quota_exceeded)` |

### Technical Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| API response time (P95) | <10 sec | Cloudflare Analytics |
| Success rate | >95% | `COUNT(success) / COUNT(total_requests)` |
| Cost per evaluation | <$0.01 | Total neurons used / total evaluations |
| Free tier compliance | 100% | Never exceed 10k neurons/day |

---

## Risk Assessment

### High Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Legal: Discrimination claims** | High | Medium | - Get legal review of algorithm<br>- Never use protected class data<br>- Maintain audit trail<br>- Provide human override |
| **Technical: AI accuracy too low** | High | Medium | - Start with conservative scoring<br>- Human review required for rejects<br>- A/B test scoring algorithms |
| **Business: Cost overruns** | Medium | Low | - Strict quota enforcement<br>- Monitor usage daily<br>- Alert at 80% of free tier |

### Medium Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Product: Low adoption** | Medium | Medium | - Make AI opt-in, not required<br>- Show value prop clearly<br>- Offer free trial (first 5 evals) |
| **Technical: Slow inference** | Medium | Medium | - Use faster model for simple cases<br>- Add async evaluation option<br>- Cache common document types |
| **Compliance: Data retention** | Medium | Low | - Auto-delete docs after 90 days<br>- Clear privacy policy<br>- GDPR compliance for international |

### Low Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Technical: Workers AI downtime** | Low | Low | - Implement fallback to manual<br>- Queue failed jobs for retry<br>- Show graceful error messages |

---

## Dependencies

### External Dependencies

1. **Cloudflare Workers AI**
   - Status: Available (free tier)
   - Risk: Service reliability, rate limits
   - Owner: Cloudflare

2. **R2 Storage**
   - Status: Active (already in use)
   - Risk: None (proven)
   - Owner: Internal

3. **D1 Database**
   - Status: Active (already in use)
   - Risk: None (proven)
   - Owner: Internal

### Internal Dependencies

4. **Lead File Upload Feature**
   - Status: Complete (already deployed)
   - Risk: None
   - Owner: Engineering Team

5. **Session Management**
   - Status: Complete (already deployed)
   - Risk: None
   - Owner: Engineering Team

6. **Legal Review**
   - Status: Pending
   - Risk: Could delay launch
   - Owner: Legal Team

---

## Appendix

### A. Compliance Considerations

**Fair Housing Act (FHA) Requirements**:
- AI must NOT consider: Race, color, religion, national origin, sex, disability, familial status
- AI MUST base decisions on: Financial qualifications, rental history, creditworthiness
- Landlords must provide rejection reasons in writing (AI summary satisfies this)
- Records must be retained for 3 years (database handles this)

**GDPR/Privacy**:
- Tenants have right to request evaluation data
- Must provide mechanism to delete tenant data (GDPR Article 17)
- AI evaluation explanations satisfy "right to explanation" (GDPR Article 22)

**Recommendation**: Add "Export My Data" and "Delete My Data" buttons to tenant profile.

---

### B. Prompt Engineering Examples

**Example: Full Evaluation Prompt**

```
You are an expert tenant screening assistant for LeaseLab, a property management platform. Your role is to evaluate rental applications objectively based solely on financial qualifications and document quality.

=== APPLICANT INFORMATION ===
Name: John Doe
Email: john.doe@email.com
Phone: (555) 123-4567
Employment Status: Employed (Full-time)
Desired Move-in: 2025-01-15
Monthly Rent: $2,000

=== DOCUMENTS PROVIDED ===
1. Government ID (Driver's License) - california_drivers_license.jpg
2. Recent Paystub - paystub_december_2024.pdf
3. Bank Statement - chase_statement_nov_2024.pdf
4. Employment Letter - google_employment_verification.pdf

=== EVALUATION CRITERIA ===
Score the applicant on a 0-100 scale based on these factors:

1. Income Verification (30 points)
   - Monthly income ≥ 3x rent ($6,000+): 30 pts
   - Monthly income 2.5-3x rent ($5,000-$5,999): 20 pts
   - Monthly income 2-2.5x rent ($4,000-$4,999): 10 pts
   - Monthly income < 2x rent: 0 pts

2. Employment Stability (20 points)
   - Full-time employed >2 years: 20 pts
   - Full-time employed 1-2 years: 15 pts
   - Full-time employed <1 year: 10 pts
   - Self-employed with proof: 10 pts
   - Unemployed/Student: 5 pts

3. Document Completeness (15 points)
   - All required documents provided and legible: 15 pts
   - Missing 1 document: 10 pts
   - Missing 2+ documents: 5 pts

4. Document Authenticity (15 points)
   - No signs of alteration/forgery: 15 pts
   - Minor concerns (blurry, partial): 10 pts
   - Major concerns (obvious alterations): 0 pts

5. Financial Health (10 points)
   - Bank balance ≥ 6 months rent ($12,000+): 10 pts
   - Bank balance 3-6 months rent ($6,000-$11,999): 7 pts
   - Bank balance < 3 months rent: 3 pts

6. Application Quality (10 points)
   - Complete information, professional: 10 pts
   - Minor issues (typos, missing fields): 5 pts
   - Sloppy/incomplete: 0 pts

=== INSTRUCTIONS ===
1. Analyze all provided documents carefully
2. Extract key information:
   - From paystub: Gross monthly income, employer name, pay period
   - From bank statement: Account balance, transaction patterns, NSF fees
   - From employment letter: Job title, salary, employment start date
   - From ID: Verify name matches application
3. Check for consistency:
   - Does name on ID match application and other documents?
   - Does income on paystub match employment letter (±10%)?
   - Does bank balance align with stated income level?
4. Flag any fraud signals:
   - Altered or forged documents (font inconsistencies, pixelation)
   - Suspicious employer names (generic, unverifiable)
   - Fake bank statements (missing bank logos, formatting errors)
   - Inconsistent information across documents

=== OUTPUT FORMAT ===
Return your evaluation as a JSON object with this EXACT structure:

{
  "score": <integer 0-100>,
  "label": "A" | "B" | "C" | "D",
  "recommendation": "approve" | "approve_with_conditions" | "reject",
  "summary": "<2-3 sentence explanation of your evaluation>",
  "risk_flags": [<array of risk flag strings from list below>],
  "fraud_signals": [<array of fraud signal strings from list below>],
  "extracted_data": {
    "monthly_income": <number or null>,
    "employment_duration_months": <number or null>,
    "bank_balance": <number or null>,
    "employer_name": "<string or null>"
  }
}

=== RISK FLAGS ===
Use these exact strings (only include flags that apply):
- "income_insufficient" - Monthly income < 3x rent
- "employment_unstable" - Unemployed or frequent job changes
- "employment_duration_short" - Less than 6 months at current job
- "documents_incomplete" - Missing required documents
- "documents_illegible" - Documents unreadable or poor quality
- "financial_health_poor" - Bank balance < 2 months rent
- "application_quality_poor" - Incomplete or sloppy application
- "inconsistent_information" - Discrepancies across documents

=== FRAUD SIGNALS ===
Use these exact strings (only include if detected). Multi-modal analysis allows you to detect visual anomalies:

**Obvious Fraud** (auto-reject):
- "forged_document" - Clear signs of document forgery (visual artifacts, wrong fonts)
- "altered_paystub" - Paystub appears digitally manipulated (pixelation, font mismatches)
- "fake_employment_letter" - Employment letter looks fraudulent (generic template, no letterhead)
- "suspicious_bank_statement" - Bank statement formatting issues (missing logos, wrong layout)
- "identity_mismatch" - Name inconsistencies across documents

**Sophisticated Fraud** (requires verification):
- "too_perfect_documents" - Documents are suspiciously pristine, no natural scanning artifacts, may be AI-generated or template-based
- "unusually_high_income" - Income far exceeds typical range for stated job title (e.g., junior analyst earning $200k/year)
- "perfect_score_red_flag" - All criteria met perfectly with no natural variation, suggests fabricated application
- "inconsistent_lifestyle" - Bank transactions don't match claimed income level (e.g., high income but only fast food purchases)

**Visual Fraud Detection** (use your multi-modal capabilities):
- Look for font inconsistencies within same document
- Check if logos are pixelated (copied from web vs. original)
- Verify document formatting matches known authentic templates
- Spot digital alteration artifacts (cloning, airbrushing numbers)
- Notice if PDFs are native vs. scanned (pristine PDFs of "official" documents are suspicious)

=== LABEL DEFINITIONS ===
Simplified 3-tier system for faster decision-making:
- **"A" (Strongly Recommend)**: 80-100 points - High-quality candidate, landlord should move quickly to secure this tenant
- **"B" (Check Further, Keep Warm)**: 50-79 points - Promising candidate but needs additional verification or minor concerns to address
- **"C" (No Go)**: 0-49 points - Recommend reject due to insufficient qualifications or red flags

=== RECOMMENDATION LOGIC ===
1. **Check for "too good to be true" first**:
   - If score ≥95 AND documents are suspiciously perfect → "approve_with_verification"
   - If income far exceeds typical range for job title → "approve_with_verification"

2. **Standard scoring**:
   - "approve": Score ≥80 AND no fraud signals
   - "approve_with_conditions": Score 50-79 AND no major fraud signals
   - "approve_with_verification": Score ≥80 BUT has "too perfect" fraud signals
   - "reject": Score <50 OR any serious fraud signals (forged_document, altered_paystub)

3. **Fraud signal overrides**:
   - Any "forged_document" or "altered_paystub" → always "reject"
   - "too_perfect_documents" or "unusually_high_income" → "approve_with_verification"

=== COMPLIANCE REQUIREMENTS ===
CRITICAL: Do NOT consider or reference:
- Race, ethnicity, or national origin
- Religion or religious practices
- Family status or marital status
- Disability or health conditions
- Gender or sexual orientation
- Age (unless verifying 18+)

Base your evaluation SOLELY on:
- Financial qualifications (income, savings, employment)
- Document quality and completeness
- Objective risk indicators

Your evaluation must be defensible under Fair Housing Act regulations. Provide clear, objective explanations for all scoring decisions.

Now, analyze the documents and provide your evaluation.
```

---

### C. Sample AI Response

```json
{
  "score": 82,
  "label": "A",
  "recommendation": "approve",
  "summary": "Strong candidate with verified full-time employment at Google and monthly income of $6,500 (3.25x monthly rent). Bank statement shows healthy savings of $18,000 with consistent deposit patterns. Minor concern: only 9 months at current position, but employer is reputable and income is well above requirement.",
  "risk_flags": [
    "employment_duration_short"
  ],
  "fraud_signals": [],
  "extracted_data": {
    "monthly_income": 6500,
    "employment_duration_months": 9,
    "bank_balance": 18000,
    "employer_name": "Google LLC"
  },
  "scoring_breakdown": {
    "income_verification": 30,
    "employment_stability": 15,
    "document_completeness": 15,
    "document_authenticity": 15,
    "financial_health": 10,
    "application_quality": 10
  },
  "compliance_notes": "Evaluation based solely on financial qualifications and document verification. No protected class information considered. Decision is defensible under Fair Housing Act regulations."
}
```

---

### D. Cost Analysis

**Cloudflare Workers AI Pricing** (as of 2024):

| Tier | Price | Neurons Included | Notes |
|------|-------|------------------|-------|
| Free | $0 | 10,000 neurons/day | ~300k neurons/month |
| Workers Paid | $5/mo | 10,000 neurons/day | Additional usage: $0.011 per 1,000 neurons |

**Neuron Usage per Evaluation** (estimated):
- LLaMA 3.2 11B Vision model: ~50-100 neurons per evaluation
- Depends on: Number of documents, image resolution, prompt length

**Cost Scenarios**:

| Usage Level | Evaluations/Month | Neurons Used | Cost (Free Tier) | Cost (Paid Tier) |
|-------------|-------------------|--------------|------------------|------------------|
| **Low (Small Landlord)** | 10 | 1,000 | $0 | $0 |
| **Medium (Property Manager)** | 100 | 10,000 | $0 | $0 |
| **High (Large Operator)** | 500 | 50,000 | N/A (exceeds free tier) | $5 + $0.44 = $5.44 |
| **Enterprise (Multiple Sites)** | 2,000 | 200,000 | N/A | $5 + $1.90 = $6.90 |

**Recommendation**: With 20 evals/site/month quota on free tier, total max usage = 200 evals × 75 neurons = 15,000 neurons/month (well within free tier). Super admins stay within free tier ✓

---

### E. Testing Plan

**Unit Tests**:
- Quota checking logic (edge cases: month rollover, concurrent requests)
- Score calculation algorithm (verify math for all scenarios)
- Risk flag assignment (each flag type)
- Fraud signal detection (mock forged documents)

**Integration Tests**:
- End-to-end evaluation flow (lead → documents → AI → results)
- R2 presigned URL generation
- D1 database transactions (atomic updates)
- Workers AI API calls (mock responses)

**Manual Testing**:
- Upload 10 real tenant applications (anonymized)
- Compare AI scores to human expert reviews
- Measure accuracy: (correct_evaluations / total_evaluations) × 100%
- Target: ≥80% accuracy

**A/B Testing**:
- Test 2-3 different scoring algorithms with real landlords
- Measure: Time to decision, landlord satisfaction, tenant quality
- Pick winning algorithm for production

**Load Testing**:
- Simulate 100 concurrent evaluations
- Verify quota enforcement under load
- Check for race conditions in usage tracking

---

### F. Documentation Requirements

**For Engineering**:
- API documentation (OpenAPI/Swagger spec)
- Database schema changes (migration guide)
- AI prompt templates (version controlled)
- Error handling guide

**For Product**:
- User guide: "How to use AI Tenant Evaluation"
- FAQ: "Why did my tenant get a C rating?"
- Video tutorial: "AI Evaluation Walkthrough"
- Changelog: "What's new in AI v1.0"

**For Compliance/Legal**:
- Fair Housing compliance report
- Data retention policy
- Privacy policy updates (AI usage disclosure)
- Audit trail documentation

---

## Conclusion

AI Tenant Intelligence represents a significant value-add to the LeaseLab platform, addressing a critical pain point for landlords: **fast, objective, compliant tenant screening**. By leveraging Cloudflare Workers AI and the existing multi-tenant infrastructure, we can deliver this feature within the free tier constraints while maintaining audit trails and compliance standards.

**Next Steps**:
1. ✅ Get PRD approval from stakeholders
2. ⏳ Legal review of scoring algorithm and prompts
3. ⏳ Finalize AI model selection (Workers AI vs. OpenAI)
4. ⏳ Design UI mockups for evaluation results page
5. ⏳ Set up development environment with Workers AI binding
6. ⏳ Begin Phase 1 implementation (MVP)

**Questions? Contact**:
- Product Owner: [Name]
- Engineering Lead: [Name]
- Legal/Compliance: [Name]

---

**Document Status**: Draft - Awaiting stakeholder review
**Last Updated**: 2025-12-17
**Version**: 1.0
