# QA Checklist - Application Progress Workflow

## Overview
This document provides a comprehensive QA checklist for testing the Application Progress Workflow feature on the preview environment before production deployment.

**Feature Branch**: `feat/202512-application-progress-and-property-based-flow`
**Preview Database**: `leaselab-db-preview`
**Test Date**: 2025-12-19
**QA Status**: ✅ Ready for Testing

---

## Pre-Testing Setup

### 1. Database Migration Verification
- [ ] Verify migration `0009_application_progress_workflow.sql` ran successfully on preview
- [ ] Confirm all 4 new tables exist:
  - [ ] `application_applicants`
  - [ ] `application_documents`
  - [ ] `application_stage_transitions`
  - [ ] `application_internal_notes`
- [ ] Verify `leads` table has new columns (primary_applicant_id, shortlisted_at, etc.)
- [ ] Check migration history table shows migration record

**Commands**:
```bash
wrangler d1 execute leaselab-db-preview --remote --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
wrangler d1 execute leaselab-db-preview --remote --command "PRAGMA table_info(application_applicants);"
```

### 2. Deployment Verification
- [ ] Worker deployed to preview environment
- [ ] Ops app deployed to preview environment
- [ ] All API routes accessible
- [ ] No deployment errors in logs

**Test Endpoints**:
```bash
curl https://preview-ops.leaselab.com/api/health
```

---

## Functional Testing

### 3. Property-Centric Application Views

#### 3.1 Application Board (`/admin/applications`)
- [ ] Page loads without errors
- [ ] All properties displayed in grid layout
- [ ] Property cards show:
  - [ ] Property name and address
  - [ ] Property image placeholder
  - [ ] Application counts (pending/shortlisted)
- [ ] Click on property card navigates to property-specific view
- [ ] "New Application" button present and functional
- [ ] Empty state shows when no properties exist

#### 3.2 Property Application List (`/admin/properties/:propertyId/applications`)
- [ ] Page loads with correct property information
- [ ] Filter sidebar present with all options:
  - [ ] Stage filter (All, New, Documents Pending, etc.)
  - [ ] Sort by (AI Score, Date Applied, Last Updated)
  - [ ] Sort order (High to Low, Low to High)
- [ ] Applications display correctly with:
  - [ ] Applicant name
  - [ ] AI grade badge (A/B/C/D)
  - [ ] Status badge
  - [ ] Email and phone
  - [ ] Application date
  - [ ] AI score (large number on right)
- [ ] Click on application card navigates to detail page
- [ ] Filters work correctly and update URL params
- [ ] Clear filters button resets all filters
- [ ] Empty state shows when no applications match filters

### 4. Multi-Applicant Management

#### 4.1 Applicant Cards
- [ ] Primary applicant displays with correct badge color (indigo)
- [ ] Co-applicants display with correct badge color (blue)
- [ ] Guarantors display with correct badge color (purple)
- [ ] Expand/collapse functionality works
- [ ] Contact information displays correctly:
  - [ ] Email (clickable mailto link)
  - [ ] Phone (clickable tel link)
  - [ ] Date of birth
- [ ] Employment information shows:
  - [ ] Employment status
  - [ ] Employer name
  - [ ] Job title
  - [ ] Monthly income (formatted with commas)
- [ ] AI evaluation displays:
  - [ ] AI score (0-100)
  - [ ] AI grade badge (A/B/C/D with correct colors)
- [ ] Background check status shows with correct colors
- [ ] Invite status badge displays correctly
- [ ] "Copy Invite Link" button works and copies to clipboard

#### 4.2 Applicant Creation
- [ ] Can add co-applicant from application detail page
- [ ] Can add guarantor from application detail page
- [ ] Invite email/token generated correctly
- [ ] Invite expiration set correctly
- [ ] Applicant saved to database

### 5. Document Management

#### 5.1 Documents List
- [ ] Documents grouped by type (Government ID, Pay Stub, etc.)
- [ ] Each document shows:
  - [ ] File name
  - [ ] Upload date
  - [ ] File size (formatted correctly)
  - [ ] Verification status badge
  - [ ] Expiration date (if applicable)
- [ ] Verification status colors correct:
  - [ ] Pending: yellow
  - [ ] Verified: green
  - [ ] Rejected: red
  - [ ] Expired: gray
- [ ] Download button works
- [ ] Verify button only shows for pending documents
- [ ] Reject button only shows for pending documents
- [ ] Delete button works with confirmation

#### 5.2 Document Verification Workflow
- [ ] Click verify marks document as verified
- [ ] Click reject shows rejection reason form
- [ ] Rejection requires reason (not blank)
- [ ] Rejection reason saved and displayed
- [ ] Rejected documents show reason in red box
- [ ] Verified documents show verified date and user

### 6. Stage Workflow with Gating

#### 6.1 Enhanced Stage Workflow Component
- [ ] Progress bar shows correct stage position
- [ ] All stages display with correct indicators:
  - [ ] Completed: green checkmark
  - [ ] Current: indigo with ring
  - [ ] Future: gray
- [ ] Current stage info box shows stage description
- [ ] Stage checklist displays with:
  - [ ] Required items marked with asterisk
  - [ ] Optional items in separate section
  - [ ] Progress bar shows completion percentage
  - [ ] Items can be checked/unchecked
- [ ] Previous/Next buttons enabled/disabled correctly
- [ ] Loading state shows during transition

#### 6.2 Stage Confirmation Dialog
- [ ] Dialog opens when clicking "Next Stage"
- [ ] Shows from/to stage transition clearly
- [ ] Displays incomplete required items
- [ ] Shows warnings (if applicable):
  - [ ] Low AI score warning
  - [ ] Failed background check warning
  - [ ] Skipped stage warning
- [ ] "Bypass requirements" option shows when items incomplete
- [ ] Bypass reason textarea requires minimum 10 characters
- [ ] Confirm button disabled until requirements met or bypass reason provided
- [ ] Cancel button closes dialog without changes
- [ ] Transition executes and updates application status

#### 6.3 Stage-Specific Checklist Validation

**New → Documents Pending**:
- [ ] Verify contact info checked when email and phone present
- [ ] Verify employment checked when employment_status and employer_name present
- [ ] Review application always unchecked (manual)

**Documents Pending → Documents Received**:
- [ ] All documents uploaded checked when gov ID, paystub, and bank statement present
- [ ] Co-applicants completed checked when all have invite_status = 'completed'

**Documents Received → AI Evaluated**:
- [ ] Verify government ID checked when doc verified
- [ ] Verify income docs checked when paystub or bank_statement verified
- [ ] No rejected docs checked when no documents have status 'rejected'

**AI Evaluated → Screening**:
- [ ] AI evaluation complete checked when ai_score is not null
- [ ] AI score acceptable checked when ai_score >= 50
- [ ] Warning shows when ai_score < 50

**Screening → Decision**:
- [ ] Background check received checked when all applicants have status != 'pending'
- [ ] Warning shows when any applicant has status 'failed'
- [ ] Warning shows when any applicant has status 'review_required'

### 7. Internal Notes

#### 7.1 Notes List
- [ ] Notes display in correct order (newest first)
- [ ] Category badges show with correct colors:
  - [ ] General: gray
  - [ ] Red Flag: red
  - [ ] Follow Up: yellow
  - [ ] Verification: blue
  - [ ] Communication: purple
  - [ ] Decision: green
- [ ] Priority icons display correctly (○ ◐ ◉ ⚠)
- [ ] Sensitive notes show lock icon
- [ ] Category filter buttons work
- [ ] Filter counts accurate

#### 7.2 Add Note
- [ ] "Add Note" button opens form
- [ ] Textarea accepts multi-line input
- [ ] Category dropdown has all 6 categories
- [ ] Priority dropdown has all 4 levels
- [ ] "Mark as sensitive" checkbox works
- [ ] Add button disabled when textarea empty
- [ ] Note saves and appears in list
- [ ] Created by and timestamp display correctly

#### 7.3 Delete Note
- [ ] Delete button only shows for notes created by current user
- [ ] Confirmation dialog appears before delete
- [ ] Note removed from list after delete

### 8. API Endpoints Testing

#### 8.1 Applicants API
```bash
# Get applicants for application
GET /api/ops/applications/:applicationId/applicants

# Create applicant
POST /api/ops/applications/:applicationId/applicants
{
  "applicantType": "co_applicant",
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane@example.com",
  "phone": "555-5678"
}

# Update applicant
PATCH /api/ops/applicants/:applicantId
{
  "aiScore": 85,
  "aiLabel": "A"
}

# Delete applicant
DELETE /api/ops/applicants/:applicantId
```

- [ ] All endpoints return correct status codes
- [ ] Response data matches expected format
- [ ] Error handling works for invalid IDs
- [ ] Authorization checks work (X-Site-Id, X-User-Id headers)

#### 8.2 Documents API
```bash
# Get documents
GET /api/ops/applications/:applicationId/documents

# Create document
POST /api/ops/applications/:applicationId/documents

# Verify document
POST /api/ops/documents/:documentId/verify

# Reject document
POST /api/ops/documents/:documentId/reject
{
  "reason": "Document expired"
}
```

- [ ] All endpoints work correctly
- [ ] Verification status updates properly
- [ ] Rejection reason saved

#### 8.3 Transitions API
```bash
# Get transitions
GET /api/ops/applications/:applicationId/transitions

# Create transition
POST /api/ops/applications/:applicationId/transitions
{
  "fromStage": "new",
  "toStage": "documents_pending",
  "bypassReason": null,
  "checklistSnapshot": {...}
}
```

- [ ] Audit trail recorded correctly
- [ ] Checklist snapshot saved
- [ ] Bypass reason captured when provided

#### 8.4 Notes API
```bash
# Get notes
GET /api/ops/applications/:applicationId/notes

# Create note
POST /api/ops/applications/:applicationId/notes
{
  "noteText": "Test note",
  "noteCategory": "general",
  "priority": "low",
  "isSensitive": false
}

# Delete note
DELETE /api/ops/notes/:noteId
```

- [ ] All CRUD operations work
- [ ] Category filtering works
- [ ] High priority notes endpoint works

#### 8.5 Property-Centric APIs
```bash
# Get property applications
GET /api/ops/properties/:propertyId/applications?status=new&sortBy=ai_score&sortOrder=desc

# Get shortlist
GET /api/ops/properties/:propertyId/shortlist
```

- [ ] Filtering works (status parameter)
- [ ] Sorting works (sortBy, sortOrder parameters)
- [ ] Shortlist returns only shortlisted applications

---

## Performance Testing

### 9. Load Testing
- [ ] Application list loads in < 2 seconds with 50 applications
- [ ] Stage workflow renders in < 500ms
- [ ] API responses < 200ms for single applicant queries
- [ ] Document list renders in < 1 second with 20 documents
- [ ] Notes list renders in < 500ms with 30 notes

### 10. Edge Cases
- [ ] Application with no applicants handles gracefully
- [ ] Application with 5+ co-applicants displays correctly
- [ ] Documents with very long file names truncate properly
- [ ] Notes with very long text wrap correctly
- [ ] Stage transitions with bypassed requirements log correctly

---

## Security Testing

### 11. Authorization
- [ ] Cannot access applications from different site_id
- [ ] X-Site-Id header required for all API calls
- [ ] X-User-Id header required for audit trails
- [ ] Sensitive notes hidden from unauthorized users
- [ ] Delete operations check user ownership

### 12. Data Validation
- [ ] Invalid applicantType rejected
- [ ] Invalid stage names rejected
- [ ] Bypass reason minimum length enforced
- [ ] Email format validated
- [ ] Phone format validated

---

## Browser Compatibility

### 13. Cross-Browser Testing
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

---

## Regression Testing

### 14. Existing Features
- [ ] Existing application list still works
- [ ] Lead creation still works
- [ ] Property management still works
- [ ] User authentication still works
- [ ] AI evaluation still works

---

## Sign-Off

**QA Engineer**: ________________
**Date**: ________________
**Status**: [ ] Pass [ ] Fail [ ] Conditional Pass
**Notes**:

---

## Issues Found

| Issue # | Severity | Description | Status |
|---------|----------|-------------|--------|
| 1       |          |             |        |
| 2       |          |             |        |
| 3       |          |             |        |

---

## Production Readiness Checklist

Before deploying to production:
- [ ] All QA tests passed
- [ ] All issues resolved or documented
- [ ] Performance meets requirements
- [ ] Security review completed
- [ ] Database migration tested on production backup
- [ ] Rollback plan documented
- [ ] Monitoring and alerts configured
- [ ] Documentation updated
- [ ] Stakeholder approval obtained
