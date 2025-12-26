# Feature 02: Multi-Select Operations for Applications + "Proceed to Lease"

**Status**: Draft
**Feature ID**: 202601-UX-02
**Last Updated**: 2025-12-23

---

## Problem Statement

Processing multiple applications for the same property/unit involves repetitive actions—rejecting multiple candidates, moving groups through stages, or sending batch emails. These repetitive tasks slow down operations and increase the likelihood of errors or oversights.

Additionally, the "Shortlist" stage is the natural transition point to lease creation, but this critical action is currently not streamlined. Property managers need a clear, efficient way to move from shortlisted applications to initiating the lease process.

---

## User Stories

### Story 1: Multi-Select with Checkboxes

**As a property manager**, I want to select multiple applications within the same property/unit using checkboxes, so that I can perform bulk actions like rejection or status updates without clicking each one individually.

**Acceptance Criteria:**
- Checkboxes appear on each application card/row in list view
- Selecting multiple applications enables a bulk action toolbar
- Clear visual feedback shows which applications are selected
- A "select all" option exists for selecting all visible applications

### Story 2: "Proceed to Lease" in Shortlist

**As a property manager in the Shortlist view**, I want a "Proceed to Lease" button for selected applications, so that I can quickly initiate lease creation for approved applicants.

**Acceptance Criteria:**
- "Proceed to Lease" button appears when applications are selected in Shortlist view
- Button is clearly labeled and visually prominent
- Clicking initiates the lease creation workflow
- System confirms the action before proceeding

### Story 3: Scoped Multi-Select

**As a property manager**, I want multi-select to be restricted to applications within the same property/unit, so that I don't accidentally perform incompatible bulk actions across different units.

**Acceptance Criteria:**
- Selecting an application from a different unit/property clears previous selections (or shows warning)
- UI clearly indicates which unit/property scope is active for multi-select
- Error message appears if attempting cross-unit bulk action

### Story 4: Comprehensive Bulk Actions

**As an ops admin**, I want bulk actions to include: bulk reject, bulk move to next stage, bulk archive, and bulk email, so that I can handle common workflows efficiently.

**Acceptance Criteria:**
- Bulk action menu includes: Reject, Move to Stage, Archive, Send Email
- Each action shows a confirmation modal with summary of affected applications
- Actions execute atomically (all or nothing)
- Success/failure feedback is clear and actionable

---

## Acceptance Criteria (Feature-Level)

1. **Checkbox UI**: Checkboxes appear on application list items
2. **Bulk Toolbar**: Selecting applications enables a bulk action toolbar with relevant operations
3. **Unit Scoping**: Bulk actions are scoped to a single property/unit (UI prevents cross-unit multi-select)
4. **Proceed to Lease**: Button available in Shortlist view when one application is selected (configurable for multiple if co-tenants supported)
5. **Confirmation**: All bulk actions show a confirmation modal with summary of affected applications
6. **Audit Trail**: All bulk actions are audited (who performed, which applications, when)
7. **Error Handling**: Clear error messages if bulk action fails, with partial success indication if applicable

---

## Technical Considerations

### UI/UX Design

```
┌─────────────────────────────────────────────────────────────┐
│ Applications: Unit 2B                    [Shortlist Filter]  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ☑ 2 selected   [✕ Reject] [→ Move to...] [✉ Email]     │ │
│ │                             [▶ Proceed to Lease]        │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ ☑ John Doe                                      [Shortlist] │
│   Applied: Dec 1  •  Score: 85  •  Docs: Complete          │
│                                                              │
│ ☑ Jane Smith                                    [Shortlist] │
│   Applied: Dec 3  •  Score: 82  •  Docs: Pending           │
│                                                              │
│ ☐ Bob Wilson                                 [Under Review] │
│   Applied: Dec 5  •  Score: 78  •  Docs: Complete          │
└─────────────────────────────────────────────────────────────┘
```

### Data Model

No schema changes required for multi-select (UI state only).

**Audit Log Extension:**
```sql
-- Add bulk_action_id to link related audit entries
ALTER TABLE audit_log ADD COLUMN bulk_action_id TEXT;
```

### API Design

**New Bulk Operations Endpoint:**
```
POST /api/ops/applications/bulk
```

**Request:**
```json
{
  "application_ids": [123, 124, 125],
  "action": "reject" | "move_to_stage" | "archive" | "send_email",
  "params": {
    "stage": "rejected",
    "reason": "Not qualified",
    "email_template_id": "rejection_template"
  },
  "bulk_action_id": "uuid-1234"
}
```

**Response:**
```json
{
  "bulk_action_id": "uuid-1234",
  "success_count": 2,
  "failure_count": 1,
  "results": [
    {"application_id": 123, "status": "success"},
    {"application_id": 124, "status": "success"},
    {"application_id": 125, "status": "failed", "error": "Application already leased"}
  ]
}
```

**Proceed to Lease Endpoint:**
```
POST /api/ops/applications/:id/proceed-to-lease
```

**Request:**
```json
{
  "co_applicant_ids": [124, 125],  // Optional: for roommate scenarios
  "lease_start_date": "2026-02-01",
  "lease_term_months": 12
}
```

**Response:**
```json
{
  "lease_in_progress_id": 789,
  "redirect_url": "/leases/in-progress/789"
}
```

---

## State Management

### Frontend State

```typescript
interface MultiSelectState {
  selectedApplicationIds: string[]
  selectedUnit: string | null  // Enforce single-unit selection
  bulkActionInProgress: boolean
  lastBulkActionResult: BulkActionResult | null
}
```

### Validation Rules

1. All selected applications must belong to the same unit
2. "Proceed to Lease" only available when:
   - Exactly 1 application selected (or N if co-tenants enabled)
   - All selected applications are in "Shortlist" stage
   - Unit is available (no active lease)

---

## Open Questions

1. **Co-Tenant Support**: Should "Proceed to Lease" support multiple applicants (roommates/co-tenants) in one action?
   - **Option A**: Single applicant only (primary tenant), add co-tenants later
   - **Option B**: Support multiple selection for roommate scenarios

   **Recommendation**: Start with Option A, add multi-tenant support in Phase 2

2. **Handling Other Shortlisted Applications**: What happens to other shortlisted applications for the same unit when one proceeds to lease?
   - **Option A**: Automatically reject/archive them
   - **Option B**: Move them to a "Hold" or "Backup" status
   - **Option C**: Prompt user to decide

   **Recommendation**: Option C (show confirmation modal listing other shortlisted apps)

3. **Partial Failures**: How to handle partial success in bulk operations?
   - Show summary modal: "2/3 successful, 1 failed"
   - Allow retry of failed items
   - Log all actions regardless of success/failure

4. **Bulk Action Limits**: Should there be a maximum number of applications that can be selected at once?
   - **Recommendation**: Limit to 50 applications per bulk action for performance

---

## Success Metrics

- **Time Savings**: Measure time to process 10 applications (before vs. after bulk actions)
- **Error Reduction**: Track accidental rejections or status changes
- **Adoption Rate**: % of application decisions made via bulk actions vs. individual actions
- **Lease Conversion**: Time from shortlist to lease initiation

**Targets:**
- 60% reduction in time to process multiple applications
- 80% of bulk actions complete successfully on first attempt
- "Proceed to Lease" used for 70%+ of lease initiations from shortlist

---

## Dependencies

- **Feature 01 (Unit-Level View)**: Multi-select respects unit grouping
- **Feature 04 (Leases in Progress)**: "Proceed to Lease" navigates to Leases in Progress view
- **Email System** (202601-next-batch Feature #1): Required for bulk email action
- **Audit System**: Must log all bulk actions

---

## Implementation Notes

### Phase 1: Multi-Select Infrastructure
1. Add checkbox component to application list items
2. Implement selection state management
3. Create bulk action toolbar component
4. Add unit-scoping validation

### Phase 2: Bulk Operations
1. Implement backend bulk operations endpoint
2. Add confirmation modals for each bulk action
3. Implement audit logging for bulk actions
4. Add error handling and partial success reporting

### Phase 3: "Proceed to Lease"
1. Create "Proceed to Lease" endpoint
2. Integrate with Leases in Progress workflow
3. Add confirmation modal for handling other shortlisted applications
4. Implement validation (unit availability, application status)

### Phase 4: Polish
1. Add keyboard shortcuts (Shift+click for range selection)
2. Implement optimistic UI updates
3. Add undo functionality for bulk actions
4. Improve loading and success states

---

## Security Considerations

- **Authorization**: Verify user has permission for bulk actions on all selected applications
- **Rate Limiting**: Prevent abuse of bulk operations
- **Audit Trail**: Log all bulk actions with full details
- **Validation**: Server-side validation of all bulk action parameters

---

## Related Features

- [01 - Unit-Level Application View](./01-unit-level-application-view.md): Multi-select respects unit grouping
- [04 - Leases in Progress](./04-leases-in-progress.md): "Proceed to Lease" workflow
- 202601-next-batch Feature #1 (Email Handling): Required for bulk email
