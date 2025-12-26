# Feature 05: Work Orders - Default View "Open & In-Progress"

**Status**: Draft
**Feature ID**: 202601-UX-05
**Last Updated**: 2025-12-23

---

## Problem Statement

The current work order list may default to showing all work orders (including completed/closed), which makes it harder to focus on actionable items. Property managers need to quickly identify and address work orders that require attention, but completed/historical records create noise in the view.

When ops users navigate to the work orders page, their primary intent is to:
1. See what needs immediate attention (emergency/urgent)
2. Track ongoing work (in-progress)
3. Review open items that haven't been started yet

Historical completed work orders are important for auditing and reference, but should not be the default focus.

---

## User Stories

### Story 1: Default to Actionable Work Orders

**As a property manager**, I want the work orders page to default to showing only "Open" and "In-Progress" work orders, so that I immediately see what requires my attention.

**Acceptance Criteria:**
- `/work-orders` route defaults to showing only work orders with status "open" or "in_progress"
- Completed, cancelled, and closed work orders are hidden by default
- Page loads quickly even with many historical work orders
- Default filter is clearly indicated in the UI

### Story 2: Quick Filter Access

**As an ops admin**, I want quick access to filter toggles for "All", "Open & In-Progress", "Completed", and "Cancelled", so that I can switch contexts when needed (e.g., reviewing history).

**Acceptance Criteria:**
- Filter controls are prominently displayed (top of page)
- One-click switching between filter presets
- Selected filter persists during session
- URL updates to reflect current filter (for bookmarking)

### Story 3: Visual Status Distinction

**As a property manager**, I want the work order list to visually distinguish between "Open" (not started) and "In-Progress" (actively being worked on), so that I can prioritize follow-ups appropriately.

**Acceptance Criteria:**
- "Open" work orders have distinct visual indicator (e.g., red dot, "New" badge)
- "In-Progress" work orders have different indicator (e.g., blue dot, spinner icon)
- Color coding is accessible (not relying on color alone)
- Status is clearly readable in list view

### Story 4: Badge Count in Navigation

**As a property manager**, I want to see a count/badge of "Open & In-Progress" work orders in the navigation, so that I'm aware of pending workload at a glance.

**Acceptance Criteria:**
- Navigation item shows badge with count of open + in-progress work orders
- Badge updates in real-time when work orders are created or status changes
- Badge is visually distinct but not distracting
- Clicking badge navigates to work orders page with default filter

---

## Acceptance Criteria (Feature-Level)

1. **Default Filter**: `/work-orders` route defaults to showing only `status IN ('open', 'in_progress')`
2. **Filter Controls**: Quick access filters for "All", "Open & In-Progress", "Completed", "Cancelled"
3. **Persistence**: Selected filter persists in session (localStorage)
4. **Visual Distinction**: Clear visual difference between "Open" and "In-Progress" status
5. **Navigation Badge**: Badge shows count of open + in-progress work orders
6. **Performance**: Default view performs well even with thousands of historical work orders
7. **Accessibility**: Status indicators are accessible (color + icon/text)

---

## Technical Considerations

### UI/UX Design

**Work Orders List with Default Filter:**
```
┌─────────────────────────────────────────────────────────────┐
│ Work Orders (8)                           ⚙ [+ Create]      │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [●Open & In-Progress] [ All ] [ Completed ] [Cancelled] │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ 🔴 #WO-1234 - Water leak in Unit 2B         [OPEN/URGENT]  │
│    Reported: 2 hours ago  •  Tenant: John Doe               │
│    Description: Leak under kitchen sink                     │
│    [Assign] [Start Work] [View Details]                     │
│                                                              │
│ 🔵 #WO-1230 - HVAC not working (Unit 3A)   [IN-PROGRESS]   │
│    Assigned to: Mike's HVAC  •  Started: Yesterday          │
│    Tenant: Jane Smith  •  ETA: Tomorrow                     │
│    [Update Status] [Add Note] [View Details]                │
│                                                              │
│ 🟡 #WO-1228 - Broken door lock (Unit 1C)   [OPEN]          │
│    Reported: 3 days ago  •  Tenant: Bob Wilson              │
│    Description: Front door lock jammed                      │
│    [Assign] [Start Work] [View Details]                     │
│                                                              │
│ ... 5 more work orders                                      │
└─────────────────────────────────────────────────────────────┘
```

**Navigation with Badge:**
```
┌─────────────────────────────────────────────────────────────┐
│ 📋 Dashboard  │  🏠 Properties  │  🔧 Work Orders ⓴  │  ...  │
└─────────────────────────────────────────────────────────────┘
```

**Status Indicator Legend:**
- 🔴 Red circle + "URGENT" or "EMERGENCY" label (priority handling)
- 🟡 Yellow circle + "OPEN" label (not started)
- 🔵 Blue circle + "IN-PROGRESS" label (being worked on)
- 🟢 Green circle + "COMPLETED" label (finished, when viewing all)
- ⚫ Gray circle + "CANCELLED" label (when viewing all)

### Data Model

No schema changes required. Work orders already have a `status` field.

**Expected Status Values:**
- `open` - Reported but not yet started
- `in_progress` - Currently being worked on
- `completed` - Work finished
- `cancelled` - Cancelled without completion
- `on_hold` - Temporarily paused (optional)

### API Design

**List Work Orders (with default filter):**
```
GET /api/ops/work-orders?status=open,in_progress
```

**Query Parameters:**
```
?status=open,in_progress  // Default
?status=all               // All work orders
?status=completed         // Only completed
?status=cancelled         // Only cancelled
?priority=urgent,high     // Filter by priority
?property_id=123          // Filter by property
?sort=created_at:desc     // Sort options
```

**Response:**
```json
{
  "work_orders": [
    {
      "id": "WO-1234",
      "status": "open",
      "priority": "urgent",
      "title": "Water leak in Unit 2B",
      "description": "Leak under kitchen sink",
      "unit": {"id": "2B", "identifier": "2B"},
      "tenant": {"id": "301", "name": "John Doe"},
      "created_at": "2025-12-23T14:00:00Z",
      "assigned_to": null,
      "estimated_completion": null
    }
  ],
  "total_count": 8,
  "filter_counts": {
    "open": 5,
    "in_progress": 3,
    "completed": 127,
    "cancelled": 12
  }
}
```

**Badge Count Endpoint:**
```
GET /api/ops/work-orders/counts
```

**Response:**
```json
{
  "open": 5,
  "in_progress": 3,
  "urgent": 1,
  "overdue": 2
}
```

---

## Filter Presets

### Default: "Open & In-Progress"
- **Query**: `status IN ('open', 'in_progress')`
- **Purpose**: Focus on actionable work orders
- **Sort**: Priority desc, then created_at desc

### "All"
- **Query**: No status filter
- **Purpose**: See complete history
- **Sort**: created_at desc

### "Completed"
- **Query**: `status = 'completed'`
- **Purpose**: Review finished work, auditing
- **Sort**: completed_at desc

### "Cancelled"
- **Query**: `status = 'cancelled'`
- **Purpose**: Review cancelled requests
- **Sort**: updated_at desc

### Advanced Filters (Optional)
- **Urgent/Emergency**: `priority IN ('urgent', 'emergency')`
- **Overdue**: `estimated_completion < NOW() AND status IN ('open', 'in_progress')`
- **Unassigned**: `assigned_to IS NULL AND status = 'open'`

---

## State Management

### Frontend State

```typescript
interface WorkOrderFilterState {
  status: 'open_in_progress' | 'all' | 'completed' | 'cancelled'
  priority?: 'urgent' | 'high' | 'medium' | 'low'
  property_id?: string
  sort: 'created_at:desc' | 'priority:desc' | 'updated_at:desc'
}

// Persist in localStorage
const STORAGE_KEY = 'work_orders_filter_preference'
```

### URL State

Reflect filters in URL for bookmarking:
- `/work-orders` → Default (open & in-progress)
- `/work-orders?status=all` → All work orders
- `/work-orders?status=completed` → Completed only
- `/work-orders?priority=urgent&status=open` → Urgent open work orders

---

## Performance Considerations

### Database Indexing

Ensure proper indexes for common queries:
```sql
-- Index for default filter
CREATE INDEX idx_work_orders_status_created ON work_orders(status, created_at DESC);

-- Index for priority filtering
CREATE INDEX idx_work_orders_priority_status ON work_orders(priority, status);

-- Index for property filtering
CREATE INDEX idx_work_orders_property_status ON work_orders(property_id, status);
```

### Query Optimization

- Use `LIMIT` and pagination for large result sets
- Cache badge counts (update on work order status change)
- Consider materialized view for filter counts

---

## Open Questions

1. **Urgent/Emergency Surfacing**: Should "Urgent" or "Emergency" work orders be surfaced separately or just within the "Open & In-Progress" view with visual priority indicators?
   - **Recommendation**: Visual priority indicators within default view + optional "Urgent" filter

2. **Overdue Tracking**: Should there be a separate "Overdue" filter/view for work orders past their expected completion date?
   - **Recommendation**: Yes, add "Overdue" as a quick filter option

3. **Auto-Refresh**: Should the work order list auto-refresh to show new urgent work orders?
   - **Recommendation**: Yes, refresh badge counts every 30 seconds, show toast notification for new urgent items

4. **Mobile View**: How to optimize the work order list for mobile devices?
   - Use card-based layout instead of table
   - Larger touch targets for actions
   - Swipe gestures for quick actions

5. **Default Sort**: Should default sort be by priority + created_at, or just created_at?
   - **Recommendation**: Priority desc (urgent first), then created_at desc

---

## Success Metrics

- **Time to Action**: Measure time from work order creation to first action (assignment/start work)
- **View Efficiency**: Track how often users switch from default filter vs. stay on default
- **Missed Urgent Items**: Monitor if urgent work orders are addressed faster with new default
- **User Satisfaction**: Survey property managers on ease of work order management

**Targets:**
- 40% reduction in time to first action on urgent work orders
- 80% of work order sessions stay on default "Open & In-Progress" filter
- <1% of urgent work orders go unaddressed for >4 hours
- 4.5/5 user satisfaction score

---

## Dependencies

- **Work Order System**: Existing work order management
- **Real-time Updates** (optional): For badge count auto-refresh and notifications
- **Smart Maintenance Triage** (202601-next-batch Feature #10): May influence priority classification

---

## Implementation Notes

### Phase 1: Default Filter & Basic UI
1. Update work orders route to default to `status IN ('open', 'in_progress')`
2. Add filter preset buttons (Open & In-Progress, All, Completed, Cancelled)
3. Persist filter preference in localStorage
4. Update URL to reflect current filter

### Phase 2: Visual Indicators
1. Add status-based color coding and icons
2. Implement priority badges (Urgent, High, etc.)
3. Add visual distinction between Open and In-Progress
4. Ensure accessibility (color + text/icon)

### Phase 3: Navigation Badge
1. Create badge count endpoint
2. Add badge to navigation menu
3. Implement badge auto-refresh (polling or WebSocket)
4. Add toast notifications for new urgent items

### Phase 4: Advanced Filters
1. Add "Overdue" filter
2. Add "Unassigned" filter
3. Add property/unit filtering
4. Implement saved filter preferences

### Phase 5: Performance & Polish
1. Optimize database queries with proper indexing
2. Implement pagination for large result sets
3. Add mobile-optimized layout
4. Add keyboard shortcuts for filter switching

---

## Security Considerations

- **Access Control**: Ensure users only see work orders for properties they have access to
- **Real-time Updates**: Properly scope badge counts to user permissions
- **Rate Limiting**: Prevent abuse of auto-refresh endpoints
- **Audit Trail**: Log filter usage for analytics (anonymous)

---

## Accessibility Considerations

- **Color Independence**: Don't rely solely on color for status (use icons + text)
- **Screen Readers**: Proper ARIA labels for filter buttons and status indicators
- **Keyboard Navigation**: Full keyboard support for filter switching
- **Focus Management**: Maintain focus when switching filters

---

## Related Features

- [03 - Multi-Select for Lease and Tenant Views](./03-multiselect-lease-tenant.md): Similar filtering patterns
- 202601-next-batch Feature #4 (Work Order Media): Photo/video attachments in work order details
- 202601-next-batch Feature #10 (Smart Maintenance Triage): Influences priority classification
- 202601-next-batch Feature #11 (Property Health Monitoring): May surface preventive work orders
