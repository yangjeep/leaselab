# Feature 03: Multi-Select and Bulk Operations in Lease and Tenant Views

**Status**: Draft
**Feature ID**: 202601-UX-03
**Last Updated**: 2025-12-23

---

## Problem Statement

Similar to application management, lease and tenant operations involve repetitive tasks that would benefit from batch processing. Property managers frequently need to:

- Send renewal reminders to multiple tenants approaching lease end
- Update lease statuses (e.g., moving multiple leases to "terminated" after move-out)
- Generate batch documents (renewal letters, notices)
- Export tenant data for reporting or compliance
- Send bulk communications to groups of tenants

Without multi-select and bulk operations, these tasks require clicking through each lease or tenant individually, leading to inefficiency and increased risk of errors or missed actions.

---

## User Stories

### Story 1: Multi-Select Leases

**As a property manager**, I want to select multiple leases using checkboxes, so that I can perform bulk operations like sending renewal reminders, updating status, or generating reports.

**Acceptance Criteria:**
- Checkboxes appear on each lease card/row in list view
- Selecting multiple leases enables a bulk action toolbar
- Clear visual feedback shows which leases are selected
- "Select all" option for current page/view

### Story 2: Multi-Select Tenants

**As an ops admin**, I want to select multiple tenant records, so that I can bulk send notices, update contact information templates, or export tenant data.

**Acceptance Criteria:**
- Checkboxes appear on tenant list items
- Bulk action toolbar appears when tenants are selected
- Selection persists during filtering/sorting
- Clear indication of how many tenants are selected

### Story 3: Lease Bulk Operations

**As a property manager**, I want bulk operations on leases to include: bulk status update, bulk document generation (e.g., renewal letters), bulk email, and bulk export, so that I can handle end-of-term workflows efficiently.

**Acceptance Criteria:**
- Bulk actions include: Update Status, Generate Documents, Send Email, Export
- Each action shows confirmation with affected lease count
- Document generation creates individual documents per lease
- Export produces CSV/Excel with selected lease details

### Story 4: Tenant Bulk Operations

**As an ops admin**, I want bulk operations on tenants to include: bulk email, bulk document send, bulk tag/categorize, and bulk export, so that I can communicate with or organize groups of tenants quickly.

**Acceptance Criteria:**
- Bulk actions include: Send Email, Send Document, Add Tag, Export
- Email action supports template selection
- Document send tracks delivery status
- Export includes relevant tenant and lease information

---

## Acceptance Criteria (Feature-Level)

1. **Checkbox UI**: Checkboxes appear on lease and tenant list views
2. **Bulk Toolbar**: Multi-select enables a bulk action toolbar with relevant operations
3. **Transaction Safety**: Bulk actions are transaction-safe (all succeed or all fail with clear error messaging)
4. **Audit Trail**: All bulk operations are logged with user, timestamp, and affected records
5. **Progress Feedback**: UI provides clear feedback during bulk operations (progress indicator, success/failure summary)
6. **Performance**: Bulk operations handle up to 100 records efficiently
7. **Validation**: Server-side validation prevents invalid bulk operations

---

## Technical Considerations

### UI/UX Design

**Lease List with Multi-Select:**
```
┌─────────────────────────────────────────────────────────────┐
│ Leases                                    [Active ▼] [+ New] │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ☑ 3 selected   [📧 Email] [📄 Generate] [↻ Update]     │ │
│ │                                          [⬇ Export]      │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ ☑ Lease #1024 - John Doe (Unit 2B)               [Active]  │
│   Start: Jan 1, 2024  •  End: Dec 31, 2024  •  $1,500/mo   │
│                                                              │
│ ☑ Lease #1025 - Jane Smith (Unit 3A)             [Active]  │
│   Start: Feb 1, 2024  •  End: Jan 31, 2025  •  $1,600/mo   │
│                                                              │
│ ☑ Lease #1026 - Bob Wilson (Unit 1C)             [Active]  │
│   Start: Mar 1, 2024  •  End: Feb 28, 2025  •  $1,450/mo   │
└─────────────────────────────────────────────────────────────┘
```

**Tenant List with Multi-Select:**
```
┌─────────────────────────────────────────────────────────────┐
│ Tenants                                   [All ▼] [+ Add]    │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ☑ 5 selected   [📧 Email] [📋 Send Doc] [🏷 Tag]       │ │
│ │                                          [⬇ Export]      │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ ☑ John Doe                                    Unit 2B       │
│   Email: john@email.com  •  Phone: (555) 123-4567          │
│   Lease: Active (ends Dec 31, 2024)                        │
└─────────────────────────────────────────────────────────────┘
```

### Data Model

**Bulk Action Tracking:**
```sql
CREATE TABLE bulk_actions (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,  -- 'lease_bulk' | 'tenant_bulk'
  action TEXT NOT NULL,  -- 'email' | 'status_update' | 'generate_docs' | 'export'
  record_ids JSON NOT NULL,  -- Array of lease/tenant IDs
  params JSON,
  status TEXT NOT NULL,  -- 'pending' | 'in_progress' | 'completed' | 'failed'
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  results JSON,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);
```

### API Design

**Lease Bulk Operations:**
```
POST /api/ops/leases/bulk
```

**Request:**
```json
{
  "lease_ids": [1024, 1025, 1026],
  "action": "send_email" | "update_status" | "generate_documents" | "export",
  "params": {
    "email_template_id": "renewal_reminder",
    "new_status": "expiring_soon",
    "document_template": "renewal_letter"
  },
  "bulk_action_id": "uuid-5678"
}
```

**Tenant Bulk Operations:**
```
POST /api/ops/tenants/bulk
```

**Request:**
```json
{
  "tenant_ids": [201, 202, 203],
  "action": "send_email" | "send_document" | "add_tag" | "export",
  "params": {
    "email_template_id": "notice_template",
    "document_id": "lease_amendment",
    "tags": ["renewal_priority", "long_term"]
  },
  "bulk_action_id": "uuid-9012"
}
```

**Response (Common):**
```json
{
  "bulk_action_id": "uuid-5678",
  "status": "completed",
  "success_count": 2,
  "failure_count": 1,
  "results": [
    {"record_id": 1024, "status": "success"},
    {"record_id": 1025, "status": "success"},
    {"record_id": 1026, "status": "failed", "error": "Invalid email address"}
  ],
  "download_url": "/downloads/bulk-export-uuid-5678.csv"  // For export action
}
```

---

## Bulk Operations Specification

### Lease Bulk Operations

| Operation | Description | Params | Notes |
|-----------|-------------|--------|-------|
| **Update Status** | Change lease status | `new_status`, `reason` | Validates status transitions |
| **Send Email** | Send templated email | `email_template_id`, `variables` | Uses email worker (Feature #1) |
| **Generate Documents** | Create renewal letters, etc. | `document_template`, `delivery_method` | Async job for large batches |
| **Export** | CSV/Excel export | `fields`, `format` | Includes lease + tenant details |

### Tenant Bulk Operations

| Operation | Description | Params | Notes |
|-----------|-------------|--------|-------|
| **Send Email** | Send templated email | `email_template_id`, `variables` | Respects opt-out preferences |
| **Send Document** | Attach document to tenant | `document_id`, `delivery_method` | Tracks delivery status |
| **Add Tag** | Categorize tenants | `tags[]` | For filtering/segmentation |
| **Export** | CSV/Excel export | `fields`, `format` | Includes contact + lease info |

---

## State Management

### Frontend State

```typescript
interface BulkSelectState {
  selectedLeaseIds: string[]
  selectedTenantIds: string[]
  bulkActionInProgress: boolean
  bulkActionProgress: {
    total: number
    completed: number
    failed: number
  } | null
}
```

### Validation Rules

1. **Lease Bulk Update Status**: Only valid status transitions allowed
2. **Email Actions**: All records must have valid email addresses
3. **Document Generation**: Tenants must have complete data for templates
4. **Quantity Limits**: Max 100 records per bulk action (UI warning at 50+)

---

## Open Questions

1. **Bulk Operation Limits**: Should bulk operations be limited by quantity (e.g., max 50 at once) to prevent performance issues?
   - **Recommendation**: Hard limit of 100, warning at 50, queue-based processing for >25

2. **Confirmation Requirements**: Which bulk operations should require additional confirmation (e.g., bulk termination)?
   - **High Risk**: Status changes to "terminated", bulk deletions (if allowed)
   - **Medium Risk**: Bulk emails (show preview/count)
   - **Low Risk**: Exports, tag additions

3. **Async Processing**: Should large bulk operations be queued and processed asynchronously?
   - **Recommendation**: Yes, for >25 records or document generation

4. **Partial Success Handling**: How to handle partial failures?
   - Show summary: "45/50 successful, 5 failed"
   - Provide downloadable error report
   - Allow retry of failed items only

5. **Cross-Property Operations**: Should bulk operations span multiple properties?
   - **Recommendation**: Yes, but show clear property grouping in confirmation modal

---

## Success Metrics

- **Time Savings**: Measure time to complete end-of-month renewal reminders (before vs. after)
- **Error Reduction**: Track incorrect status updates or missed communications
- **Adoption Rate**: % of lease/tenant operations done via bulk actions
- **User Satisfaction**: Survey property managers on ease of bulk workflows

**Targets:**
- 70% reduction in time for common bulk workflows (renewal reminders, status updates)
- 90% of bulk actions complete successfully
- 50%+ of eligible operations use bulk actions within 3 months

---

## Dependencies

- **Feature 02 (Multi-Select Applications)**: Shared multi-select UI components
- **Email System** (202601-next-batch Feature #1): Required for email bulk actions
- **Document System**: Required for document generation and sending
- **Audit System**: Must log all bulk actions with full details

---

## Implementation Notes

### Phase 1: Lease Multi-Select
1. Add checkbox component to lease list
2. Implement selection state management
3. Create bulk action toolbar for leases
4. Add confirmation modals

### Phase 2: Lease Bulk Operations
1. Implement backend lease bulk endpoint
2. Add email bulk action (requires Feature #1)
3. Add status update bulk action
4. Add export bulk action
5. Implement audit logging

### Phase 3: Tenant Multi-Select
1. Add checkbox component to tenant list
2. Implement tenant selection state
3. Create bulk action toolbar for tenants

### Phase 4: Tenant Bulk Operations
1. Implement backend tenant bulk endpoint
2. Add email and document bulk actions
3. Add tag bulk action
4. Add export bulk action

### Phase 5: Async Processing & Polish
1. Implement queue-based processing for large batches
2. Add progress indicators for async operations
3. Add error reporting and retry functionality
4. Implement keyboard shortcuts

---

## Security Considerations

- **Authorization**: Verify user has permission for bulk actions on all selected records
- **Rate Limiting**: Prevent abuse of bulk operations (esp. email)
- **Data Privacy**: Ensure exports respect tenant privacy settings
- **Audit Trail**: Log all bulk actions with complete details
- **Email Opt-Out**: Respect tenant communication preferences for bulk emails

---

## Related Features

- [02 - Multi-Select Operations for Applications](./02-multiselect-applications.md): Shared UI patterns
- 202601-next-batch Feature #1 (Email Handling): Required for bulk email
- 202601-next-batch Feature #2 (N1, N4, N11 Notices): May integrate with bulk document sending
