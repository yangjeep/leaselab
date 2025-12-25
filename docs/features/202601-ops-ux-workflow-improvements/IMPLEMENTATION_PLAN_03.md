# Feature 03 Implementation Plan: Multi-Select for Leases and Tenants

**Feature ID**: 202601-UX-03
**Status**: In Progress
**Start Date**: 2025-12-24
**Target Completion**: TBD

---

## Overview

Implement multi-select and bulk operations for Lease and Tenant views, building on the patterns established in Feature 02 (Applications multi-select). This feature enables property managers to efficiently perform batch operations on leases and tenants.

---

## Technical Approach

### Reuse from Feature 02
- ✅ `bulk_actions` table (already created in migration 0011)
- ✅ `audit_log` with `bulk_action_id` (already exists)
- ✅ Multi-select hook pattern (`useMultiSelect`)
- ✅ Bulk action toolbar component pattern
- ✅ Confirmation modal pattern
- ✅ Database helper functions (`bulk-actions.ts`)

### New Implementation Required
- Lease-specific bulk operations
- Tenant-specific bulk operations
- Lease list UI with multi-select
- Tenant list UI with multi-select
- Export functionality (CSV generation)
- Status update validations for leases

---

## Implementation Phases

### Phase 1: Lease Multi-Select UI (2-3 hours)
**Goal**: Add multi-select capability to lease list view

**Tasks**:
1. ✅ Reuse `useMultiSelect` hook from Feature 02
2. Create `LeaseBulkActionToolbar` component
3. Create `LeaseBulkActionConfirmModal` component
4. Update lease list component with checkboxes
5. Add "select all" functionality
6. Visual feedback for selected leases

**Files to Modify/Create**:
- `apps/ops/app/lib/useMultiSelect.ts` (reuse existing)
- `apps/ops/app/components/lease/LeaseBulkActionToolbar.tsx` (new)
- `apps/ops/app/components/lease/LeaseBulkActionConfirmModal.tsx` (new)
- `apps/ops/app/routes/admin.leases._index.tsx` (modify to add multi-select)

**Acceptance Criteria**:
- Checkboxes visible on lease list
- Bulk toolbar appears when leases selected
- Selection state managed correctly
- Clear selection works
- Select all works

---

### Phase 2: Lease Bulk Operations Backend (2-3 hours)
**Goal**: Implement backend endpoint for lease bulk operations

**Tasks**:
1. Create `POST /api/ops/leases/bulk` endpoint
2. Implement **Update Status** action
   - Validate status transitions
   - Update lease records
   - Log to audit trail
3. Implement **Export** action
   - Generate CSV with lease + tenant details
   - Return download URL
4. **Stub** Email action (depends on email system)
5. **Stub** Document generation (depends on document system)
6. Add comprehensive validation
7. Track success/failure counts

**Files to Modify/Create**:
- `apps/worker/routes/ops-leases.ts` (create if doesn't exist, or add to existing)
- Reuse `apps/worker/lib/db/bulk-actions.ts` (already exists)

**API Spec**:
```typescript
POST /api/ops/leases/bulk
{
  lease_ids: string[],
  action: 'update_status' | 'export' | 'send_email' | 'generate_documents',
  params: {
    new_status?: string,
    reason?: string,
    email_template_id?: string,
    document_template?: string,
    export_format?: 'csv' | 'excel'
  }
}

Response:
{
  bulk_action_id: string,
  success_count: number,
  failure_count: number,
  results: Array<{lease_id: string, status: 'success'|'failed', error?: string}>,
  download_url?: string  // For export action
}
```

**Valid Lease Status Transitions**:
- `draft` → `pending_signature`, `terminated`
- `pending_signature` → `signed`, `draft`, `terminated`
- `signed` → `active`, `terminated`
- `active` → `expiring_soon`, `terminated`
- `expiring_soon` → `active`, `expired`, `terminated`
- `expired` → `terminated`

**Acceptance Criteria**:
- Update status works with validation
- Export generates CSV with correct data
- Email/document actions return "not implemented" message
- All actions logged to bulk_actions table
- Audit trail created for each lease
- Partial success handled correctly

---

### Phase 3: Tenant Multi-Select UI (2-3 hours)
**Goal**: Add multi-select capability to tenant list view

**Tasks**:
1. ✅ Reuse `useMultiSelect` hook
2. Create `TenantBulkActionToolbar` component
3. Create `TenantBulkActionConfirmModal` component
4. Update tenant list component with checkboxes
5. Add "select all" functionality

**Files to Modify/Create**:
- `apps/ops/app/components/tenant/TenantBulkActionToolbar.tsx` (new)
- `apps/ops/app/components/tenant/TenantBulkActionConfirmModal.tsx` (new)
- `apps/ops/app/routes/admin.tenants._index.tsx` (modify)

**Acceptance Criteria**:
- Same as Phase 1 but for tenants

---

### Phase 4: Tenant Bulk Operations Backend (2-3 hours)
**Goal**: Implement backend endpoint for tenant bulk operations

**Tasks**:
1. Create `POST /api/ops/tenants/bulk` endpoint
2. Implement **Export** action
   - Generate CSV with tenant + lease details
3. Implement **Add Tag** action
   - Create tags table if needed
   - Associate tags with tenants
4. **Stub** Email action
5. **Stub** Document send action

**Files to Modify/Create**:
- `apps/worker/routes/ops-tenants.ts` (create if doesn't exist)
- `apps/worker/lib/db/tenant-tags.ts` (new, if implementing tags)

**Acceptance Criteria**:
- Export generates CSV with correct data
- Tag addition works (if implementing)
- Email/document stubs return appropriate messages
- All actions logged correctly

---

### Phase 5: Testing & Documentation (2-3 hours)
**Goal**: Comprehensive testing and deployment docs

**Tasks**:
1. Write unit tests for lease bulk operations
2. Write unit tests for tenant bulk operations
3. Test UI components (reuse test patterns from Feature 02)
4. Verify TypeScript compilation
5. Verify production build
6. Create deployment documentation
7. Update feature specification with implementation notes

**Test Files**:
- `apps/ops/app/lib/useMultiSelect.test.ts` (already exists, verify reusability)
- `apps/worker/lib/db/lease-bulk.test.ts` (new, if needed)
- `apps/worker/lib/db/tenant-bulk.test.ts` (new, if needed)

**Acceptance Criteria**:
- All tests passing
- Build successful
- Documentation complete
- Ready for deployment

---

## Database Schema

### No New Tables Required!
✅ Reuse `bulk_actions` table from Feature 02
✅ Reuse `audit_log` table with `bulk_action_id`

### Potential New Table (Optional - Phase 4)
If implementing tenant tags:

```sql
CREATE TABLE IF NOT EXISTS tenant_tags (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  tag TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_tags_tenant
  ON tenant_tags(tenant_id);

CREATE INDEX IF NOT EXISTS idx_tenant_tags_tag
  ON tenant_tags(tag);
```

---

## CSV Export Specification

### Lease Export Columns
- Lease ID
- Tenant Name(s)
- Property Name
- Unit Number
- Start Date
- End Date
- Monthly Rent
- Security Deposit
- Status
- Signed Date
- Created Date

### Tenant Export Columns
- Tenant ID
- Full Name
- Email
- Phone
- Current Unit
- Lease Start Date
- Lease End Date
- Lease Status
- Move-in Date
- Move-out Date (if applicable)

---

## Stubbed Dependencies

The following features depend on systems not yet implemented and will be **stubbed** with clear messaging:

### Email Actions (Both Leases & Tenants)
- **Depends On**: 202601-next-batch Feature #1 (Email Handling)
- **Stub Behavior**: Return `{ error: "Email system not yet configured", code: "EMAIL_NOT_AVAILABLE" }`
- **UI Treatment**: Show info message explaining feature coming soon

### Document Generation (Leases)
- **Depends On**: Document template system
- **Stub Behavior**: Return `{ error: "Document system not yet configured", code: "DOCS_NOT_AVAILABLE" }`

### Document Send (Tenants)
- **Depends On**: Document delivery system
- **Stub Behavior**: Same as above

---

## Risk Assessment & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Lease status transitions | Medium | Validate all transitions server-side |
| Large bulk exports | Medium | Limit to 100 records, add pagination |
| Email system dependency | Low | Clear stubs with timeline for feature |
| Performance (100+ records) | Medium | Add client-side limit, warn at 50+ |

---

## Estimated Timeline

- **Phase 1**: Lease Multi-Select UI - 2-3 hours
- **Phase 2**: Lease Bulk Operations - 2-3 hours
- **Phase 3**: Tenant Multi-Select UI - 2-3 hours
- **Phase 4**: Tenant Bulk Operations - 2-3 hours
- **Phase 5**: Testing & Docs - 2-3 hours

**Total Estimated Time**: 10-15 hours

---

## Success Criteria

- ✅ Lease multi-select UI functional
- ✅ Tenant multi-select UI functional
- ✅ Lease status updates working with validation
- ✅ Lease export generating correct CSV
- ✅ Tenant export generating correct CSV
- ✅ Email/document stubs clear and informative
- ✅ All bulk actions audited
- ✅ Tests passing (unit + integration)
- ✅ Build successful
- ✅ Documentation complete

---

## Notes for Implementation

1. **Reuse Components**: Maximize reuse from Feature 02 (multi-select hook, modal patterns, toolbar structure)
2. **Pragmatic Stubs**: Stub out dependencies gracefully with clear user messaging
3. **Status Validation**: Critical for lease operations - validate all transitions
4. **CSV Generation**: Use simple approach (no heavy libraries needed for basic CSV)
5. **Audit Trail**: Ensure consistency with Feature 02's audit approach
6. **Testing**: Follow Feature 02's testing patterns for consistency

---

## Next Steps

1. Begin Phase 1: Lease Multi-Select UI
2. Create `LeaseBulkActionToolbar` component
3. Create `LeaseBulkActionConfirmModal` component
4. Modify lease list route to integrate multi-select
5. Verify UI working before moving to backend

---

**Status**: Ready to begin implementation
**Dependencies**: None (Feature 02 provides all needed infrastructure)
**Blockers**: None
