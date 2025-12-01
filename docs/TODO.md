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
- [ ] Associate tenant with lease
- [ ] Handle lease file association

### 4. Lease-Property Association
- [ ] Add lease vs unit/property association
- [ ] Implement file access for lease-property relationships

### 5. Remove Lot Size Field
- [x] Remove "Lot Size (sq ft)" from properties - useless data
- [x] Update database schema/migration
- [x] Update frontend forms and displays
- [x] Update TypeScript types and Zod schemas
- [x] Update database operations

### 6. Fix Year Built Logic
- [ ] Investigate weird "Year built" logic when adding new properties
- [ ] Fix the behavior to be more intuitive

