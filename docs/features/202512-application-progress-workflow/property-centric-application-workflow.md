# Property-Centric Application Workflow

**Status**: In Progress
**Priority**: High
**Last Updated**: 2025-12-17
**Estimated Effort**: 4-5 hours
**Dependencies**: AI Tenant Intelligence MVP (completed), [Application Progress Workflow](./00-SUMMARY.md)

---

## Overview

Restructure the application screening workflow to be property-centric, making it easier for property managers to review applications organized by property and ranked by AI scores.

## Current State (MVP)

- Applications accessible via Leads list
- AI Evaluation pane available on lead detail pages
- Functional but not optimized for multi-property screening workflows

## Proposed Enhancement

### 1. Application Board (`/admin/applications`)

Global mission control showing all properties with pending applications.

**Features:**
- Grid of property cards showing:
  - Property name, location, unit count
  - Pending application count badge
  - Next showing date
- Filters:
  - Search by property name/city
  - High volume properties (10+ apps)
  - Needs review (missing AI scores)
- Quick actions:
  - New Application
  - Go to Property

### 2. Property Application List (`/admin/properties/:propertyId/applications`)

Dedicated view per property showing all applications ranked by AI score.

**Features:**
- Two-column layout:
  - Left: Unit list + filters
  - Right: Applications list
- Default sort: `ai_score DESC NULLS LAST`
- Application cards showing:
  - Status chips (new, docs received, AI evaluated)
  - AI label (A/B/C) and score
  - Monthly income summary
  - Document completeness indicator
  - Household badge (primary applicant + co-applicant count when present)
- Filters:
  - Stage (New/Docs Received/AI Evaluated)
  - Minimum AI Score slider
  - Document completeness
- Row actions:
  - View Details
  - Run AI
  - Mark as Contacted

### 3. Application Detail Page (`/admin/properties/:propertyId/applications/:applicationId`)

Comprehensive application view with property context.

**Features:**
- Header: Applicant info, contact buttons, stage, AI label
- Tabs: Overview, Documents, Activity, AI Notes
- Reuses existing AI Evaluation pane
- Inline file viewer with R2 docs
- Sticky action bar: Approve, Reject, Request Docs, Send Email
- StageWorkflow guardrails: Step-specific checker lists, confirmation dialogs, and actions defined in [Application Progress Workflow](./00-SUMMARY.md)
- Household view: Primary applicant highlighted with expandable list of co-applicants (documents, AI scores, background status)

### 4. Multi-Applicant Intake (Form-Level)

Updates to the public-facing application form ensure households are captured in a single submission.

**Features:**
- Add “Add Co-Applicant/Roommate” modules so primary applicant can enter up to N applicants inline.
- Optional “Send Invite” flow emails a secure link so co-applicants can fill in their section asynchronously.
- Each applicant section mirrors the existing form fields (identity, employment, references) and ties back to the same application ID.
- Admin UI surfaces pending invites + completion status so ops can nudge applicants from the property detail page.

## Navigation Flow

```
Applications Board
    ↓ (select property)
Property Application List (ranked by AI score)
    ↓ (select application)
Application Detail + AI Evaluation Pane
```

## Technical Implementation

### Routes to Create

```typescript
// 1. Global board
apps/ops/app/routes/admin.applications._index.tsx

// 2. Property-specific list
apps/ops/app/routes/admin.properties.$propertyId.applications._index.tsx

// 3. Application detail
apps/ops/app/routes/admin.properties.$propertyId.applications.$applicationId.tsx
```

### New Components

```typescript
// Shared UI components
apps/ops/app/components/applications/ApplicationBoardCard.tsx
apps/ops/app/components/applications/ApplicationListItem.tsx
apps/ops/app/components/applications/AiScoreBadge.tsx
```

### Backend Changes

- Update queries to join `ai_score` and `ai_label` with applications
- Add filtering/sorting support for score-based ranking
- Optimize queries for property-grouped application lists
- Introduce `application_applicants` join so each application record can surface a primary + optional co-applicants (documents, AI, screening status) sourced from the enhanced guest intake form

## Edge Cases

- Properties with 0 applications: Empty state + share link CTA
- Properties with AI disabled: Warning banner + Settings link
- Applications without documents: Highlight missing uploads
- Mobile: Single-column layout, full-screen modal for pane

## Success Metrics

- Reduced time to review applications per property
- Increased usage of AI evaluation feature
- Faster decision-making on high-volume properties

## Relationship to Application Progress Workflow

This document covers the navigation and UI scaffolding for a property-first experience. To keep the flow compliant and audit-friendly:

1. Every stage transition in this UI defers to the guardrails defined in [Application Progress Workflow](./00-SUMMARY.md).
2. Property-level shortlists are surfaced automatically when the Decision stage is active.
3. Lease Preparation launches as a separate workflow once an applicant is approved, maintaining a clean split between screening and lease execution.
4. Multi-applicant households share a single application file; this UI shows applicant badges wherever a single name previously appeared so ops can manage co-applicants without changing the public intake form.

## Related Features

- [AI Tenant Intelligence MVP](../202512-ai-tenant-intelligence/README.md)
- [Task 3.3 Original Spec](../202512-ai-tenant-intelligence/tasks/ai-task-3.3-application-workflow.md)

---

**Note**: This enhancement can be implemented after the AI Tenant Intelligence MVP is deployed and validated in production.
