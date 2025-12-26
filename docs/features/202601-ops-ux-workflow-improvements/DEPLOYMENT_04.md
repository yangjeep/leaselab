# Feature 04 Deployment Guide: Separate Views - Existing Leases vs. Leases in Progress

**Feature ID**: 202601-UX-04
**Status**: Ready for Deployment
**Deployment Date**: TBD

---

## Overview

Feature 04 implements a separate "Leases in Progress" view with a guided onboarding checklist for new leases created from applications. This deployment includes database migrations, new API endpoints, and a complete UI for managing lease onboarding.

---

## Pre-Deployment Checklist

- [x] All phases completed (Phases 1-6)
- [x] Database migration created and tested
- [x] Backend API endpoints implemented
- [x] Frontend UI components created
- [x] Navigation updated with badge counts
- [x] Proceed to Lease integration complete
- [x] Unit tests written
- [ ] Production build successful
- [ ] Migration tested on preview database

---

## What's Being Deployed

### Database Changes

**New Migration**: `0012_lease_onboarding.sql`

**Schema Changes**:
1. Add `onboarding_status` column to `leases` table (nullable TEXT)
   - Values: `null` (active/terminated), `'in_progress'`, `'completed'`

2. Create `lease_onboarding_checklists` table
   ```sql
   CREATE TABLE lease_onboarding_checklists (
     id TEXT PRIMARY KEY,
     lease_id TEXT NOT NULL UNIQUE,
     steps TEXT NOT NULL,
     total_steps INTEGER NOT NULL DEFAULT 7,
     completed_steps INTEGER NOT NULL DEFAULT 0,
     created_at TEXT NOT NULL DEFAULT (datetime('now')),
     updated_at TEXT NOT NULL DEFAULT (datetime('now')),
     FOREIGN KEY (lease_id) REFERENCES leases(id) ON DELETE CASCADE
   );
   ```

3. Add indexes:
   - `idx_lease_onboarding_checklists_lease_id` on `lease_id`
   - `idx_leases_onboarding_status` on `onboarding_status`

### Backend Components

**New Database Helper File**:
- `apps/worker/lib/db/lease-onboarding.ts` (280 lines)
  - `createLeaseChecklist()` - Create checklist for new lease
  - `getLeaseChecklist()` - Fetch checklist by lease ID
  - `updateChecklistStep()` - Update single checklist step
  - `completeLeaseOnboarding()` - Complete onboarding process
  - `getLeasesInProgress()` - Fetch all in-progress leases
  - `DEFAULT_CHECKLIST_STEPS` - Standard 7-step checklist

**Modified Route Files**:
- `apps/worker/routes/ops-leases.ts` - Added 3 new endpoints:
  - `GET /api/ops/leases/in-progress` - Fetch leases in progress
  - `PATCH /api/ops/leases/:id/checklist` - Update checklist step
  - `POST /api/ops/leases/:id/complete-onboarding` - Complete onboarding

- `apps/worker/routes/ops-applications.ts` - Updated proceed-to-lease endpoint:
  - Sets `onboarding_status = 'in_progress'` on new leases
  - Creates default checklist automatically
  - Redirects to `/admin/leases/in-progress` instead of lease detail

### Frontend Components

**New Route**:
- `apps/ops/app/routes/admin.leases.in-progress._index.tsx` (162 lines)
  - Main view for leases in progress
  - Handles checklist updates
  - Handles onboarding completion

**New Components**:
1. `apps/ops/app/components/lease/LeaseInProgressCard.tsx` (145 lines)
   - Card displaying lease details
   - Embedded progress bar
   - Checklist with action buttons
   - Complete onboarding button (when ready)

2. `apps/ops/app/components/lease/LeaseChecklistItem.tsx` (128 lines)
   - Individual checklist item
   - Checkbox with completion toggle
   - Notes field for each step
   - Auto-complete indicator

3. `apps/ops/app/components/lease/LeaseProgressBar.tsx` (45 lines)
   - Visual progress indicator
   - Color-coded based on completion percentage
   - Shows X of Y steps completed

**Modified Files**:
- `apps/ops/app/routes/admin.tsx` - Updated navigation:
  - Added "Leases in Progress" nav item
  - Added badge count showing pending leases
  - Fetches count in loader

- `apps/ops/app/components/lease/index.ts` - Added component exports

### Test Files

**New Test File**:
- `apps/worker/lib/db/lease-onboarding.test.ts` (245 lines)
  - 15+ test cases covering all helper functions
  - Tests for create, read, update operations
  - Progress calculation tests
  - Edge case validation

---

## Deployment Steps

### Step 1: Run Database Migration

**CRITICAL**: This must be done before deploying code changes.

```bash
# Test on preview database first
cd apps/worker
npx wrangler d1 execute leaselab-db-preview --remote \
  --file=../../scripts/migrations/0012_lease_onboarding.sql

# Verify migration success
npx wrangler d1 execute leaselab-db-preview --remote \
  --command="SELECT name FROM sqlite_master WHERE type='table' AND name='lease_onboarding_checklists'"

# Check column was added
npx wrangler d1 execute leaselab-db-preview --remote \
  --command="PRAGMA table_info(leases)" | grep onboarding

# After verification, run on production
npx wrangler d1 execute leaselab-db --remote \
  --file=../../scripts/migrations/0012_lease_onboarding.sql
```

### Step 2: Verify Migration

**Check Table Creation**:
```bash
npx wrangler d1 execute leaselab-db --remote \
  --command="SELECT sql FROM sqlite_master WHERE name='lease_onboarding_checklists'"
```

**Expected Output**:
```json
{
  "sql": "CREATE TABLE lease_onboarding_checklists (\n  id TEXT PRIMARY KEY,\n  lease_id TEXT NOT NULL UNIQUE,\n  steps TEXT NOT NULL,\n  total_steps INTEGER NOT NULL DEFAULT 7,\n  completed_steps INTEGER NOT NULL DEFAULT 0,\n  created_at TEXT NOT NULL DEFAULT (datetime('now')),\n  updated_at TEXT NOT NULL DEFAULT (datetime('now')),\n  FOREIGN KEY (lease_id) REFERENCES leases(id) ON DELETE CASCADE\n)"
}
```

**Check Existing Leases**:
```bash
npx wrangler d1 execute leaselab-db --remote \
  --command="SELECT COUNT(*) as total, COUNT(onboarding_status) as with_status FROM leases"
```

Expected: `total > 0`, `with_status = 0` (existing leases have NULL status)

### Step 3: Deploy Code

```bash
# From project root
npm run build

# Deploy to preview first
npm run deploy:preview

# After verification, deploy to production
npm run deploy:production
```

### Step 4: Frontend Verification

1. **Navigate to `/admin/leases/in-progress`**
   - [ ] Page loads without errors
   - [ ] Empty state shows if no leases in progress
   - [ ] Navigation item "Leases in Progress" is visible

2. **Test Creating a Lease from Application**
   - [ ] Go to `/admin/applications`
   - [ ] Select a shortlisted application
   - [ ] Click "Proceed to Lease"
   - [ ] Fill in lease start date and term
   - [ ] Submit form
   - [ ] Verify redirect to `/admin/leases/in-progress`
   - [ ] Verify new lease appears with checklist
   - [ ] Verify first step ("Application approved") is auto-completed

3. **Test Checklist Functionality**
   - [ ] Click checkbox on a checklist item
   - [ ] Verify notes field appears
   - [ ] Add notes and save
   - [ ] Verify progress bar updates
   - [ ] Verify percentage increases
   - [ ] Refresh page and verify changes persisted

4. **Test Complete Onboarding**
   - [ ] Complete all required steps in checklist
   - [ ] Verify "Complete Onboarding" button appears
   - [ ] Click button and confirm
   - [ ] Verify success message
   - [ ] Verify lease removed from in-progress view
   - [ ] Verify lease appears in main leases list as "active"

5. **Test Navigation Badge**
   - [ ] Verify badge count shows correct number
   - [ ] Complete a lease onboarding
   - [ ] Verify badge count decreases
   - [ ] Verify badge disappears when count reaches 0

---

## Database Impact

### Expected Changes

After deployment, the database will have:

1. **New column in leases table**:
   ```sql
   SELECT onboarding_status, COUNT(*)
   FROM leases
   GROUP BY onboarding_status;
   ```
   Expected results:
   - `NULL` - existing leases (most of them)
   - `'in_progress'` - new leases being onboarded
   - `'completed'` - leases that finished onboarding (optional)

2. **New checklist records**:
   ```sql
   SELECT COUNT(*) FROM lease_onboarding_checklists;
   ```
   Expected: Count matches number of leases with `onboarding_status = 'in_progress'`

### Data Integrity Checks

```sql
-- Check for orphaned checklists (shouldn't happen due to FK constraint)
SELECT loc.*
FROM lease_onboarding_checklists loc
LEFT JOIN leases l ON loc.lease_id = l.id
WHERE l.id IS NULL;

-- Expected: 0 rows

-- Check checklist step counts match JSON
SELECT
  id,
  total_steps,
  completed_steps,
  json_array_length(steps) as actual_steps
FROM lease_onboarding_checklists
WHERE total_steps != json_array_length(steps);

-- Expected: 0 rows
```

---

## API Endpoint Testing

### Test GET /api/ops/leases/in-progress

```bash
curl -X GET https://your-domain.com/api/ops/leases/in-progress \
  -H "x-site-id: YOUR_SITE_ID" \
  -H "x-user-id: YOUR_USER_ID"
```

**Expected Response**:
```json
{
  "leases": [
    {
      "id": "lease-xxx",
      "tenant": {
        "id": "tenant-xxx",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com"
      },
      "unit": {
        "id": "unit-xxx",
        "unitNumber": "4B",
        "propertyName": "Sunset Apartments"
      },
      "progress": {
        "total_steps": 7,
        "completed_steps": 3,
        "percentage": 43
      },
      "checklist": [...],
      "startDate": "2026-02-01",
      "monthlyRent": 1500,
      "createdAt": "2025-12-25T10:00:00Z",
      "updatedAt": "2025-12-25T12:00:00Z"
    }
  ]
}
```

### Test PATCH /api/ops/leases/:id/checklist

```bash
curl -X PATCH https://your-domain.com/api/ops/leases/LEASE_ID/checklist \
  -H "Content-Type: application/json" \
  -H "x-site-id: YOUR_SITE_ID" \
  -H "x-user-id: YOUR_USER_ID" \
  -d '{
    "step_id": "lease_terms_defined",
    "completed": true,
    "notes": "Terms agreed upon"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "checklist": [...],
  "progress": {
    "total_steps": 7,
    "completed_steps": 2,
    "percentage": 29
  }
}
```

### Test POST /api/ops/leases/:id/complete-onboarding

```bash
curl -X POST https://your-domain.com/api/ops/leases/LEASE_ID/complete-onboarding \
  -H "Content-Type: application/json" \
  -H "x-site-id: YOUR_SITE_ID" \
  -H "x-user-id: YOUR_USER_ID" \
  -d '{
    "set_active_status": true
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "lease_id": "LEASE_ID",
  "message": "Lease onboarding completed successfully"
}
```

---

## Standard 7-Step Checklist

1. ✅ **Application approved** (auto-completed)
2. ⬜ **Lease terms defined** (rent, term, dates)
3. ⬜ **Lease document generated**
4. ⬜ **Security deposit received**
5. ⬜ **Signatures collected** (tenant + guarantor)
6. ⬜ **Move-in inspection scheduled**
7. ⬜ **Keys/access prepared**

---

## Known Limitations

1. **Checklist customization**: Phase 1 uses standard 7-step checklist only
   - Future: Allow per-site customization

2. **Document generation**: Step 3 requires manual tracking
   - Future: Integrate with document template system (202601-next-batch)

3. **Email reminders**: No automated reminders for incomplete steps
   - Future: Integrate with email system (202601-next-batch #1)

4. **Bulk operations**: No bulk operations for leases in progress
   - Future: Add if needed based on usage patterns

---

## Performance Considerations

### Database Query Performance

**Leases in Progress Query**:
- Uses index on `onboarding_status`
- Joins with tenants, units, properties, and checklists
- Expected query time: <50ms for <100 leases

**Badge Count Query**:
- Simple COUNT with WHERE clause
- Uses same index
- Expected query time: <10ms

### Frontend Bundle Size

**Estimated Additions**:
- Route: ~5 KB gzipped
- Components: ~8 KB gzipped
- Total increase: ~13 KB gzipped

**Navigation Load**:
- Additional API call in layout loader
- Cached for session duration
- Minimal impact (<100ms)

---

## Rollback Plan

If issues arise during deployment:

### 1. Code Rollback (Recommended)

```bash
git revert HEAD~10..HEAD  # Revert last 10 commits (adjust as needed)
npm run deploy:production
```

**Safe because**: Database migration is backward-compatible

### 2. Database Rollback (Nuclear Option)

**WARNING**: Only use if absolutely necessary

```sql
-- Remove checklist table
DROP TABLE IF EXISTS lease_onboarding_checklists;

-- Note: Cannot easily remove onboarding_status column in SQLite
-- It's nullable so existing queries will work fine
-- Leave it in place
```

**Why this is safe**:
- `onboarding_status` column is nullable
- Existing code ignores NULL values
- No data loss

### 3. Partial Rollback (Frontend Only)

If backend works but frontend has issues:

```bash
# Revert only frontend route files
git checkout HEAD~5 apps/ops/app/routes/admin.leases.in-progress._index.tsx
git checkout HEAD~5 apps/ops/app/components/lease/LeaseInProgressCard.tsx
# ... etc

npm run deploy:production
```

---

## Monitoring & Alerts

### Metrics to Track

1. **Lease Onboarding Completion Rate**:
   ```sql
   SELECT
     COUNT(CASE WHEN onboarding_status = 'in_progress' THEN 1 END) as in_progress,
     COUNT(CASE WHEN onboarding_status = 'completed' OR onboarding_status IS NULL THEN 1 END) as completed,
     ROUND(100.0 * COUNT(CASE WHEN onboarding_status = 'completed' THEN 1 END) / COUNT(*), 2) as completion_rate
   FROM leases
   WHERE created_at > datetime('now', '-30 days');
   ```

2. **Average Time to Complete Onboarding**:
   ```sql
   SELECT
     AVG(julianday(updated_at) - julianday(created_at)) * 24 as avg_hours
   FROM lease_onboarding_checklists
   WHERE completed_steps = total_steps;
   ```

3. **Most Frequently Skipped Steps**:
   ```sql
   SELECT
     json_extract(value, '$.id') as step_id,
     json_extract(value, '$.label') as step_label,
     COUNT(*) as incomplete_count
   FROM lease_onboarding_checklists,
        json_each(steps)
   WHERE json_extract(value, '$.completed') = 0
   GROUP BY step_id
   ORDER BY incomplete_count DESC;
   ```

### Expected Baseline Metrics

- **Completion rate**: 80-90% within 7 days
- **Average time to complete**: 2-5 days
- **Most common bottleneck**: Step 4 (Security deposit received)

---

## Troubleshooting

### Issue 1: "Leases in Progress" page shows blank

**Cause**: Frontend route not registered or API failing
**Solution**:
1. Check browser console for errors
2. Verify API endpoint responds: `curl /api/ops/leases/in-progress`
3. Hard refresh (Cmd+Shift+R)

### Issue 2: Badge count not updating

**Cause**: Loader not revalidating after changes
**Solution**:
1. Check network tab - loader should re-run on navigation
2. Verify revalidator.revalidate() is called after checklist updates
3. Clear browser cache

### Issue 3: Cannot complete onboarding

**Error**: "Cannot complete onboarding: X required step(s) incomplete"
**Cause**: Not all required steps marked complete
**Solution**:
1. Check which steps are incomplete in checklist
2. Complete all steps marked "Required"
3. Refresh and try again

### Issue 4: Checklist updates not persisting

**Cause**: API error or database issue
**Solution**:
1. Check browser console for API errors
2. Verify database connection
3. Check `lease_onboarding_checklists` table exists

### Issue 5: Migration fails with "column already exists"

**Cause**: Migration run twice or column manually added
**Solution**:
```sql
-- Check if column exists
PRAGMA table_info(leases);

-- If it exists, skip migration or use ALTER TABLE IF NOT EXISTS (not supported in SQLite)
-- Safest: Mark migration as complete and continue
```

---

## Success Criteria

- [ ] Database migration successful on production
- [ ] No errors in existing lease queries
- [ ] New leases created via "Proceed to Lease" appear in in-progress view
- [ ] Checklist updates persist correctly
- [ ] Progress bar calculates accurately
- [ ] Complete onboarding transitions lease to active
- [ ] Badge count updates in real-time
- [ ] No console errors in browser
- [ ] Production build successful
- [ ] All unit tests passing

---

## Post-Deployment Tasks

1. **User Communication**:
   - Notify property managers about new lease onboarding workflow
   - Provide quick-start guide (see below)
   - Set expectations for completion timeline

2. **Training**:
   - Demonstrate checklist workflow
   - Show how to complete each step
   - Explain when lease becomes "active"

3. **Monitoring**:
   - Track completion rates for first 2 weeks
   - Identify bottleneck steps
   - Gather user feedback

4. **Future Enhancements**:
   - Plan integration with document generation
   - Plan integration with email reminders
   - Consider per-site checklist customization

---

## Quick Start Guide (for End Users)

### Creating a New Lease

1. Go to **Applications** and select a shortlisted application
2. Click **"Proceed to Lease"**
3. Enter lease start date and term length
4. Submit - you'll be taken to "Leases in Progress"

### Completing the Onboarding Checklist

1. Go to **"Leases in Progress"** in the navigation
2. Find your lease and review the checklist
3. As you complete each step, click the checkbox
4. Optionally add notes to document details
5. Progress bar shows how close you are to completion

### Activating the Lease

1. Complete all 7 required steps
2. Click **"Complete Onboarding"** button
3. Confirm the action
4. Lease moves to main "Leases" list with "Active" status

---

## Related Documentation

- [Feature Specification](./04-leases-in-progress.md)
- [Implementation Plan](./IMPLEMENTATION_PLAN_04.md)
- [API Documentation](../../api/ops-leases.md) (if exists)

---

**Deployment Status**: Ready for Production
**Risk Level**: Medium (requires database migration)
**Estimated Deployment Time**: 30 minutes (migration + code deploy + verification)
**Rollback Time**: <10 minutes (code revert only)
