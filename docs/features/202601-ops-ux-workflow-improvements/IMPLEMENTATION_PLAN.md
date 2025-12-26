# Implementation Plan: 202601 Ops UX Workflow Improvements

**Status**: In Progress
**Start Date**: 2025-12-23
**Owner**: Senior Engineering Team
**Branch**: `feat/ops-ux-workflow-improvements`

---

## Overview

Implementation of 5 production-quality features to streamline Ops dashboard workflows:
1. Unit-Level Application View (Default)
2. Multi-Select Operations for Applications
3. Multi-Select for Lease and Tenant Views
4. Separate Views: Leases vs. Leases in Progress
5. Work Orders Default View

---

## Tech Stack Context

- **Frontend**: Remix v2.17.2 + React 18.3.1
- **Backend**: Cloudflare Workers + Hono v4.10.6
- **Database**: Cloudflare D1 (SQLite)
- **Testing**: Vitest 1.6.1 + Playwright 1.57.0
- **Styling**: Tailwind CSS 4.1.17

---

## Implementation Phases

### Phase 1: Foundation & Feature 01 (Unit-Level Application View)
**Priority**: HIGH
**Estimated Effort**: 2-3 days

#### Tasks
1. **Database Schema Updates** (if needed)
   - [ ] Review existing `leads` and `units` tables
   - [ ] Add indexes for performance: `(unit_id, status, created_at)`
   - [ ] Migration script for new indexes

2. **API Layer** (`/apps/worker/`)
   - [ ] Update `fetchApplicationsFromWorker` to support `groupBy=unit` parameter
   - [ ] Modify SQL queries to efficiently group/filter by unit
   - [ ] Add unit information to application list responses
   - [ ] Write API tests

3. **Frontend - Types** (`/shared/types/`)
   - [ ] Add `ApplicationListOptions` interface with `groupBy` field
   - [ ] Add `GroupedApplications` type for unit-grouped responses

4. **Frontend - Worker Client** (`/apps/ops/app/lib/worker-client.ts`)
   - [ ] Update `fetchApplicationsFromWorker` signature
   - [ ] Support `groupBy`, `unitId` filter parameters

5. **Frontend - UI Components**
   - [ ] Create `<ViewToggle>` component (unit vs. property)
   - [ ] Create `<UnitGroupedApplicationList>` component
   - [ ] Create `<ApplicationUnitBadge>` component for prominent unit display
   - [ ] Update `<SortableTableHeader>` to work with grouped views

6. **Frontend - Routes**
   - [ ] Update `admin.applications._index.tsx` loader
   - [ ] Add view toggle state (localStorage + URL param)
   - [ ] Render grouped/flat views based on toggle
   - [ ] Handle single-family properties (auto-switch to property view)

7. **Testing**
   - [ ] Unit tests for groupBy logic
   - [ ] Integration tests for API endpoints
   - [ ] E2E tests for view toggle functionality
   - [ ] Test edge cases (no units, single unit)

8. **Documentation**
   - [ ] Update API documentation
   - [ ] Add JSDoc comments
   - [ ] Update user guide

---

### Phase 2: Feature 02 (Multi-Select Operations for Applications)
**Priority**: HIGH
**Estimated Effort**: 3-4 days

#### Tasks
1. **Database Schema Updates**
   - [ ] Create `bulk_actions` table for audit trail
   - [ ] Add migration script
   - [ ] Add indexes: `(created_by, created_at)`, `(status)`

2. **API Layer** (`/apps/worker/`)
   - [ ] Create `/api/ops/applications/bulk` endpoint
   - [ ] Implement bulk operations: reject, move-to-stage, archive, send-email
   - [ ] Add validation: all applications same unit/property
   - [ ] Create `/api/ops/applications/:id/proceed-to-lease` endpoint
   - [ ] Implement transaction handling (all or nothing)
   - [ ] Write comprehensive API tests

3. **Frontend - Types**
   - [ ] Add `BulkActionType` enum
   - [ ] Add `BulkActionRequest` and `BulkActionResult` interfaces
   - [ ] Add `ProceedToLeaseRequest` interface

4. **Frontend - Worker Client**
   - [ ] Add `bulkUpdateApplications()` function
   - [ ] Add `proceedToLease()` function
   - [ ] Error handling for partial failures

5. **Frontend - UI Components**
   - [ ] Create `<MultiSelectCheckbox>` component
   - [ ] Create `<BulkActionToolbar>` component
   - [ ] Create `<BulkConfirmationModal>` component
   - [ ] Create `<ProceedToLeaseButton>` component
   - [ ] Create `<BulkActionProgress>` component

6. **Frontend - Routes**
   - [ ] Update `admin.applications._index.tsx` with multi-select state
   - [ ] Add bulk action handlers
   - [ ] Add "Proceed to Lease" action (shortlist view)
   - [ ] Handle cross-unit selection prevention

7. **State Management**
   - [ ] Implement selection state (React context or local state)
   - [ ] Track selected application IDs
   - [ ] Validate selections are same unit

8. **Testing**
   - [ ] Unit tests for selection logic
   - [ ] API tests for bulk operations
   - [ ] E2E tests for multi-select workflow
   - [ ] Test partial failure scenarios
   - [ ] Test "Proceed to Lease" workflow

---

### Phase 3: Feature 03 (Multi-Select for Lease and Tenant Views)
**Priority**: MEDIUM
**Estimated Effort**: 2-3 days

#### Tasks
1. **API Layer** (`/apps/worker/`)
   - [ ] Create `/api/ops/leases/bulk` endpoint
   - [ ] Create `/api/ops/tenants/bulk` endpoint
   - [ ] Implement lease bulk operations: email, status update, generate docs, export
   - [ ] Implement tenant bulk operations: email, send doc, add tag, export
   - [ ] Write API tests

2. **Frontend - Types**
   - [ ] Add `LeaseBulkActionType` enum
   - [ ] Add `TenantBulkActionType` enum
   - [ ] Add corresponding request/response interfaces

3. **Frontend - Worker Client**
   - [ ] Add `bulkUpdateLeases()` function
   - [ ] Add `bulkUpdateTenants()` function
   - [ ] Add `exportLeases()` and `exportTenants()` functions

4. **Frontend - UI Components**
   - [ ] Reuse `<MultiSelectCheckbox>` from Phase 2
   - [ ] Create `<LeaseBulkActionToolbar>` component
   - [ ] Create `<TenantBulkActionToolbar>` component
   - [ ] Create `<ExportProgressModal>` component

5. **Frontend - Routes**
   - [ ] Update `admin.leases._index.tsx` with multi-select
   - [ ] Update `admin.tenants._index.tsx` with multi-select
   - [ ] Add bulk action handlers for each domain

6. **Testing**
   - [ ] API tests for lease/tenant bulk operations
   - [ ] E2E tests for bulk workflows
   - [ ] Test export functionality
   - [ ] Test quantity limits (max 100 records)

---

### Phase 4: Feature 04 (Leases in Progress)
**Priority**: HIGH
**Estimated Effort**: 4-5 days

#### Tasks
1. **Database Schema Updates**
   - [ ] Add `onboarding_status` column to `leases` table
   - [ ] Create `lease_onboarding_checklists` table
   - [ ] Create `lease_checklist_items` table (or use JSON field)
   - [ ] Add migration scripts
   - [ ] Add indexes

2. **API Layer** (`/apps/worker/`)
   - [ ] Create `/api/ops/leases/in-progress` endpoint
   - [ ] Create `/api/ops/leases/:id/checklist` endpoint
   - [ ] Create `/api/ops/leases/:id/complete-onboarding` endpoint
   - [ ] Implement checklist logic
   - [ ] Write API tests

3. **Business Logic**
   - [ ] Define standard 7-step checklist
   - [ ] Implement checklist step validation
   - [ ] Implement auto-transition logic (on lease start date)
   - [ ] Create checklist templates

4. **Frontend - Types**
   - [ ] Add `LeaseOnboardingStatus` enum
   - [ ] Add `ChecklistItem` interface
   - [ ] Add `LeaseInProgress` interface

5. **Frontend - Worker Client**
   - [ ] Add `fetchLeasesInProgress()` function
   - [ ] Add `updateChecklistItem()` function
   - [ ] Add `completeLeaseOnboarding()` function

6. **Frontend - UI Components**
   - [ ] Create `<LeasesInProgressList>` component
   - [ ] Create `<ChecklistProgress>` component
   - [ ] Create `<ChecklistItem>` component
   - [ ] Create `<RequestDocumentButton>` component
   - [ ] Create `<SendSignatureRequestButton>` component

7. **Frontend - Routes**
   - [ ] Create `admin.leases.in-progress._index.tsx` route
   - [ ] Create `admin.leases.in-progress.$id.tsx` route
   - [ ] Update `admin.leases._index.tsx` to default to active leases
   - [ ] Add navigation tabs/links between views
   - [ ] Add badge counts for pending leases

8. **Integration**
   - [ ] Integrate with "Proceed to Lease" from Phase 2
   - [ ] Email integration for signature requests
   - [ ] Document upload integration

9. **Testing**
   - [ ] Unit tests for checklist logic
   - [ ] API tests for all endpoints
   - [ ] E2E tests for complete onboarding flow
   - [ ] Test transition logic

---

### Phase 5: Feature 05 (Work Orders Default View)
**Priority**: MEDIUM
**Estimated Effort**: 1-2 days

#### Tasks
1. **API Layer** (`/apps/worker/`)
   - [ ] Update `/api/ops/work-orders` to support default filter
   - [ ] Create `/api/ops/work-orders/counts` endpoint for badge
   - [ ] Optimize query performance with indexes
   - [ ] Write API tests

2. **Frontend - Worker Client**
   - [ ] Update `fetchWorkOrdersFromWorker()` to default `status=open,in_progress`
   - [ ] Add `fetchWorkOrderCounts()` function

3. **Frontend - UI Components**
   - [ ] Create `<WorkOrderFilterPresets>` component
   - [ ] Create `<WorkOrderStatusBadge>` component with visual distinction
   - [ ] Create `<WorkOrderNavigationBadge>` component
   - [ ] Update status indicators (color + icon)

4. **Frontend - Routes**
   - [ ] Update `admin.work-orders._index.tsx` loader with default filter
   - [ ] Add filter preset buttons
   - [ ] Persist filter selection in localStorage
   - [ ] Update URL params to reflect filter

5. **Navigation**
   - [ ] Add badge count to navigation menu
   - [ ] Implement auto-refresh for badge (30s polling)
   - [ ] Add toast notifications for new urgent work orders

6. **Testing**
   - [ ] Unit tests for filter logic
   - [ ] API tests for counts endpoint
   - [ ] E2E tests for filter persistence
   - [ ] Test visual distinctions (a11y)

---

### Phase 6: Testing & Quality Assurance
**Priority**: CRITICAL
**Estimated Effort**: 2-3 days

#### Tasks
1. **Unit Tests**
   - [ ] Test coverage > 80% for all new code
   - [ ] Test edge cases and error handling
   - [ ] Test validation logic

2. **Integration Tests**
   - [ ] Test all API endpoints
   - [ ] Test database operations
   - [ ] Test worker client functions

3. **E2E Tests (Playwright)**
   - [ ] Test complete user workflows
   - [ ] Test multi-select operations
   - [ ] Test filter persistence
   - [ ] Test navigation between views
   - [ ] Test responsive design (mobile)

4. **Performance Testing**
   - [ ] Test with large datasets (1000+ records)
   - [ ] Measure query performance
   - [ ] Optimize slow queries
   - [ ] Test pagination

5. **Accessibility Testing**
   - [ ] Keyboard navigation
   - [ ] Screen reader compatibility
   - [ ] Color contrast (WCAG AA)
   - [ ] ARIA labels

6. **Manual QA**
   - [ ] Cross-browser testing (Chrome, Firefox, Safari)
   - [ ] Mobile testing (iOS, Android)
   - [ ] Edge case testing
   - [ ] User acceptance testing

---

### Phase 7: Documentation & Deployment
**Priority**: HIGH
**Estimated Effort**: 1-2 days

#### Tasks
1. **Code Documentation**
   - [ ] JSDoc comments for all public functions
   - [ ] Inline comments for complex logic
   - [ ] Update type definitions with descriptions

2. **API Documentation**
   - [ ] Document new endpoints
   - [ ] Document request/response schemas
   - [ ] Add example requests

3. **User Documentation**
   - [ ] Update user guide with new features
   - [ ] Create tutorial videos/GIFs
   - [ ] Update FAQ

4. **Deployment Preparation**
   - [ ] Review all migrations
   - [ ] Prepare rollback plan
   - [ ] Create deployment checklist
   - [ ] Set up monitoring/alerts

5. **Code Review**
   - [ ] Self-review all code
   - [ ] Peer review
   - [ ] Address feedback
   - [ ] Final QA check

---

## Implementation Guidelines

### Code Quality Standards

1. **TypeScript**
   - Strict mode enabled
   - No `any` types
   - Comprehensive interfaces for all data structures

2. **Error Handling**
   - Try-catch blocks for all async operations
   - Meaningful error messages
   - Proper HTTP status codes
   - User-friendly error display

3. **Performance**
   - Lazy load components where appropriate
   - Debounce search/filter inputs
   - Use pagination for large lists
   - Optimize database queries with indexes

4. **Security**
   - Validate all user inputs
   - Use parameterized queries (prevent SQL injection)
   - Implement CSRF protection
   - Check permissions before operations

5. **Accessibility**
   - Semantic HTML
   - Keyboard navigable
   - ARIA labels for screen readers
   - Color + icon/text for status (not color alone)

### Git Commit Strategy

**Branch Naming**: `feat/ops-ux-workflow-improvements`

**Commit Pattern**: One commit per logical unit of work

**Commit Message Format**:
```
<type>(<scope>): <subject>

<body>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Types**: feat, fix, refactor, test, docs, style, chore

**Examples**:
```
feat(applications): Add unit-level view toggle

- Add groupBy parameter to applications API
- Create ViewToggle component
- Update applications list route with toggle state
- Add localStorage persistence for view preference

feat(applications): Implement multi-select for bulk operations

- Create BulkActionToolbar component
- Add bulk update API endpoint
- Implement selection state management
- Add confirmation modal for bulk actions

test(applications): Add E2E tests for multi-select workflow

- Test bulk rejection flow
- Test proceed to lease action
- Test cross-unit selection prevention
```

### Testing Strategy

1. **Test Pyramid**
   - 70% Unit tests (fast, isolated)
   - 20% Integration tests (API + DB)
   - 10% E2E tests (critical user paths)

2. **Coverage Targets**
   - Unit: > 80%
   - Integration: > 60%
   - E2E: Critical workflows only

3. **Test Data**
   - Use factories for test data generation
   - Clean up after each test
   - Use transactions for DB tests

### Code Review Checklist

- [ ] Follows existing code patterns
- [ ] TypeScript types are comprehensive
- [ ] Error handling is robust
- [ ] Tests are comprehensive
- [ ] Performance is acceptable
- [ ] Accessibility requirements met
- [ ] Documentation is complete
- [ ] No security vulnerabilities
- [ ] Mobile responsive
- [ ] Works in all supported browsers

---

## Dependencies & Blockers

### External Dependencies
- Email system (Feature #1 from 202601-next-batch) - for bulk emails
- Document system - for lease document generation
- Signature system - for lease signatures

### Potential Blockers
- Database migration approval (production)
- Email provider configuration
- Performance issues with large datasets

### Mitigation Strategies
- Implement email bulk actions as "coming soon" if email system not ready
- Use existing document upload for leases in progress
- Add pagination and optimize queries proactively

---

## Success Metrics

### Technical Metrics
- Test coverage > 80%
- Page load time < 2s
- API response time < 500ms
- Zero critical bugs in production
- Accessibility score (Lighthouse) > 90

### User Metrics
- 30% reduction in clicks to reach application details
- 60% reduction in time to process multiple applications
- 70% reduction in time for renewal reminders
- 40% reduction in time to first action on work orders
- 80% of users stay on default filtered views

### Business Metrics
- Reduced operational overhead
- Faster lease onboarding
- Improved user satisfaction (survey > 4.5/5)
- Fewer missed urgent items

---

## Risk Management

### High Risk
- **Database migrations in production**: Test thoroughly in staging, have rollback plan
- **Performance with large datasets**: Load test with 10k+ records, optimize queries
- **Breaking changes to existing workflows**: Maintain backward compatibility, feature flags

### Medium Risk
- **Browser compatibility issues**: Test in all major browsers early
- **Mobile responsiveness**: Mobile-first development, test on real devices
- **User adoption**: Provide training, clear documentation, gather feedback

### Low Risk
- **Minor UI bugs**: QA testing, user feedback loop
- **Edge cases**: Comprehensive testing, error handling

---

## Timeline Estimate

| Phase | Duration | Status |
|-------|----------|--------|
| Phase 1: Feature 01 | 2-3 days | Not Started |
| Phase 2: Feature 02 | 3-4 days | Not Started |
| Phase 3: Feature 03 | 2-3 days | Not Started |
| Phase 4: Feature 04 | 4-5 days | Not Started |
| Phase 5: Feature 05 | 1-2 days | Not Started |
| Phase 6: Testing & QA | 2-3 days | Not Started |
| Phase 7: Documentation & Deployment | 1-2 days | Not Started |
| **Total** | **15-22 days** | **0% Complete** |

---

## Next Steps

1. ✅ Create implementation plan document
2. ⏳ Start Phase 1: Feature 01 (Unit-Level Application View)
3. ⏳ Commit initial database schema changes
4. ⏳ Implement API endpoints
5. ⏳ Build UI components

---

## Notes

- This is a living document - update as implementation progresses
- Mark tasks complete with ✅
- Document any deviations from plan
- Track blockers and resolutions
- Update timeline estimates based on actual progress
