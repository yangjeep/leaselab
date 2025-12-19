# Application Progress Workflow - Quick Reference

**Status**: In Progress  
**Last Updated**: 2025-12-17  
**Owner**: Ops Experience Pod

---

## 🎯 What It Solves

Locks the new property-centric application experience behind a guided, auditable workflow so leasing teams advance applications only when the right documents, AI signals, and manual reviews are in place.

**Highlights**
- ✅ Stage gating with explicit "checker" lists before advancing
- ✅ Consistent confirmation dialogs per action, with stage-specific buttons
- ✅ Visibility into property-level shortlists before final decisions
- ✅ Lease prep workflow split out so approvals stay focused on screening

---

## 🔄 Workflow Snapshot

```
Application Board → Property Application List → Application Detail w/ StageWorkflow
                                      ↓
                              Lease Preparation (separate flow)
```

- Property-centric board + list are inherited from [Property-Centric Application Workflow](./property-centric-application-workflow.md).
- The detail view layers the Application Progress workflow on top of the existing AI pane & document viewer.

---

## 🧩 Stage Guardrails

| Stage | Checker Requirements | Confirmation Dialog | Primary Actions |
|-------|----------------------|---------------------|-----------------|
| **Documents** | Checklist of files (ID, income proof, references, etc.) rendered above the dialog as a tappable list; each row is a checkbox tied to stored document metadata. | "Mark Docs Complete" modal recaps missing files and warns about moving forward without them. | `Request Missing Docs`, `Docs Received` |
| **AI Screening** | Auto-run AI job status & score; UI blocks progress if job pending unless user explicitly bypasses. | Confirmation summarizes AI score + risk flags; includes bypass reason dropdown when AI pending. | `Re-run AI`, `Bypass Screening`, `Continue to Background` |
| **Background Check** | Internal notes field required before moving on; show background vendor status + manual checklist. | Dialog highlights open tasks, pre-fills note preview, and requires picking next action. | `Shortlist`, `Reject`, `Request More Info` |
| **Decision** | Aggregates all `shortlisted` applicants for the same property into a list view; cannot approve unless at least one shortlisted record exists. | Approval dialog surfaces competing applicants + rent details to force comparison acknowledgement. | `Approve Selected`, `Send Declines`, `Back to List` |
| **Lease Preparation** | Moves applicant into dedicated lease workflow (DocuSign / template builder). StageWorkflow hands off rather than showing inline actions. | Separate wizard initializes lease terms; confirmation ensures assigned workflow owner. | `Start Lease Prep` |

---

## ✅ Step-by-Step Behavior

### 1. Documents Stage
- **Checker list** pulls from `application_documents` table and pins to top of the modal for quick scanning.
- Each file row includes storage key, timestamp, and preview link, doubling as a checklist (green check = received).
- Moving forward triggers `docs-complete` confirmation; missing files require selecting `Proceed Anyway` (logs exception).

### 2. AI Screening Stage
- Renders AI summary card (score, label, risk tags) + job status pill.
- If job is `pending`, show `Run Again` + `Bypass` buttons with confirmation reason dropdown (`AI offline`, `Manual override`, etc.).
- Dialogue enforces acknowledging latest AI output before proceeding.

### 3. Background Check Stage
- Adds inline **Internal Notes** textarea (persisted to `application_internal_notes`).
- Stage footer exposes `Shortlist` and `Reject` buttons; each opens confirmation capturing note + optional template email.
- Shortlisting tags the application and increments the property-level shortlist count used by Decision stage.

### 4. Decision Stage
- Pulls all applications flagged as `shortlisted` for the property and shows them in a two-column comparison list (score, rent, move-in date, documents completeness).
- `Approve Selected` returns user to property list with the winning applicant in focus and automatically triggers bulk decline modals for the remaining shortlist.
- Staying in Decision stage keeps the shortlist view active until all shortlists resolved.

### 5. Lease Preparation Handoff
- Clicking `Start Lease Prep` opens a separate workflow route (e.g., `/admin/leases/:applicationId/setup`).
- StageWorkflow marks current application as `lease_prep` and collapses the previous progress bar, emphasizing that lease docs have their own checklist (signatories, rent terms, payment schedule).

---

## 🛠️ Implementation Notes

- Extend `StageWorkflow` component to accept per-stage `checkers`, `dialogs`, and `actions` definitions via config (JSON schema stored alongside application record).
- Add `application_stage_transitions` table to capture confirmation metadata (missing docs overrides, bypass reasons, notes).
- Introduce `shortlisted_at` + `shortlisted_by` fields on applications to power the Decision aggregation query.
- Lease prep workflow reuses existing document automation but launches under a new Remix route + queue job for templating.

---

## 🔗 Related Documents

- [Property-Centric Application Workflow](./property-centric-application-workflow.md)
- [AI Tenant Intelligence README](../202512-ai-tenant-intelligence/README.md)
- [StageWorkflow component (code)](../../../apps/ops/app/components/StageWorkflow.tsx)
