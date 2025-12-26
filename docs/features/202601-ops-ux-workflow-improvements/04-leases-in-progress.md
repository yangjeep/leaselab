# Feature 04: Separate Views - Existing Leases vs. Leases in Progress

**Status**: Draft
**Feature ID**: 202601-UX-04
**Last Updated**: 2025-12-23

---

## Problem Statement

The current "Lease" section mixes active/historical leases with new leases being created from applications. This creates several problems:

1. **Cluttered Workspace**: Property managers reviewing active leases must navigate around incomplete lease records
2. **Lost Context**: New lease onboarding requires a different mindset and workflow than ongoing lease management
3. **Missed Steps**: Without a clear checklist or progress indicator, it's easy to miss critical steps in lease creation (documents, signatures, move-in coordination)
4. **Unclear Status**: Hard to quickly identify which leases need action vs. which are fully executed and active

The solution is to create two distinct views optimized for their specific purposes:
- **"Leases"**: Manage active and historical leases
- **"Leases in Progress"**: Track new leases from application approval through to full execution

---

## User Stories

### Story 1: Clear View Separation

**As a property manager**, I want a clear separation between "Leases" (active and historical) and "Leases in Progress" (applications converting to leases), so that I can focus on the right workflow at the right time.

**Acceptance Criteria:**
- Two distinct navigation items or tabs: "Leases" and "Leases in Progress"
- Each view has appropriate filters and actions for its context
- Navigation between views is seamless
- Badge counts show pending items in "Leases in Progress"

### Story 2: Guided Onboarding Workflow

**As an ops admin starting a new lease from an approved application**, I want to land in a "Leases in Progress" view with a guided workflow (checklist, missing docs, signatures), so that I can track onboarding completion clearly.

**Acceptance Criteria:**
- Checklist shows required steps (e.g., "Collect deposit", "Get signatures", "Schedule move-in")
- Visual progress indicator (e.g., "4 of 7 steps complete")
- Ability to request missing documents from tenant
- Ability to send signature requests
- Clear transition to "Leases" when all steps complete

### Story 3: Active Leases Default

**As a property manager managing existing leases**, I want the "Leases" view to default to active leases with easy access to historical/terminated leases, so that my primary workspace isn't cluttered with past records.

**Acceptance Criteria:**
- "Leases" view defaults to showing only active leases
- Filter toggle to show "All", "Active", "Expiring Soon", "Terminated"
- Terminated leases clearly visually distinguished
- Quick access to lease renewal workflow

### Story 4: Progress Tracking

**As an ops admin**, I want "Leases in Progress" to show a progress indicator (e.g., "3 of 7 steps complete") for each pending lease, so that I can prioritize which leases need attention.

**Acceptance Criteria:**
- Each lease in progress shows completion percentage or step count
- Overdue items highlighted (e.g., "Signature request sent 5 days ago")
- Ability to sort by progress status or age
- At-a-glance view of all pending leases and their status

---

## Acceptance Criteria (Feature-Level)

1. **Distinct Routes**: Two routes/tabs: `/leases` (existing, active/historical) and `/leases/in-progress` (new leases)
2. **Guided Workflow**: "Leases in Progress" includes checklist and progress indicator per lease
3. **Document Management**: Ability to request missing documents and send signature requests from "Leases in Progress"
4. **Status Transition**: Clear workflow to move lease from "in progress" to "active" in main "Leases" view
5. **Default Filtering**: "Leases" view defaults to active leases with easy toggle to other statuses
6. **Navigation**: Clear navigation between views with badge counts
7. **Mobile Responsive**: Both views work well on mobile devices

---

## Technical Considerations

### UI/UX Design

**Navigation:**
```
┌─────────────────────────────────────────────────────────────┐
│ 📋 Dashboard  │  🏠 Properties  │  📄 Leases (3)  │  ⚡ Leases in Progress (2)
└─────────────────────────────────────────────────────────────┘
```

**Leases in Progress View:**
```
┌─────────────────────────────────────────────────────────────┐
│ Leases in Progress                    2 pending  │  [+ New] │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Lease #1027 - Alice Chen (Unit 4B)                          │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 57% complete (4/7)  │
│                                                              │
│ ✅ Application approved                                      │
│ ✅ Lease terms defined                                       │
│ ✅ Deposit received                                          │
│ ✅ Lease document generated                                  │
│ ⏳ Signatures pending (sent 2 days ago)        [Resend]     │
│ ⬜ Move-in inspection scheduled                [Schedule]   │
│ ⬜ Keys prepared                                [Mark Done]  │
│                                                              │
│ Expected move-in: Feb 1, 2026                               │
│ [View Details] [Send Reminder] [Mark Complete]              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Lease #1028 - David Park (Unit 2C)                          │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 29% complete (2/7)  │
│ ...                                                          │
└─────────────────────────────────────────────────────────────┘
```

**Active Leases View:**
```
┌─────────────────────────────────────────────────────────────┐
│ Leases                    [Active ▼] [Expiring ▼] [+ New]   │
├─────────────────────────────────────────────────────────────┤
│ Lease #1024 - John Doe (Unit 2B)                  [Active]  │
│ Term: Jan 1, 2024 - Dec 31, 2024  •  $1,500/mo              │
│ Expiring in 8 days                          [Start Renewal] │
├─────────────────────────────────────────────────────────────┤
│ Lease #1025 - Jane Smith (Unit 3A)                [Active]  │
│ Term: Feb 1, 2024 - Jan 31, 2025  •  $1,600/mo              │
│ Renewed: No action needed                                   │
└─────────────────────────────────────────────────────────────┘
```

### Data Model

**New Status for Lease In Progress:**
```sql
-- Add new status to leases table
ALTER TABLE leases ADD COLUMN onboarding_status TEXT;
-- Values: null (for active/terminated leases), 'in_progress', 'completed'

-- Create onboarding checklist table
CREATE TABLE lease_onboarding_checklists (
  id TEXT PRIMARY KEY,
  lease_id TEXT NOT NULL REFERENCES leases(id),
  steps JSON NOT NULL,  -- Array of checklist items
  completed_steps JSON DEFAULT '[]',
  current_step INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Checklist step structure
{
  "id": "deposit_received",
  "label": "Security deposit received",
  "required": true,
  "completed": false,
  "completed_at": null,
  "notes": null
}
```

**Default Checklist Steps:**
1. Application approved ✓ (auto-completed when created from application)
2. Lease terms defined (rent, term, start date)
3. Lease document generated
4. Security deposit received
5. Signatures collected (tenant + guarantor if applicable)
6. Move-in inspection scheduled
7. Keys/access prepared

### API Design

**List Leases in Progress:**
```
GET /api/ops/leases/in-progress
```

**Response:**
```json
{
  "leases": [
    {
      "id": "1027",
      "tenant": {"id": "301", "name": "Alice Chen"},
      "unit": {"id": "4B", "identifier": "4B"},
      "progress": {
        "total_steps": 7,
        "completed_steps": 4,
        "percentage": 57,
        "current_step": "signatures_pending"
      },
      "checklist": [...],
      "expected_move_in": "2026-02-01",
      "created_at": "2025-12-20T10:00:00Z",
      "updated_at": "2025-12-22T15:30:00Z"
    }
  ]
}
```

**Update Checklist:**
```
PATCH /api/ops/leases/:id/checklist
```

**Request:**
```json
{
  "step_id": "deposit_received",
  "completed": true,
  "notes": "Received via e-transfer on 2025-12-22"
}
```

**Complete Lease Onboarding:**
```
POST /api/ops/leases/:id/complete-onboarding
```

**Effect:**
- Sets `onboarding_status` to 'completed'
- Moves lease to active status
- Triggers any post-onboarding workflows (welcome email, etc.)

---

## Checklist Workflow

### Standard Lease Onboarding Checklist

| Step | Description | Auto-Complete? | Required | Typical Owner |
|------|-------------|----------------|----------|---------------|
| 1. Application Approved | Application status = shortlist/approved | Yes | Yes | System |
| 2. Lease Terms Defined | Rent, term, dates set | No | Yes | Ops Admin |
| 3. Lease Document Generated | PDF created from template | No | Yes | Ops Admin |
| 4. Deposit Received | Security deposit payment | No | Yes | Ops Admin |
| 5. Signatures Collected | Tenant + guarantor signed | No | Yes | Tenant + Ops |
| 6. Move-in Inspection | Walk-through scheduled | No | Yes | Property Mgr |
| 7. Keys Prepared | Access ready | No | Yes | Property Mgr |

### Optional Steps (Configurable)

- Credit check completed
- References verified
- Insurance policy received
- Utility setup confirmed
- Parking/storage assigned

---

## State Management

### Frontend State

```typescript
interface LeaseInProgress {
  id: string
  tenant: TenantSummary
  unit: UnitSummary
  progress: {
    total_steps: number
    completed_steps: number
    percentage: number
    current_step: string
  }
  checklist: ChecklistItem[]
  expected_move_in: string
  created_at: string
  updated_at: string
}

interface ChecklistItem {
  id: string
  label: string
  required: boolean
  completed: boolean
  completed_at: string | null
  completed_by: string | null
  notes: string | null
  action_url?: string  // For items that require actions
}
```

---

## Open Questions

1. **Transition Point**: At what point does a "Lease in Progress" become an active "Lease"?
   - **Option A**: When all required checklist items are complete
   - **Option B**: When signatures are collected (even if move-in is future)
   - **Option C**: On the lease start date
   - **Option D**: Manual promotion by ops admin

   **Recommendation**: Option A (all required steps) + automatic promotion on lease start date

2. **AI Lease Execution Integration**: Should "Leases in Progress" integrate with the AI lease execution workflow (Feature #8)?
   - **Yes**: AI can help complete checklist items, send reminders, request documents
   - **Recommendation**: Design with integration points but implement manually first

3. **Customizable Checklists**: Should property managers be able to customize the checklist per property or lease type?
   - **Phase 1**: Use standard checklist
   - **Phase 2**: Allow per-site customization
   - **Phase 3**: Allow per-property or per-lease-type customization

4. **Lease Amendments**: How to handle amendments to existing leases?
   - Create separate "Amendments in Progress" or reuse checklist system?
   - **Recommendation**: Separate workflow for amendments (future feature)

---

## Success Metrics

- **Onboarding Time**: Measure average days from application approval to lease activation
- **Completion Rate**: % of leases that complete all checklist items
- **Error Reduction**: Fewer missed signatures, deposits, or documents
- **User Satisfaction**: Survey ops admins on clarity of lease onboarding process

**Targets:**
- 30% reduction in average onboarding time
- 95% checklist completion rate
- <5% of leases missing critical documents at move-in
- 4.5/5 user satisfaction score

---

## Dependencies

- **Feature 02 (Multi-Select Applications)**: "Proceed to Lease" action creates lease in progress
- **Email System** (202601-next-batch Feature #1): For signature requests and reminders
- **Document System**: For lease document generation and storage
- **AI Lease Execution** (202601-next-batch Feature #8): Optional integration for guided workflow

---

## Implementation Notes

### Phase 1: Data Model & Basic Views
1. Add `onboarding_status` to leases table
2. Create `lease_onboarding_checklists` table
3. Create `/leases/in-progress` route
4. Implement basic list view for leases in progress

### Phase 2: Checklist Workflow
1. Implement checklist UI component
2. Create checklist update API
3. Add progress indicators
4. Implement step completion tracking

### Phase 3: Actions & Integrations
1. Add "Request Document" action
2. Add "Send Signature Request" action
3. Integrate with email system
4. Add move-in scheduling

### Phase 4: Transition Logic
1. Implement lease completion workflow
2. Add automatic transition on lease start date
3. Add manual promotion option
4. Implement post-onboarding triggers

### Phase 5: Polish
1. Add mobile-optimized views
2. Implement keyboard shortcuts
3. Add bulk actions for leases in progress
4. Add customizable checklist templates

---

## Security Considerations

- **Access Control**: Ensure only authorized users can access lease in progress details
- **Audit Trail**: Log all checklist updates and status changes
- **Data Privacy**: Protect sensitive tenant information in lease records
- **Document Security**: Ensure lease documents are securely stored and accessed

---

## Related Features

- [02 - Multi-Select Operations for Applications](./02-multiselect-applications.md): "Proceed to Lease" creates lease in progress
- [03 - Multi-Select for Lease and Tenant Views](./03-multiselect-lease-tenant.md): May apply to leases in progress
- 202601-next-batch Feature #1 (Email Handling): Signature requests and reminders
- 202601-next-batch Feature #8 (AI Lease Execution): Potential integration for guided workflow
