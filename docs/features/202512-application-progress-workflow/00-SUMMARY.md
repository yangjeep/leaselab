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
- ✅ Multi-applicant intake (primary + co-applicants captured at the form level) carried through every stage
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
| **Documents** | Checklist grouped by applicant (primary + co-applicants) rendered above the dialog; each row is a checkbox tied to stored document metadata. | "Mark Docs Complete" modal recaps missing files per applicant and warns about advancing with gaps. | `Request Missing Docs`, `Docs Received` |
| **AI Screening** | Auto-run AI job status & score; each applicant surfaces an AI label, plus a combined household score. UI blocks progress if any job pending unless user bypasses. | Confirmation summarizes per-applicant scores + risk flags; includes bypass reason dropdown when any result pending. | `Re-run AI`, `Bypass Screening`, `Continue to Background` |
| **Background Check** | Internal notes field required before moving on; show background vendor status + manual checklist for every applicant. | Dialog highlights open tasks, pre-fills note preview grouped by applicant, and requires picking next action. | `Shortlist`, `Reject`, `Request More Info` |
| **Decision** | Aggregates all `shortlisted` applicants for the same property into a list view; each card expands to show every applicant on that file. Cannot approve unless at least one shortlisted record exists. | Approval dialog surfaces competing applicant files + rent details to force comparison acknowledgement. | `Approve Selected`, `Send Declines`, `Back to List` |
| **Lease Preparation** | Moves applicant into dedicated lease workflow (DocuSign / template builder). StageWorkflow hands off rather than showing inline actions. | Separate wizard initializes lease terms; confirmation ensures assigned workflow owner. | `Start Lease Prep` |

---

## ✅ Step-by-Step Behavior

### 1. Documents Stage
- **Checker list** pulls from `application_documents` table, buckets rows per applicant, and pins to top of the modal for quick scanning.
- Each file row includes storage key, timestamp, applicant name, and preview link, doubling as a checklist (green check = received).
- Moving forward triggers `docs-complete` confirmation; missing files require selecting `Proceed Anyway` (logs exception).

### 2. AI Screening Stage
- Renders AI summary card (score, label, risk tags) + job status pill for each applicant as well as a combined household score.
- If any job is `pending`, show `Run Again` + `Bypass` buttons with confirmation reason dropdown (`AI offline`, `Manual override`, etc.).
- Dialogue enforces acknowledging latest AI output before proceeding.

### 3. Background Check Stage
- Adds inline **Internal Notes** textarea (persisted to `application_internal_notes`), plus quick chips to tag which applicant the note references.
- Stage footer exposes `Shortlist` and `Reject` buttons; each opens confirmation capturing note + optional template email.
- Shortlisting tags the full application file and increments the property-level shortlist count used by Decision stage.

### 4. Decision Stage
- Pulls all applications flagged as `shortlisted` for the property and shows them in a two-column comparison list (score, rent, move-in date, documents completeness, household composition).
- `Approve Selected` returns user to property list with the winning applicant file in focus and automatically triggers bulk decline modals for the remaining shortlist.
- Staying in Decision stage keeps the shortlist view active until all shortlists resolved.

### 5. Lease Preparation Handoff
- Clicking `Start Lease Prep` opens a separate workflow route (e.g., `/admin/leases/:applicationId/setup`).
- StageWorkflow marks current application as `lease_prep` and collapses the previous progress bar, emphasizing that lease docs have their own checklist (signatories, rent terms, payment schedule, occupant roster).

### Multi-Applicant Handling (Form Change)
- Guest-facing application introduces “Add Co-Applicant” controls so applicants can invite roommates/co-signers during intake; form stores each profile under `application_applicants`.
- Primary applicant can optionally defer entering co-applicant details by sending invite links; ops can still add applicants manually from the detail view.
- Every stage component pulls from `application_applicants` and gracefully renders a single card if only the primary applicant exists.
- Export/reporting flows treat the full file as a household while still exposing each applicant's metadata for compliance.

---

## 🛠️ Implementation Notes

- Extend `StageWorkflow` component to accept per-stage `checkers`, `dialogs`, and `actions` definitions via config (JSON schema stored alongside application record).
- Add `application_stage_transitions` table to capture confirmation metadata (missing docs overrides, bypass reasons, notes).
- Introduce `application_applicants` table (primary + co-applicants) with linkage to documents, AI scores, and background checks; add `primary_applicant_id` pointer on the application record, plus guest-facing form fields + invite tokens.
- Add `shortlisted_at` + `shortlisted_by` fields on applications to power the Decision aggregation query.
- Lease prep workflow reuses existing document automation but launches under a new Remix route + queue job for templating, ensuring all applicants feed into lease signatory wizard.

---

## 🔗 Related Documents

- [Property-Centric Application Workflow](./property-centric-application-workflow.md)
- [AI Tenant Intelligence README](../202512-ai-tenant-intelligence/README.md)
- [StageWorkflow component (code)](../../../apps/ops/app/components/StageWorkflow.tsx)
