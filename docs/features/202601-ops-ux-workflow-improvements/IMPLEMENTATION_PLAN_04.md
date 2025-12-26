# Feature 04 Implementation Plan: Separate Views - Existing Leases vs. Leases in Progress

**Feature ID**: 202601-UX-04
**Status**: In Progress
**Start Date**: 2025-12-25
**Target Completion**: TBD

---

## Overview

Implement two distinct lease management views: "Leases" for active/historical leases and "Leases in Progress" for new leases being onboarded. This feature includes a guided checklist workflow to track lease onboarding completion.

---

## Technical Approach

### Database Changes Required
- Add `onboarding_status` column to leases table
- Create `lease_onboarding_checklists` table
- Migration script for existing leases

### Key Components
- Leases in Progress list view
- Checklist UI component with progress indicator
- Checklist update API
- Modified existing Leases view (defaults to active)
- Navigation updates with badge counts

---

## Implementation Phases

### Phase 1: Database Schema & Migration (2-3 hours)
**Goal**: Add database support for lease onboarding tracking

**Tasks**:
1. Create migration 0012 for schema changes
   - Add `onboarding_status` column to leases (nullable TEXT)
   - Create `lease_onboarding_checklists` table
   - Add indexes for performance
2. Create database helper functions
   - `getLeaseChecklist()`
   - `updateChecklistStep()`
   - `completeLeaseOnboarding()`
3. Define standard checklist steps (7 steps)
4. Test migration on local/preview database

**Files to Create**:
- `scripts/migrations/0012_lease_onboarding.sql`
- `apps/worker/lib/db/lease-onboarding.ts` (new helper file)

**Schema Details**:
```sql
-- Add onboarding_status to leases
ALTER TABLE leases ADD COLUMN onboarding_status TEXT;
-- Values: null (active/terminated), 'in_progress', 'completed'

-- Create checklist table
CREATE TABLE lease_onboarding_checklists (
  id TEXT PRIMARY KEY,
  lease_id TEXT NOT NULL UNIQUE,
  steps TEXT NOT NULL,  -- JSON array of checklist items
  total_steps INTEGER NOT NULL DEFAULT 7,
  completed_steps INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (lease_id) REFERENCES leases(id) ON DELETE CASCADE
);

CREATE INDEX idx_lease_onboarding_checklists_lease_id
  ON lease_onboarding_checklists(lease_id);
```

**Standard Checklist Steps**:
```typescript
const DEFAULT_CHECKLIST_STEPS = [
  {
    id: 'application_approved',
    label: 'Application approved',
    required: true,
    completed: true,  // Auto-completed when created from application
    auto_complete: true,
  },
  {
    id: 'lease_terms_defined',
    label: 'Lease terms defined (rent, term, dates)',
    required: true,
    completed: false,
  },
  {
    id: 'lease_document_generated',
    label: 'Lease document generated',
    required: true,
    completed: false,
  },
  {
    id: 'deposit_received',
    label: 'Security deposit received',
    required: true,
    completed: false,
  },
  {
    id: 'signatures_collected',
    label: 'Signatures collected (tenant + guarantor)',
    required: true,
    completed: false,
  },
  {
    id: 'movein_inspection_scheduled',
    label: 'Move-in inspection scheduled',
    required: true,
    completed: false,
  },
  {
    id: 'keys_prepared',
    label: 'Keys/access prepared',
    required: true,
    completed: false,
  },
];
```

**Acceptance Criteria**:
- Migration runs without errors
- Existing leases unaffected (onboarding_status = null)
- New leases can have checklists created
- Helper functions tested

---

### Phase 2: Backend API for Leases in Progress (2-3 hours)
**Goal**: Create API endpoints for fetching and managing leases in progress

**Tasks**:
1. Create GET /api/ops/leases/in-progress endpoint
   - Fetch leases where onboarding_status = 'in_progress'
   - Join with checklist data
   - Calculate progress percentage
   - Include tenant/unit details
2. Create PATCH /api/ops/leases/:id/checklist endpoint
   - Update individual checklist step
   - Recalculate progress
   - Log to audit trail
3. Create POST /api/ops/leases/:id/complete-onboarding endpoint
   - Set onboarding_status to 'completed'
   - Update lease status to 'active'
   - Log completion to audit

**Files to Modify/Create**:
- `apps/worker/routes/ops-leases.ts` (add new endpoints)
- `apps/worker/lib/db/lease-onboarding.ts` (helper functions)

**API Specifications**:

**GET /api/ops/leases/in-progress**
Response:
```json
{
  "leases": [
    {
      "id": "lease-123",
      "tenant": {
        "id": "tenant-456",
        "firstName": "Alice",
        "lastName": "Chen",
        "email": "alice@example.com"
      },
      "unit": {
        "id": "unit-789",
        "unitNumber": "4B",
        "propertyName": "Sunset Apartments"
      },
      "progress": {
        "total_steps": 7,
        "completed_steps": 4,
        "percentage": 57
      },
      "checklist": [...],
      "startDate": "2026-02-01",
      "monthlyRent": 1500,
      "createdAt": "2025-12-20T10:00:00Z",
      "updatedAt": "2025-12-22T15:30:00Z"
    }
  ]
}
```

**PATCH /api/ops/leases/:id/checklist**
Request:
```json
{
  "step_id": "deposit_received",
  "completed": true,
  "notes": "Received via e-transfer on 2025-12-22"
}
```

Response:
```json
{
  "success": true,
  "checklist": {...},
  "progress": {
    "total_steps": 7,
    "completed_steps": 5,
    "percentage": 71
  }
}
```

**Acceptance Criteria**:
- API returns leases in progress with checklist data
- Checklist updates work correctly
- Progress percentage calculates accurately
- Audit trail created for all updates
- Complete onboarding transitions lease properly

---

### Phase 3: Leases in Progress UI (3-4 hours)
**Goal**: Create frontend view for leases in progress with checklist

**Tasks**:
1. Create `/admin/leases/in-progress` route
2. Create `LeaseInProgressCard` component
   - Shows lease details
   - Progress bar (57% complete)
   - Checklist with checkboxes
   - Action buttons (Resend, Schedule, Mark Done)
3. Create `LeaseChecklistItem` component
   - Checkbox for completion
   - Label and status icon
   - Notes field (optional)
   - Timestamp when completed
4. Integrate with API endpoints
5. Add empty state (no leases in progress)

**Files to Create**:
- `apps/ops/app/routes/admin.leases.in-progress._index.tsx` (new route)
- `apps/ops/app/components/lease/LeaseInProgressCard.tsx` (new component)
- `apps/ops/app/components/lease/LeaseChecklistItem.tsx` (new component)
- `apps/ops/app/components/lease/LeaseProgressBar.tsx` (new component)

**Component Structure**:
```typescript
<LeaseInProgressCard
  lease={lease}
  onChecklistUpdate={(stepId, completed, notes) => handleUpdate(stepId, completed, notes)}
  onCompleteOnboarding={() => handleComplete(lease.id)}
/>

<LeaseProgressBar
  totalSteps={7}
  completedSteps={4}
  percentage={57}
/>

<LeaseChecklistItem
  step={step}
  onToggle={(completed, notes) => handleToggle(step.id, completed, notes)}
/>
```

**Acceptance Criteria**:
- Leases in progress display correctly
- Progress bar shows accurate percentage
- Checklist items can be toggled
- Notes can be added to checklist items
- Complete onboarding button works
- Empty state shows when no leases

---

### Phase 4: Navigation & Badge Counts (1-2 hours)
**Goal**: Update navigation to show both lease views with badge counts

**Tasks**:
1. Add "Leases in Progress" to navigation
2. Add badge count showing pending leases
3. Update "Leases" view to default to active leases only
4. Add filter for "All", "Active", "Expiring Soon", "Terminated"
5. Visual distinction for terminated leases

**Files to Modify**:
- `apps/ops/app/components/Navigation.tsx` (or wherever navigation is)
- `apps/ops/app/routes/admin.leases._index.tsx` (update default filter)
- `apps/ops/app/root.tsx` (if needed for navigation)

**Navigation Example**:
```typescript
<NavItem href="/admin/leases" icon={DocumentIcon}>
  Leases
</NavItem>
<NavItem href="/admin/leases/in-progress" icon={ClipboardListIcon} badge={inProgressCount}>
  Leases in Progress
</NavItem>
```

**Default Filter Logic**:
```typescript
// In admin.leases._index.tsx
const defaultStatus = searchParams.get('status') || 'active';
```

**Acceptance Criteria**:
- Navigation shows both views
- Badge count accurate
- Leases view defaults to active
- Filter works for all statuses
- Terminated leases visually distinct

---

### Phase 5: Integration with Proceed to Lease (1-2 hours)
**Goal**: Update "Proceed to Lease" action to create lease with in-progress status

**Tasks**:
1. Modify proceed-to-lease endpoint in ops-applications.ts
   - Set onboarding_status = 'in_progress'
   - Create default checklist with first step completed
2. Redirect user to /admin/leases/in-progress after creation
3. Show success message

**Files to Modify**:
- `apps/worker/routes/ops-applications.ts` (proceed-to-lease endpoint)
- `apps/ops/app/components/application/BulkActionConfirmModal.tsx` (redirect)

**Updated Endpoint**:
```typescript
// In proceed-to-lease endpoint
const lease = await createLease(c.env.DB, siteId, {
  // ... existing fields
  onboarding_status: 'in_progress',
});

// Create checklist
await createLeaseChecklist(c.env.DB, lease.id, DEFAULT_CHECKLIST_STEPS);
```

**Acceptance Criteria**:
- Proceed to lease creates lease with in-progress status
- Checklist created automatically
- Redirects to leases in progress view
- Success message shown

---

### Phase 6: Testing & Documentation (2-3 hours)
**Goal**: Comprehensive testing and deployment documentation

**Tasks**:
1. Write unit tests for lease onboarding helpers
2. Test checklist update logic
3. Test progress calculation
4. Verify migration rollback
5. Create deployment documentation
6. Update feature specification

**Test Files**:
- `apps/worker/lib/db/lease-onboarding.test.ts` (new)
- Manual UI testing checklist

**Acceptance Criteria**:
- All tests passing
- Migration tested on preview database
- Rollback plan documented
- Deployment guide complete
- Build successful

---

## Database Migration Strategy

### Migration 0012: Lease Onboarding

**Forward Migration**:
```sql
-- Add onboarding_status column
ALTER TABLE leases ADD COLUMN onboarding_status TEXT;

-- Create checklist table
CREATE TABLE IF NOT EXISTS lease_onboarding_checklists (
  id TEXT PRIMARY KEY,
  lease_id TEXT NOT NULL UNIQUE,
  steps TEXT NOT NULL,
  total_steps INTEGER NOT NULL DEFAULT 7,
  completed_steps INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (lease_id) REFERENCES leases(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_lease_onboarding_checklists_lease_id
  ON lease_onboarding_checklists(lease_id);
```

**Rollback (if needed)**:
```sql
DROP TABLE IF EXISTS lease_onboarding_checklists;
-- Note: SQLite doesn't support DROP COLUMN directly
-- Rollback would require recreating leases table without onboarding_status
-- For safety, we'll leave the column (it's nullable and won't affect existing data)
```

**Data Migration**:
- Existing leases: `onboarding_status` = null (treated as active/historical)
- New leases from applications: `onboarding_status` = 'in_progress'

---

## Risk Assessment & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Database migration failure | High | Test on preview first, have rollback ready |
| Checklist JSON parsing errors | Medium | Validate JSON structure, use TypeScript types |
| Progress calculation bugs | Medium | Unit tests for all edge cases |
| Performance (large checklists) | Low | Limit checklist to reasonable size (7-10 items) |
| User confusion (two lease views) | Medium | Clear navigation, onboarding guide |

---

## Estimated Timeline

- **Phase 1**: Database Schema & Migration - 2-3 hours
- **Phase 2**: Backend API - 2-3 hours
- **Phase 3**: Leases in Progress UI - 3-4 hours
- **Phase 4**: Navigation & Badge Counts - 1-2 hours
- **Phase 5**: Proceed to Lease Integration - 1-2 hours
- **Phase 6**: Testing & Documentation - 2-3 hours

**Total Estimated Time**: 11-17 hours

---

## Success Criteria

- ✅ Database migration successful (no data loss)
- ✅ Leases in progress view functional
- ✅ Checklist workflow working
- ✅ Progress calculation accurate
- ✅ Navigation with badge counts
- ✅ Leases view defaults to active
- ✅ Proceed to lease integration complete
- ✅ All tests passing
- ✅ Build successful
- ✅ Documentation complete

---

## Open Questions & Decisions

**Q1: When does a lease move from "in progress" to "active"?**
- **Decision**: When all required checklist steps are completed
- **Implementation**: Manual "Complete Onboarding" button + auto-transition on lease start date

**Q2: Should we support custom checklists per property?**
- **Decision**: Phase 1 uses standard 7-step checklist
- **Future**: Allow per-site customization in later version

**Q3: What happens to existing leases?**
- **Decision**: `onboarding_status` = null for existing leases (treated as active/historical)
- **No changes required** to existing lease records

**Q4: Should leases in progress support bulk operations?**
- **Decision**: Phase 1 does not include bulk operations
- **Future**: Add in later version if needed

---

## Dependencies

- **Feature 02**: Proceed to Lease action creates leases in progress
- **Email System** (Future): For signature requests and reminders
- **Document System** (Future): For lease document generation

---

## Next Steps

1. Begin Phase 1: Create database migration
2. Create lease-onboarding.ts helper file
3. Test migration on local database
4. Verify existing leases unaffected
5. Proceed to Phase 2: Backend API

---

**Status**: Ready to begin implementation
**Blockers**: None
**Prerequisites**: Features 01-03 complete ✓
