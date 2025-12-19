# Migration: Lead Notes & History (0013)

## Summary
Implemented landlord/internal notes for rental applications, removed Monthly Income from public-facing application form, and created an audit history system for tracking applicant changes.

## Changes Made

### 1. Database Schema (`apps/ops/migrations/0013_lead_notes_history.sql`)
- **Added columns to `leads` table:**
  - `landlord_note` (TEXT, nullable) - Internal notes for landlord/admin use
  - `application_note` (TEXT, nullable) - Additional processing notes
  
- **Created `lead_history` table:**
  - Tracks all changes to lead records with event type and JSON event data
  - Similar pattern to existing `unit_history` table
  - Columns: `id`, `lead_id`, `site_id`, `event_type`, `event_data`, `created_at`

- **Legacy data preservation:**
  - Existing `monthly_income` values backfilled into `landlord_note` field
  - History records created for all legacy monthly income data
  - `monthly_income` column deprecated (left in DB but no longer exposed in code)

### 2. Type Definitions (`shared/types/index.ts`)
- **Updated `Lead` interface:**
  - Removed `monthlyIncome: number` field
  - Added `landlordNote?: string` field
  - Added `applicationNote?: string` field

- **Added `LeadHistory` interface:**
  ```typescript
  interface LeadHistory {
    id: string;
    leadId: string;
    siteId: string;
    eventType: string;
    eventData: Record<string, unknown>;
    createdAt: string;
  }
  ```

### 3. Validation Schema (`shared/config/index.ts`)
- **Updated `LeadSubmissionSchema`:**
  - Removed `monthlyIncome` field requirement
  - Public applicants no longer submit income data

- **Updated SQL schema definitions:**
  - Removed `monthly_income REAL NOT NULL` from leads table definition
  - Added `landlord_note TEXT` and `application_note TEXT` columns

### 4. Public Application Form (`apps/site/app/components/ContactForm.tsx`)
- **Removed Monthly Income field:**
  - Deleted income input from form UI
  - No longer collected from applicants during submission

### 5. Public API Route (`apps/site/app/routes/api.tenant-leads.tsx`)
- **Removed income handling:**
  - No longer extracts `monthlyIncome` from form data
  - Removed from API submission payload

### 6. API Client (`apps/site/app/lib/api-client.ts`)
- **Updated `submitApplication` signature:**
  - Removed `monthlyIncome: number` from data parameter type
  - Function now accepts only fields still collected

### 7. Database Server Layer (`apps/ops/app/lib/db.server.ts`)
- **Updated imports:**
  - Added `LeadHistory` type import

- **Modified `createLead` function:**
  - Removed `monthly_income` from INSERT statement
  - Removed binding for monthlyIncome parameter
  - Added automatic history event creation on lead creation

- **Enhanced `updateLead` function:**
  - Added support for `landlordNote` and `applicationNote` updates
  - Automatically records history event for all field changes
  - Captures changed fields in JSON event data

- **Added `mapLeadFromDb` updates:**
  - Removed `monthlyIncome` mapping from database row
  - Added `landlordNote` and `applicationNote` field mappings

- **New helper functions:**
  - `getLeadHistory(db, siteId, leadId)` - Retrieves all history events for a lead
  - `recordLeadHistory(db, siteId, leadId, eventType, eventData)` - Creates new history entry

### 8. Ops Admin List View (`apps/ops/app/routes/admin.leads._index.tsx`)
- **Updated table display:**
  - Changed "Income" column header to "Notes"
  - Display `landlordNote` content instead of formatted monthly income
  - Shows "—" placeholder when no notes present
  - Added truncation for long notes in list view

### 9. Ops Admin Detail View (`apps/ops/app/routes/admin.leads.$id.tsx`)
- **Updated loader:**
  - Added `getLeadHistory` import and call
  - Returns history data along with lead and property

- **Added action handler:**
  - New `updateNotes` action for saving landlord/application notes
  - Calls `updateLead` with note fields

- **Updated UI:**
  - Removed "Financial Assessment" section (no income ratio calculation)
  - Removed Monthly Income display field
  - Added "Internal Notes" section with editable textareas for both note types
  - Added "History" timeline section showing all event records
  - History events display event type, timestamp, and JSON data

### 10. Test Updates (`apps/ops/app/lib/db.server.test.ts`)
- **Updated Lead mapping test:**
  - Removed `monthly_income` from mock database row
  - Removed `monthlyIncome` from expected Lead object
  - Added `landlord_note` and `application_note` to test data
  - Updated assertions to match new schema

## Migration Instructions

### To Apply This Migration:

1. **Run the migration:**
   ```bash
   cd apps/ops
   wrangler d1 migrations apply DB --local  # For local testing
   wrangler d1 migrations apply DB          # For production
   ```

2. **Verify data preservation:**
   - Check that existing leads have `landlord_note` populated with legacy income
   - Confirm `lead_history` table contains backfilled entries

3. **Deploy code changes:**
   - Deploy Site app first (removes income field from public form)
   - Deploy Ops app second (adds note editing and history UI)

## Access Control

- **Public (Site app):**
  - No longer collects or submits monthly income
  - Cannot view notes or history

- **Admin/Landlord (Ops app):**
  - Full read/write access to landlord and application notes
  - Read-only access to complete history timeline
  - All changes automatically logged to history

- **Authentication:**
  - Routes protected by existing `admin.tsx` layout requiring auth
  - `admin/leads/*` routes inherit authentication from parent

## Breaking Changes

⚠️ **API Breaking Change:**
- `LeadSubmissionSchema` no longer accepts `monthlyIncome` field
- External API clients submitting leads must remove this field
- Existing leads retain monthly_income in database (deprecated column)

## Future Improvements

1. **History event types:**
   - Define enum for standardized event types
   - Add user attribution (who made the change)

2. **Note formatting:**
   - Rich text editor for notes
   - File attachments linked to notes

3. **Column cleanup:**
   - Future migration to fully remove deprecated `monthly_income` column via table rebuild
   - Requires SQLite table recreation (CREATE + INSERT + DROP + RENAME pattern)

4. **History UI enhancements:**
   - Diff viewer for changed fields
   - Filter/search history events
   - Export history as audit report

## Rollback Plan

If issues arise, rollback steps:

1. **Revert code deployments** (reverse order: Ops then Site)
2. **Keep migration in place** (data preserved in notes/history)
3. **Optional: Restore monthly_income from landlord_note** if needed:
   ```sql
   UPDATE leads 
   SET monthly_income = CAST(SUBSTR(landlord_note, 24) AS REAL)
   WHERE landlord_note LIKE 'Legacy monthly income: $%';
   ```

## Testing Checklist

- [ ] New leads created without monthly_income field
- [ ] History events logged on lead creation
- [ ] History events logged on lead updates (status, notes, AI score)
- [ ] Landlord notes save and display correctly
- [ ] Application notes save and display correctly
- [ ] History timeline displays all events chronologically
- [ ] Legacy leads show backfilled notes
- [ ] Public form submission works without income field
- [ ] Ops list view shows notes column
- [ ] No TypeScript compilation errors
- [ ] No runtime errors in browser console

---

**Migration ID:** 0013_lead_notes_history  
**Date:** November 26, 2025  
**Status:** ✅ Complete
