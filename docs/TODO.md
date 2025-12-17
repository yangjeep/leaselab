# LeaseLab Ops TODO

## Next Up

### 1. Applicant Files Feature
- [x] Implement feature to list all files submitted by an applicant
- [x] Add ability to retrieve/download applicant files in Ops
- [x] Add file upload functionality for ops staff

### 2. Archive Applicant
- [x] Add ability to "archive" (make inactive) an applicant
- [x] Implement soft-delete/inactive status for applicants
- [x] Add archive button to lead detail page
- [x] Create API endpoints for archive/restore

### 3. Tenant Management
- [x] Add Create Tenant functionality
- [x] Add Edit Tenant functionality
- [x] Associate tenant with lease
- [x] Handle lease file association

### 4. Lease-Property Association
- [x] Add lease vs unit/property association
- [x] Implement file access for lease-property relationships

### 4a. Lease Management UI (Ops App)
- [x] Create lease list page with filtering (by status, property, unit, tenant)
- [x] Create lease detail page with full information display
- [x] Add lease status management (draft, pending signature, signed, active, expired, terminated)
- [x] Implement lease file upload/management interface
- [x] Create lease creation form with property/unit/tenant selection
- [x] Create lease edit form with required PDF upload for every update
- [x] Add lease navigation to admin sidebar
- [x] Integrate with Worker API for all CRUD operations

### 5. Remove Lot Size Field
- [x] Remove "Lot Size (sq ft)" from properties - useless data
- [x] Update database schema/migration
- [x] Update frontend forms and displays
- [x] Update TypeScript types and Zod schemas
- [x] Update database operations

### 6. Fix Year Built Logic
- [x] Investigate weird "Year built" logic when adding new properties
- [x] Fix the behavior to be more intuitive
- [x] Add min/max validation to edit form
- [x] Remove unnecessary grid layout
- [x] Add helpful placeholder text

