# Task 4.1: Testing & Verification

**Estimated Time**: 1-2 hours (plus AI inference wait time)  
**Dependencies**: Frontend + backend tasks completed (Tasks 1-3)  
**Goal**: Validate the new application workflow in two modes—stubbing the AI response for fast UI verification and exercising the real Workers AI integration end-to-end.

---

## Overview

Testing covers two execution paths:

1. **Stubbed AI Mode** – Ensures UI flows, duplicate guards, quotas, and activity logs work without calling Workers AI.
2. **Real AI Mode** – Uses actual documents + Workers AI to verify Cron worker, job table, and AI pane render the live score/notes.

Both modes must pass before deployment.

---

## Part A – Stubbed AI Option

### Setup
- Add feature flag (e.g., `AI_EVAL_STUB=1`) in Ops app `.env` and worker env.  
- Worker: short-circuit AI call in `ai-evaluator.ts` when flag is on by selecting a payload from a predefined mock array (varied scores/labels) so UI states can be exercised:
  ```ts
  const STUB_RESPONSES = [
    { score: 92, label: 'A', recommendation: 'approve', summary: 'High income, stable job.', risk_flags: [], fraud_signals: [] },
    { score: 68, label: 'B', recommendation: 'approve_with_conditions', summary: 'Moderate risk, verify employment.', risk_flags: ['employment_duration_short'], fraud_signals: [] },
    { score: 35, label: 'C', recommendation: 'reject', summary: 'Insufficient income.', risk_flags: ['income_insufficient'], fraud_signals: ['suspicious_bank_statement'] }
  ];
  const stub = STUB_RESPONSES[Math.floor(Math.random() * STUB_RESPONSES.length)];
  ```
- Cron worker should still mark job `completed`, set `evaluation_id`, and persist audit entry.

### Tests
1. Open `/admin/applications`, pick property and application lacking AI score.
2. Click `AI Evaluation` → verify pane transitions to `Queued` → close/reopen to see stubbed score.
3. Force duplicate submission to confirm duplicate guard message surfaces even when stub active.
4. Exhaust quota (set `evaluation_count` >= limit in DB) → UI should show quota exceeded error + Stripe TODO notice.
5. Assert activity log entries recorded with stub metadata (label indicates stub run for traceability).

---

## Part B – Real AI Option

### Setup
- Disable stub flag (unset or `AI_EVAL_STUB=0`).
- Upload sample documents to R2 for the target application (government ID, paystub, bank statement).
- Ensure Workers AI bindings + secrets configured; run `npx wrangler tail` for cron worker.

### Tests
1. Create evaluation from application detail pane.
2. Wait for cron to fire (or trigger manually via `wrangler dev --test-scheduled`) and confirm logs show successful inference.
3. Reopen AI pane → score/summary should reflect AI output, not stub.
4. Ensure timeline + activity log show real timestamps/model version.
5. Trigger “missing documents” scenario by removing docs and attempting re-run; pane should display `Failed — missing required documents` message.
6. Verify identity dedup warnings still render when duplicate applicant detected (if applicable data exists).

---

## Regression Checklist
- [ ] Application board filters and navigation still function during testing.
- [ ] Quota tab (Task 3.2) updates usage counts after stub + real runs.
- [ ] Settings changes persist in D1.
- [ ] Audit table (`ai_evaluation_audit`) records both stub + real events with correct `action` values.
- [ ] No stale loading states after the single follow-up fetch (Task 3.1 behavior).

---

## Deliverables
- Test log (can be markdown or ticket comment) summarizing both stubbed and real runs.
- Screenshots or Loom of the AI pane in both modes.
- Confirmation that cron + worker logs show expected entries (attach tail excerpts).
