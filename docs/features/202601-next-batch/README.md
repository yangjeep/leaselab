# 2026-01 Next Batch Features (Ops + Storefront + Owner Intelligence)

**Status**: Draft  
**Last Updated**: 2025-12-23

This document defines the **next batch of features** to implement across the Worker API, Ops dashboard, and Storefront.

---

## Guiding Principles

- **System of record lives in Worker**: Ops/Site are clients; Worker owns validation, writes, and auditing.
- **Async where needed**: Email delivery, reminders, and AI workflows must be retryable, observable, and idempotent.
- **RBAC first**: New surfaces (tenant portal, owner analytics) ship behind roles and per-property access control.
- **Composable storage**: Reuse the existing R2 upload/download approach for attachments and generated documents.

---

## 1) Email Handling Route + Email Worker

### Goals
- Send outbound emails from the platform (Ops-triggered and system-triggered).
- Persist a **communication record** for every email attempt (including failures/retries).
- Support “email transfer” workflows that reconcile inbound/outbound payment-related emails into **payment records**.

### Proposed Architecture
- **Worker API** exposes an Email API for “intent” and templates; it does **not** synchronously deliver in request path.
- A dedicated **email-worker** performs delivery, retries, and webhooks ingestion.

```
Ops/Site → Worker API (create email intent) → Queue → email-worker → Email Provider
                                           ↘ persist communications ↙
Email Provider (webhooks) → email-worker → Worker API/DB (delivery + inbound events)
```

### Data Model (new)
- `communication_threads` (optional, for grouping): `id`, `type`, `subject`, `tenant_id?`, `application_id?`, `work_order_id?`, `created_at`
- `communications`: `id`, `thread_id?`, `channel='email'`, `direction='outbound|inbound'`, `from`, `to`, `cc?`, `bcc?`, `subject`, `body_text?`, `body_html?`, `status='queued|sent|delivered|bounced|failed'`, `provider_message_id?`, `error?`, `metadata_json`, `created_at`, `sent_at?`
- `email_idempotency_keys`: `key`, `communication_id`, `created_at`
- Payment email transfer (minimum viable):
  - `payment_import_jobs`: `id`, `source='email'`, `status`, `raw_payload_key` (R2), `parsed_json`, `created_at`

### API Surface (draft)
- `POST /api/ops/emails` — create outbound email intent (returns `communication_id`)
- `GET /api/ops/communications?entity=tenant|application|work_order&id=...`
- `POST /api/email/webhooks/provider` — provider callbacks (signature-verified)

### Worker/Queue Contracts
- Queue message: `{ communication_id, attempt, idempotency_key }`
- Idempotency rule: the same `idempotency_key` must not produce multiple sends.

### Acceptance Criteria
- Ops can send a templated email; delivery happens asynchronously.
- Every attempt creates/updates `communications` with status transitions and timestamps.
- Webhook events update status (`delivered/bounced/complained`) and persist raw payload for audit/debug.
- Email transfer MVP can ingest a payment-related email payload into a reviewable `payment_import_job`.

### Open Questions
- Email provider choice (Postmark/SendGrid/Mailgun) and webhook event model.
- Template system: stored templates vs. code-driven templates with variables.
- Inbound email routing: provider-managed inbound parsing vs. “reply-to” threading only.

---

## 2) N1, N4, N11 Scheduling + Reminders (Ops)

### Problem Statement
Ontario notices have strict timelines. Ops needs a reliable way to:
- Track notice lifecycle (draft → served → effective date).
- Receive reminders before critical dates.
- Ensure documents are stored and retrievable.

### Proposed Scope
- N1 (rent increase), N4 (non-payment termination), N11 (mutual agreement termination):
  - Create a notice record, attach generated/uploaded PDF, track key dates.
  - Automatic reminders (Ops notifications + email optional).

### Data Model (new)
- `tenant_notices`: `id`, `type='n1|n4|n11'`, `tenant_id`, `property_id`, `status='draft|served|void|effective|completed'`, `served_on`, `effective_on`, `reminder_schedule_json`, `document_id?`, `notes`, `created_by`, `created_at`
- `notice_events`: `id`, `notice_id`, `type`, `payload_json`, `created_at`

### UX (Ops)
- Tenant detail: “Notices” tab (list + create).
- Notice form:
  - Type-specific fields (served date, effective date auto-calc, rent amounts for N1, arrears for N4, signatures for N11).
  - Attach/upload PDF (reuse file storage).
- Reminder center: filtered list of “upcoming” items.

### Reminders (async)
- Scheduled reminders via:
  - (Preferred) Worker cron + DB query for “due reminders” + enqueue messages
  - Or Durable Object scheduler per notice (if already standard in repo)

### Acceptance Criteria
- Create/edit/void a notice; status and dates persist.
- Reminders appear in Ops dashboard and/or email with clear actions.
- Notice document stored in R2 and linked to the notice record.

### Open Questions
- Date rules by province/region (if multi-jurisdiction); initial implementation assumes Ontario-only.
- Legal copy + template generation approach (PDF generator vs. upload-only at first).

---

## 3) Intake Form Customization (Settings)

### Goal
Allow Ops admins to customize application intake fields without code deploys.

### Requirements
- Per-site configuration of:
  - Visible sections (personal, employment, pets, vehicles, references, etc.)
  - Field labels and help text
  - Required/optional
  - Option lists for select/radio
  - “Custom questions” (typed: text, number, date, single-select, multi-select)

### Data Model (new)
- `settings_intake_forms`: `site_id`, `schema_json`, `version`, `updated_by`, `updated_at`
- `application_intake_answers`: `application_id`, `schema_version`, `answers_json`, `created_at`, `updated_at`

### API Surface (draft)
- `GET /api/ops/settings/intake-form`
- `PUT /api/ops/settings/intake-form` (validates schema; increments version)
- `GET /api/site/intake-form` (public to Storefront but scoped to site)

### Acceptance Criteria
- Admin can edit a schema safely (with validation + preview).
- Storefront renders the form dynamically and submits answers.
- Schema versioning prevents “broken old applications”.

### Open Questions
- Migration policy for existing applications when schema changes.
- Whether custom questions are per-property vs. per-site (start per-site).

---

## 4) Work Orders: Photo/Video Attachments

### Goal
Support rich evidence for maintenance requests while keeping storage secure and cost-aware.

### Scope
- Tenants/Ops can attach images/videos to a work order.
- Ops can preview media and download originals.
- Optional: compress/thumbnail images for list/detail performance.

### Data Model (extend)
- `work_order_attachments`: `id`, `work_order_id`, `document_id`, `kind='image|video|other'`, `created_by_role`, `created_at`

### Storage
- Reuse presigned R2 upload/download flow.
- Enforce:
  - max file size by type (video separate from image)
  - allowed MIME types
  - virus scan hook (optional future)

### Acceptance Criteria
- Upload one or more attachments from work order create/edit.
- Preview works for common formats (jpg/png/mp4/mov).
- Permission checks: tenant sees only their unit/property work orders; ops sees within site.

---

## 5) Storefront: Login-Protected Tenant Portal

### Goals
- A tenant-facing portal for: work orders, documents, lease basics, payment history (as available).
- Protected by authentication suitable for tenants (email magic link, passcode, or invite token).

### Proposed UX
- `/portal` landing:
  - sign-in via email magic link (primary)
  - optional “code from manager” flow (fallback)
- Portal sections:
  - Work Orders (create + status tracking)
  - Documents (lease, notices, receipts)
  - Payments (view-only MVP; future pay)
  - Profile (contact info)

### Data Model (new/extend)
- `tenant_portal_sessions` (if not reusing existing session system): `id`, `tenant_id`, `expires_at`, `created_at`
- `tenant_invites`: `id`, `tenant_id`, `email`, `token_hash`, `expires_at`, `created_at`

### Security/Access
- Tenant identity must be tied to a `tenant_id` with property/unit membership.
- Rate-limit sign-in endpoints; audit successful/failed logins.

### Acceptance Criteria
- Tenant can sign in and view their own data only.
- Tenant can create a work order with attachments (ties into feature #4).
- All portal API calls enforce tenant scope.

---

## 6) Roles: Owner, Property Manager, Super-Tenant + RBAC in Ops

### Goal
Introduce role-based access control for new and existing Ops surfaces.

### Roles
- `ops_admin`: full site access
- `property_manager`: limited to assigned properties (and sub-resources)
- `owner`: read-only financial + property performance (and selected operational visibility)
- `super_tenant`: tenant portal with expanded capabilities (e.g., manage roommates, approve work order access windows)

### Data Model (new/extend)
- `users.roles` (if not present): `role`, `site_id`, `created_at`
- `property_assignments`: `user_id`, `property_id`, `created_at`
- `role_permissions` (optional if not hard-coded): `role`, `permission`, `created_at`

### Permissioning Model (draft)
- Use permission strings like `work_orders:read`, `work_orders:write`, `notices:write`, `financials:read`.
- Enforce at:
  - Worker route middleware (authoritative)
  - Ops UI route guards (UX only)

### Acceptance Criteria
- A property manager can only see assigned properties, tenants, work orders.
- An owner can access only owner dashboards and property-level reporting.
- Super-tenant is limited to their unit/property scope, with explicit elevated actions gated.

### Open Questions
- Whether “owner” is a `user` or separate entity (recommended: `users` with role + property assignments).
- Cross-site ownership (multi-site) model.

---

## 7) Owner Financial Intelligence（财务智能）

### 目标 / Goal
为房东提供多场景的资产决策分析，而非静态报表：
- IRR / cap rate / 估值区间
- 利率变化与再融资可行性分析
- 现金流压力测试（空置率、维修、税费、利率）

### MVP（建议）
- 输入：当前租金、运营成本、贷款信息（利率/期限/剩余本金）、可选市场假设（租金增长、空置率）
- 输出：
  - IRR、cap rate
  - 估值区间（基于 cap rate 区间 + 可比假设）
  - refinance 场景：新利率下月供、DSCR、现金流变化

### Data Model (new)
- `owner_financial_models`: `id`, `property_id`, `assumptions_json`, `results_json`, `created_by`, `created_at`

### Acceptance Criteria
- Owner can run scenarios and save snapshots.
- Calculations are explainable (show assumptions and formulas used).

---

## 8) AI-Driven Lease Execution（AI 驱动租约执行）

### Goal
房东确认后由 AI agent 接管租约生成与执行流程：资料收集、沟通、签署推进；房东只做最终审批。

### MVP Workflow
1. Ops/Owner selects “Start Lease Execution”
2. AI requests missing info/documents (tenant + owner), tracks checklist
3. Generates lease draft (template + variable fill) and routes for review
4. Sends signature requests (integrate with e-sign provider later; start with PDF + email)
5. Stores signed artifacts and updates lease status

### Key Requirements
- Human-in-the-loop approval gates (owner must approve before send/sign).
- Full audit log of AI actions and messages.

### Acceptance Criteria
- A lease execution run maintains a checklist and status visible to Ops/Owner.
- Lease draft output is stored and versioned; approvals are recorded.

---

## 9) Renewal & Rent Decision Support（续约与涨租建议）

### Goal
在到期前给出可解释的建议（市场、租客、风险权衡），而不是自动执行。

### MVP Inputs/Signals
- Lease expiry date + tenant payment history
- Property vacancy rate / demand proxy
- Market rent estimate (manual entry first; integrate data later)
- Risk factors (late payments, work order frequency, complaints)

### Outputs
- Recommendation: renew / increase / hold / non-renew (with confidence + reasons)
- Suggested rent range + notice timeline (ties into N1 scheduling)

### Acceptance Criteria
- Ops/Owner sees renewal recommendations 60/90/120 days before expiry.
- Recommendations cite the data used and can be overridden with notes.

---

## 10) Smart Maintenance Triage（智能维修分级）

### Goal
对维修请求进行安全与风险分级，引导租客自助处理低风险问题，同时保持房东全程可见与可控。

### MVP
- Intake questionnaire + media
- Classifier produces:
  - severity: low/medium/high/emergency
  - suggested next steps (self-help checklist vs. immediate dispatch)
  - escalation rules (gas leak, water leak, electrical hazards)

### Acceptance Criteria
- Tenant portal guides the tenant through safety questions before submitting.
- Ops sees triage label and recommended actions; can override.

---

## 11) Property Health Monitoring（资产健康监控）

### Goal
基于历史工单与季节因素识别系统性维护风险，并提前提示预防性检查与换季准备。

### MVP
- Aggregate signals:
  - repeated work orders by category
  - age of major systems (if tracked)
  - seasonal triggers (winterization, HVAC service)
- Output:
  - “health score” + top risk items
  - recommended preventive checklist

### Acceptance Criteria
- Ops/Owner dashboard shows top risks and recommended preventive tasks per property.
- Recommendations link back to evidence (work order history).

---

## 12) Ops UX & Workflow Improvements

### Overview
Streamline core workflows in the Ops dashboard to reduce friction and improve operational efficiency. These improvements focus on better defaults, multi-select capabilities, and clearer separation of active vs. historical records.

---

### 12.1) Unit-Level Application View (Default)

**Problem Statement**
Currently applications may be organized at the property level, which creates extra navigation steps when properties have multiple units. Most operational decisions happen at the unit level.

**User Stories**

- **As a property manager**, I want to see applications organized by unit by default, so that I can quickly identify which specific unit each applicant is interested in without additional clicks.

- **As an ops admin**, I want the ability to toggle between unit-level and property-level views, so that I can choose the grouping that makes sense for my current task (e.g., property-level when reviewing overall demand).

- **As a property manager reviewing applications**, I want each application card/row to prominently display the unit identifier (e.g., "Unit 2B"), so that I can immediately understand which unit is being applied for.

**Acceptance Criteria**

- Default view for `/applications` route is grouped/filtered by unit.
- Each application displays unit information prominently in list and detail views.
- A view toggle (unit vs. property) is available and persists user preference (session/localStorage).
- Filtering and sorting work correctly in both unit and property views.

**Open Questions**

- Should "unit view" be a nested route (`/properties/:id/units/:unitId/applications`) or a filter/grouping option?
- How to handle properties with no explicit units (e.g., single-family homes)?

---

### 12.2) Multi-Select Operations for Applications + "Proceed to Lease" in Shortlist

**Problem Statement**
Processing multiple applications for the same property/unit involves repetitive actions. The "Shortlist" stage is the natural point to transition to lease creation, but this action is currently not streamlined.

**User Stories**

- **As a property manager**, I want to select multiple applications within the same property/unit using checkboxes, so that I can perform bulk actions like rejection or status updates without clicking each one individually.

- **As a property manager in the Shortlist view**, I want a "Proceed to Lease" button for selected applications, so that I can quickly initiate lease creation for approved applicants.

- **As a property manager**, I want multi-select to be restricted to applications within the same property/unit, so that I don't accidentally perform incompatible bulk actions across different units.

- **As an ops admin**, I want bulk actions to include: bulk reject, bulk move to next stage, bulk archive, and bulk email, so that I can handle common workflows efficiently.

**Acceptance Criteria**

- Checkboxes appear on application list items; selecting multiple applications enables bulk action toolbar.
- Bulk actions are scoped to a single property/unit (UI prevents cross-unit multi-select).
- "Proceed to Lease" button is available in Shortlist view when exactly one application is selected (or configurable for multiple if co-tenants supported).
- Bulk actions show a confirmation modal with a summary of affected applications.
- All bulk actions are audited (who performed, which applications, when).

**Open Questions**

- Should "Proceed to Lease" support multiple applicants (roommates/co-tenants) in one action?
- What happens to other shortlisted applications for the same unit when one proceeds to lease?

---

### 12.3) Multi-Select and Bulk Operations in Lease and Tenant Views

**Problem Statement**
Similar to applications, lease and tenant management involves repetitive tasks that would benefit from batch processing.

**User Stories**

- **As a property manager**, I want to select multiple leases using checkboxes, so that I can perform bulk operations like sending renewal reminders, updating status, or generating reports.

- **As an ops admin**, I want to select multiple tenant records, so that I can bulk send notices, update contact information templates, or export tenant data.

- **As a property manager**, I want bulk operations on leases to include: bulk status update, bulk document generation (e.g., renewal letters), bulk email, and bulk export, so that I can handle end-of-term workflows efficiently.

- **As an ops admin**, I want bulk operations on tenants to include: bulk email, bulk document send, bulk tag/categorize, and bulk export, so that I can communicate with or organize groups of tenants quickly.

**Acceptance Criteria**

- Checkboxes appear on lease and tenant list views.
- Multi-select enables a bulk action toolbar with relevant operations.
- Bulk actions are transaction-safe (all succeed or all fail with clear error messaging).
- Audit log records all bulk operations with user, timestamp, and affected records.
- UI provides clear feedback during bulk operations (progress indicator, success/failure summary).

**Open Questions**

- Should bulk operations be limited by quantity (e.g., max 50 at once) to prevent performance issues?
- Which bulk operations should require additional confirmation (e.g., bulk termination)?

---

### 12.4) Separate Views: Existing Leases vs. Leases in Progress

**Problem Statement**
The current "Lease" section mixes active/historical leases with new leases being created from applications. This creates clutter and makes it harder to track in-progress onboarding vs. ongoing lease management.

**User Stories**

- **As a property manager**, I want a clear separation between "Leases" (active and historical) and "Leases in Progress" (applications converting to leases), so that I can focus on the right workflow at the right time.

- **As an ops admin starting a new lease from an approved application**, I want to land in a "Leases in Progress" view with a guided workflow (checklist, missing docs, signatures), so that I can track onboarding completion clearly.

- **As a property manager managing existing leases**, I want the "Leases" view to default to active leases with easy access to historical/terminated leases, so that my primary workspace isn't cluttered with past records.

- **As an ops admin**, I want "Leases in Progress" to show a progress indicator (e.g., "3 of 7 steps complete") for each pending lease, so that I can prioritize which leases need attention.

**Acceptance Criteria**

- Two distinct routes/tabs: `/leases` (existing, active/historical) and `/leases/in-progress` (new leases from applications).
- "Leases in Progress" view includes:
  - Checklist or progress indicator per lease
  - Ability to request missing documents, send signature requests
  - Transition to "Leases" upon completion
- "Leases" view defaults to active leases; filter/toggle to show terminated/historical.
- Clear navigation between the two views (e.g., tabs, sidebar sections).
- Badge/count on "Leases in Progress" shows number of pending leases.

**Open Questions**

- At what point does a "Lease in Progress" become an active "Lease"? (First signature? All signatures? Move-in date?)
- Should "Leases in Progress" integrate with the AI lease execution workflow (feature #8)?

---

### 12.5) Work Orders: Default View "Open & In-Progress"

**Problem Statement**
The current work order list may default to showing all work orders (including completed/closed), which makes it harder to focus on actionable items.

**User Stories**

- **As a property manager**, I want the work orders page to default to showing only "Open" and "In-Progress" work orders, so that I immediately see what requires my attention.

- **As an ops admin**, I want quick access to filter toggles for "All", "Open & In-Progress", "Completed", and "Cancelled", so that I can switch contexts when needed (e.g., reviewing history).

- **As a property manager**, I want the work order list to visually distinguish between "Open" (not started) and "In-Progress" (actively being worked on), so that I can prioritize follow-ups appropriately.

- **As a property manager**, I want to see a count/badge of "Open & In-Progress" work orders in the navigation, so that I'm aware of pending workload at a glance.

**Acceptance Criteria**

- `/work-orders` route defaults to showing only `status IN ('open', 'in_progress')`.
- Filter controls allow toggling to "All", "Completed", "Cancelled" views; selection persists in session.
- Visual distinction between "Open" and "In-Progress" (e.g., color coding, icons).
- Navigation badge shows count of open + in-progress work orders.
- Default view is performant even with many historical work orders (proper indexing/pagination).

**Open Questions**

- Should "Urgent" or "Emergency" work orders be surfaced separately or just within the "Open & In-Progress" view with visual priority indicators?
- Should there be a separate "Overdue" filter/view for work orders past their expected completion date?

---

## Cross-Feature Dependencies

- #4 (Work order media) depends on file storage primitives already implemented.
- #5 (Tenant portal) depends on #6 (RBAC) for clean authorization boundaries.
- #2 (Notices) benefits from #1 (Email) for delivery + reminders.
- #9 (Renewal support) depends on #2 (N1) for timelines and optional notice generation.
- #12.2 (Proceed to Lease from Shortlist) depends on #12.4 (Leases in Progress workflow).
- #12.4 (Leases in Progress) may integrate with #8 (AI lease execution) for guided workflows.

