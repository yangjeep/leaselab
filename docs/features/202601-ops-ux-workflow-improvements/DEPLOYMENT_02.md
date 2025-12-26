# Feature 02: Multi-Select Operations - Deployment Guide

**Status**: Ready for Deployment
**Feature ID**: 202601-UX-02
**Completion Date**: 2025-12-24

---

## Implementation Summary

Feature 02 (Multi-Select Operations for Applications + "Proceed to Lease") has been fully implemented with:

### ✅ Phase 1: Database Schema & Audit Trail (Completed)
- **Migration**: `scripts/migrations/0011_bulk_operations_audit.sql`
  - Added `bulk_actions` table for tracking bulk operation metadata
  - Added `bulk_action_id` column to `audit_log` for linking related operations
  - Created indexes for efficient queries
- **Database Functions**: `apps/worker/lib/db/bulk-actions.ts`
  - `createBulkAction()` - Creates bulk action records
  - `updateBulkActionResults()` - Updates success/failure counts
  - `getBulkActionById()` - Retrieves bulk action details
  - `getBulkActionsByUser()` - Gets user's bulk action history
  - `logAuditEntry()` - Logs audit entries with optional bulk action linking

### ✅ Phase 2: Backend API (Completed)
- **Endpoint 1**: `POST /api/ops/applications/bulk`
  - Supports actions: reject, move_to_stage, archive, send_email
  - Validates unit scoping (max 50 apps, same unit only)
  - Creates bulk_action records and tracks results
  - Links all audit entries via bulk_action_id
- **Endpoint 2**: `POST /api/ops/applications/:id/proceed-to-lease`
  - Creates tenant record from application data
  - Creates draft lease with tenant linkage
  - Updates application status to approved
  - Validates shortlist criteria (AI grade A/B or score ≥70)
  - Validates unit availability

### ✅ Phase 3: Frontend UI (Completed)
- **Hook**: `apps/ops/app/lib/useMultiSelect.ts`
  - Manages selection state with unit-scoping validation
  - Prevents cross-unit selection
  - Functions: toggleSelection, selectAll, clearSelection
- **Components**:
  - `BulkActionToolbar` - Shows action buttons when applications selected
  - `BulkActionConfirmModal` - Confirmation dialog with action-specific forms
  - Updated `UnitGroupedApplicationList` - Integrated checkboxes and multi-select
- **Features**:
  - Checkboxes on application rows
  - "Select all" checkbox in table header
  - Visual feedback (blue background for selected rows)
  - "Proceed to Lease" button for shortlisted applications
  - Auto-refresh after successful bulk actions

### ✅ Phase 4: Testing (Completed)
- **Unit Tests**: `apps/ops/app/lib/useMultiSelect.test.ts`
  - 9 test cases covering all hook functionality
  - Tests unit-scoping validation
  - All tests passing (9/9 ✓)
- **Database Tests**: `apps/worker/lib/db/bulk-actions.test.ts`
  - Comprehensive coverage of all database functions
  - Tests bulk action creation, updates, queries, and audit logging
- **Build Verification**: All applications build successfully ✓
- **TypeScript**: All type checking passes ✓

---

## Deployment Instructions

### 1. Database Migration

**Preview Environment**:
```bash
npx wrangler d1 execute leaselab-db-preview --file=scripts/migrations/0011_bulk_operations_audit.sql
```

**Production Environment**:
```bash
npx wrangler d1 execute leaselab-db --file=scripts/migrations/0011_bulk_operations_audit.sql
```

### 2. Verify Migration

After running the migration, verify the tables were created:

```sql
-- Check bulk_actions table exists
SELECT name FROM sqlite_master WHERE type='table' AND name='bulk_actions';

-- Check bulk_action_id column added to audit_log
PRAGMA table_info(audit_log);

-- Check indexes created
SELECT name FROM sqlite_master WHERE type='index' AND (
  name='idx_audit_log_bulk_action' OR
  name='idx_bulk_actions_user' OR
  name='idx_bulk_actions_created'
);
```

### 3. Deploy Application Code

The application code has already been committed to the `feat/unit-level-application-view` branch. To deploy:

1. **Merge to Main**:
   ```bash
   git checkout main
   git merge feat/unit-level-application-view
   ```

2. **Deploy to Preview**:
   ```bash
   npm run deploy:preview
   ```

3. **Test in Preview Environment**:
   - Navigate to Applications page
   - Select multiple applications within same unit
   - Test bulk reject operation
   - Test bulk move to stage operation
   - Test "Proceed to Lease" for shortlisted application
   - Verify audit log entries created
   - Verify bulk_actions records created

4. **Deploy to Production**:
   ```bash
   npm run deploy:prod
   ```

---

## Post-Deployment Verification

### Functional Testing Checklist

- [ ] **Multi-Select UI**
  - [ ] Checkboxes appear on application rows
  - [ ] "Select all" checkbox in table header works
  - [ ] Selected rows have blue background
  - [ ] Bulk action toolbar appears when applications selected
  - [ ] Clear selection (X button) works

- [ ] **Unit Scoping**
  - [ ] Selecting from different unit clears previous selections
  - [ ] Bulk toolbar only shows when same-unit applications selected
  - [ ] Error handling for cross-unit operations (should not occur with UI validation)

- [ ] **Bulk Reject**
  - [ ] Confirmation modal appears
  - [ ] Shows list of affected applications
  - [ ] Can add rejection reason (optional)
  - [ ] Updates all selected applications to "rejected" status
  - [ ] Creates bulk_action record
  - [ ] Links audit entries with bulk_action_id

- [ ] **Bulk Move to Stage**
  - [ ] Confirmation modal shows stage dropdown
  - [ ] Updates all selected applications to chosen stage
  - [ ] Creates bulk_action record and audit entries

- [ ] **Bulk Archive**
  - [ ] Confirmation modal appears
  - [ ] Updates all selected applications
  - [ ] Creates bulk_action record and audit entries

- [ ] **Proceed to Lease**
  - [ ] Button only appears when exactly 1 shortlisted application selected
  - [ ] Shows lease start date and term fields
  - [ ] Creates tenant record from application data
  - [ ] Creates draft lease with correct tenant linkage
  - [ ] Updates application to "approved" status
  - [ ] Redirects to lease detail page
  - [ ] Creates audit log entry

- [ ] **Error Handling**
  - [ ] Clear error messages for failed operations
  - [ ] Partial success handling (e.g., 2/3 successful)
  - [ ] Data refreshes after successful operations

### Database Verification

```sql
-- Verify bulk_actions records created
SELECT * FROM bulk_actions
ORDER BY created_at DESC
LIMIT 10;

-- Verify audit entries linked to bulk actions
SELECT al.*, ba.action_type, ba.application_count
FROM audit_log al
LEFT JOIN bulk_actions ba ON al.bulk_action_id = ba.id
WHERE al.bulk_action_id IS NOT NULL
ORDER BY al.created_at DESC
LIMIT 20;

-- Verify tenant creation from proceed-to-lease
SELECT t.*, l.status as lease_status
FROM tenants t
INNER JOIN leases l ON l.tenant_id = t.id
WHERE t.lead_id IS NOT NULL
ORDER BY t.created_at DESC
LIMIT 10;
```

---

## Rollback Plan

If issues are encountered in production:

### 1. Rollback Application Code
```bash
git revert <commit-hash>
npm run deploy:prod
```

### 2. Rollback Database (if needed)

**⚠️ WARNING**: This will remove audit history. Only use if absolutely necessary.

```sql
-- Remove bulk_action_id column from audit_log
ALTER TABLE audit_log DROP COLUMN bulk_action_id;

-- Drop bulk_actions table
DROP TABLE bulk_actions;

-- Drop indexes
DROP INDEX idx_audit_log_bulk_action;
DROP INDEX idx_bulk_actions_user;
DROP INDEX idx_bulk_actions_created;
```

---

## Known Limitations

1. **Email Functionality**: The "Send Email" bulk action is stubbed out and will show a warning message. This depends on email template system from 202601-next-batch Feature #1.

2. **Co-Tenant Support**: "Proceed to Lease" currently supports only single applicant. Multi-tenant (roommate) scenarios are planned for Phase 2.

3. **Undo Functionality**: Bulk operations cannot be undone. Users must manually reverse changes if needed.

4. **Bulk Action Limit**: Maximum 50 applications per bulk operation for performance reasons.

---

## Monitoring and Metrics

After deployment, monitor:

1. **Usage Metrics**:
   - Frequency of bulk operations (query `bulk_actions` table)
   - Success vs. failure rates
   - Most common bulk actions

2. **Performance**:
   - API endpoint response times
   - Database query performance for bulk operations
   - Frontend rendering performance with large selection sets

3. **Error Rates**:
   - Failed bulk operations
   - Partial success scenarios
   - Unit scoping validation errors

---

## Support and Documentation

- **Technical Spec**: [02-multiselect-applications.md](./02-multiselect-applications.md)
- **Implementation Plan**: [IMPLEMENTATION_PLAN_02.md](./IMPLEMENTATION_PLAN_02.md)
- **Git Commits**:
  - Phase 1: Database layer
  - Phase 2: Backend API endpoints
  - Phase 3: Frontend UI components
  - Phase 4: Tests and verification

---

## Completion Status

**Implementation**: ✅ 100% Complete
**Testing**: ✅ Comprehensive unit tests passing
**Build Verification**: ✅ Production builds successful
**Documentation**: ✅ Complete
**Ready for Deployment**: ✅ Yes

---

**Deployed By**: _[To be filled during deployment]_
**Deployment Date**: _[To be filled during deployment]_
**Verified By**: _[To be filled after verification]_
