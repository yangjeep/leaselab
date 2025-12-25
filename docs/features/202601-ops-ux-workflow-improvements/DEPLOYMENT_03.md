# Feature 03 Deployment Guide: Multi-Select for Leases and Tenants

**Feature ID**: 202601-UX-03
**Status**: Complete
**Deployment Date**: TBD

---

## Overview

Feature 03 implements multi-select and bulk operations for Lease and Tenant views, building on the patterns established in Feature 02. This deployment guide covers all components and verification steps.

---

## Pre-Deployment Checklist

- [x] All phases completed (Phases 1-4)
- [x] TypeScript compilation verified
- [x] Production build successful
- [x] No database migrations required (reuses Feature 02 infrastructure)
- [x] All routes registered and protected by auth middleware

---

## What's Being Deployed

### Backend Components

**New Route Files:**
1. `apps/worker/routes/ops-leases.ts` (295 lines)
   - POST /api/ops/leases/bulk endpoint
   - Actions: update_status, export, send_email (stub), generate_documents (stub)
   - Status transition validation
   - CSV export generation

2. `apps/worker/routes/ops-tenants.ts` (292 lines)
   - POST /api/ops/tenants/bulk endpoint
   - Actions: export, add_tag (stub), send_email (stub), send_document (stub)
   - CSV export generation
   - Tag audit logging

**Modified Files:**
- `apps/worker/routes/ops.ts` - Added route registrations for ops-leases and ops-tenants

### Frontend Components

**New Component Files:**
1. Lease Components:
   - `apps/ops/app/components/lease/LeaseBulkActionToolbar.tsx` (106 lines)
   - `apps/ops/app/components/lease/LeaseBulkActionConfirmModal.tsx` (227 lines)
   - `apps/ops/app/components/lease/index.ts` (4 lines)

2. Tenant Components:
   - `apps/ops/app/components/tenant/TenantBulkActionToolbar.tsx` (111 lines)
   - `apps/ops/app/components/tenant/TenantBulkActionConfirmModal.tsx` (217 lines)
   - `apps/ops/app/components/tenant/index.ts` (4 lines)

**Modified Route Files:**
- `apps/ops/app/routes/admin.leases._index.tsx` - Added multi-select UI integration
- `apps/ops/app/routes/admin.tenants._index.tsx` - Added multi-select UI integration

### Reused Infrastructure (from Feature 02)

- `bulk_actions` table (no changes needed)
- `audit_log` table with `bulk_action_id` column (no changes needed)
- `apps/ops/app/lib/useMultiSelect.ts` hook (no changes needed)
- `apps/worker/lib/db/bulk-actions.ts` helpers (no changes needed)

---

## Deployment Steps

### Step 1: Deploy Code

```bash
# Ensure you're on the correct branch
git status

# Verify all changes are committed
git log --oneline -10

# Deploy to preview/staging first
npm run deploy:preview

# After verification, deploy to production
npm run deploy:production
```

### Step 2: Verify API Endpoints

**Lease Bulk Operations:**
```bash
# Test endpoint is accessible (should return 401 without auth)
curl -X POST https://your-domain.com/api/ops/leases/bulk \
  -H "Content-Type: application/json" \
  -d '{"lease_ids":[],"action":"export"}'

# Expected: {"error":"Missing siteId or userId"} or similar auth error
```

**Tenant Bulk Operations:**
```bash
# Test endpoint is accessible (should return 401 without auth)
curl -X POST https://your-domain.com/api/ops/tenants/bulk \
  -H "Content-Type: application/json" \
  -d '{"tenant_ids":[],"action":"export"}'

# Expected: {"error":"Missing siteId or userId"} or similar auth error
```

### Step 3: Frontend Verification

1. Navigate to `/admin/leases`
   - [ ] Verify checkbox column appears in table header
   - [ ] Verify checkboxes appear on each lease row
   - [ ] Select 2-3 leases and verify bulk action toolbar appears
   - [ ] Click "Update Status" and verify modal opens
   - [ ] Test status update with valid transition (e.g., draft → pending_signature)
   - [ ] Click "Export" and verify CSV download works
   - [ ] Verify CSV contains all expected columns
   - [ ] Test "Send Email" - should show "not yet configured" message
   - [ ] Test "Generate Docs" - should show "not yet configured" message

2. Navigate to `/admin/tenants`
   - [ ] Verify checkbox column appears in table header
   - [ ] Verify checkboxes appear on each tenant row
   - [ ] Select 2-3 tenants and verify bulk action toolbar appears
   - [ ] Click "Add Tag" and verify modal opens
   - [ ] Test tag addition (should succeed with message about implementation)
   - [ ] Click "Export" and verify CSV download works
   - [ ] Verify CSV contains all expected columns
   - [ ] Test "Send Email" - should show "not yet configured" message
   - [ ] Test "Send Document" - should show "not yet configured" message

3. Edge Cases:
   - [ ] Select all leases (if >10, verify performance)
   - [ ] Clear selection and verify toolbar disappears
   - [ ] Test invalid status transition (e.g., expired → draft) - should show error
   - [ ] Select 0 leases and verify toolbar doesn't appear

---

## Database Impact

**No database migrations required!**

This feature reuses the `bulk_actions` and `audit_log` tables from Feature 02.

### Expected Database Changes

After deployment, you should see new entries in:

1. **bulk_actions table:**
   - New `action_type` values: `lease_update_status`, `lease_export`, `tenant_export`, `tenant_add_tag`
   - Each bulk operation creates a new record

2. **audit_log table:**
   - New `entity_type` values: `lease`, `tenant`
   - New `action` values: `update_status`, `export`, `add_tag`
   - All linked to `bulk_action_id` for traceability

### Verify Database Records

```sql
-- Check bulk actions for leases
SELECT * FROM bulk_actions
WHERE action_type LIKE 'lease_%'
ORDER BY created_at DESC
LIMIT 5;

-- Check bulk actions for tenants
SELECT * FROM bulk_actions
WHERE action_type LIKE 'tenant_%'
ORDER BY created_at DESC
LIMIT 5;

-- Check audit trail for lease operations
SELECT * FROM audit_log
WHERE entity_type = 'lease' AND bulk_action_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- Check audit trail for tenant operations
SELECT * FROM audit_log
WHERE entity_type = 'tenant' AND bulk_action_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;
```

---

## Known Limitations & Stubs

The following features are **stubbed** and will return "not yet configured" messages:

### Lease Operations
1. **Send Email** - Depends on Feature 202601-next-batch #1 (Email Handling)
2. **Generate Documents** - Depends on document template system

### Tenant Operations
1. **Send Email** - Depends on Feature 202601-next-batch #1 (Email Handling)
2. **Send Document** - Depends on document delivery system
3. **Add Tag** - Tag storage not yet implemented (logs to audit only)

**User Experience:**
- Email/Document buttons are disabled in the modal
- Yellow info boxes explain "coming soon" status
- Tag action succeeds but shows informational message

---

## Performance Considerations

### Limits Enforced

- **Maximum leases per bulk action**: 100
- **Maximum tenants per bulk action**: 100
- **CSV export**: No pagination (all selected records in one file)

### Expected Performance

**Based on build sizes:**
- Lease list: 17.34 kB gzipped (previously: N/A, new multi-select)
- Tenant list: 16.09 kB gzipped (previously: 6.14 kB, +9.95 kB increase)

**Load times:**
- Multi-select components add ~10-17 KB gzipped per list view
- No significant performance impact observed with <100 records

### Optimization Notes

- Bulk operations process records sequentially (not parallelized)
- CSV generation happens in-memory (suitable for <1000 records)
- For very large datasets (>100 records), consider implementing:
  - Pagination for bulk actions
  - Background job processing
  - Chunked CSV generation

---

## Rollback Plan

If issues arise, rollback can be performed by:

1. **Code Rollback:**
   ```bash
   git revert HEAD~7..HEAD  # Reverts last 7 commits (Phases 1-4)
   npm run deploy:production
   ```

2. **Database Rollback:**
   - **NOT REQUIRED** - No schema changes made
   - Existing `bulk_actions` and `audit_log` records are safe to keep

3. **Partial Rollback (Frontend Only):**
   - If backend is working but frontend has issues, revert only frontend files
   - Bulk operations will fail gracefully with API errors

---

## Monitoring & Alerts

### Metrics to Monitor

1. **Bulk Action Usage:**
   ```sql
   SELECT action_type, COUNT(*) as count, AVG(success_count) as avg_success
   FROM bulk_actions
   WHERE created_at > datetime('now', '-7 days')
   GROUP BY action_type;
   ```

2. **Failure Rates:**
   ```sql
   SELECT action_type,
          SUM(failure_count) as total_failures,
          SUM(success_count) as total_successes,
          ROUND(100.0 * SUM(failure_count) / (SUM(failure_count) + SUM(success_count)), 2) as failure_rate
   FROM bulk_actions
   WHERE created_at > datetime('now', '-7 days')
   GROUP BY action_type;
   ```

3. **Error Patterns:**
   - Monitor browser console for API errors
   - Check server logs for validation failures
   - Watch for invalid status transition attempts

### Expected Metrics

- **Export actions**: Should have 100% success rate
- **Status updates**: May have failures due to invalid transitions
- **Email/Document stubs**: Expected 100% failure rate (not implemented)
- **Tag additions**: Should have 100% success rate (stubbed)

---

## Support & Troubleshooting

### Common Issues

**Issue 1: Checkbox column not appearing**
- **Cause**: Browser cache serving old build
- **Solution**: Hard refresh (Cmd+Shift+R or Ctrl+Shift+R)

**Issue 2: Bulk action fails with "Missing siteId"**
- **Cause**: Auth middleware not passing siteId
- **Solution**: Check internal auth configuration

**Issue 3: CSV export has garbled characters**
- **Cause**: Special characters not properly escaped
- **Solution**: Verify `escapeCsvField` function handles quotes/commas

**Issue 4: Invalid status transition error**
- **Cause**: User attempting disallowed transition
- **Solution**: Refer to VALID_TRANSITIONS map in ops-leases.ts:27-34

### Debug Mode

Enable detailed logging:
```javascript
// In admin.leases._index.tsx or admin.tenants._index.tsx
const handleBulkAction = async (action, params) => {
  console.log('[DEBUG] Bulk action:', { action, params, selectedIds: multiSelect.selectedIds });
  // ... rest of function
};
```

---

## Success Criteria

- [ ] All backend endpoints respond correctly (200 for valid requests)
- [ ] Lease status update works with proper validation
- [ ] Lease export generates valid CSV with all columns
- [ ] Tenant export generates valid CSV with all columns
- [ ] Tag addition logs to audit trail
- [ ] Email/document stubs show clear messaging
- [ ] Bulk actions appear in `bulk_actions` table
- [ ] Audit trail entries link to `bulk_action_id`
- [ ] No console errors in browser
- [ ] No TypeScript compilation errors
- [ ] Production build successful

---

## Post-Deployment Tasks

1. **User Communication:**
   - Notify property managers of new bulk operations features
   - Provide quick-start guide for multi-select usage
   - Explain which features are stubs (email, documents)

2. **Training:**
   - Demonstrate lease status transitions
   - Show CSV export capabilities
   - Clarify stub feature timeline

3. **Monitoring:**
   - Track usage patterns for first week
   - Identify most-used bulk actions
   - Gather user feedback on UX

4. **Future Enhancements:**
   - Plan integration with email system (202601-next-batch #1)
   - Design document template system
   - Implement tenant tags table if needed

---

## Related Documentation

- [Feature Specification](./03-multiselect-lease-tenant.md)
- [Implementation Plan](./IMPLEMENTATION_PLAN_03.md)
- [Feature 02 Deployment Guide](./DEPLOYMENT_02.md) (shared infrastructure)

---

**Deployment Status**: Ready for Production
**Risk Level**: Low (no database changes, reuses proven patterns)
**Estimated Deployment Time**: 15 minutes (code deploy + verification)
