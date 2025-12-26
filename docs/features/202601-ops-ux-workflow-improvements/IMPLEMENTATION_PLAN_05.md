# Feature 05 Implementation Plan: Work Orders - Default View "Open & In-Progress"

**Feature ID**: 202601-UX-05
**Status**: In Progress
**Start Date**: 2025-12-26
**Target Completion**: TBD

---

## Overview

Implement default filtering for work orders to show only "Open" and "In-Progress" items by default, with visual status indicators and navigation badge counts. This improves focus on actionable work orders while maintaining easy access to historical records.

---

## Technical Approach

### No Database Changes Required
- Work orders already have `status` field
- Existing indexes should be sufficient for initial implementation
- Optional: Add composite indexes for performance optimization later

### Key Components
- Default filter logic in work orders route loader
- Filter preset buttons UI
- Status indicator components with color coding
- Navigation badge with count endpoint
- Filter state persistence (URL + localStorage)

---

## Implementation Phases

### Phase 1: Default Filter & Route Updates (1-2 hours)
**Goal**: Update work orders route to default to "Open & In-Progress" filter

**Tasks**:
1. Update work orders route loader
   - Default to `status IN ('open', 'in_progress')`
   - Support query parameter `?status=` for filter override
   - Parse and validate status filter from URL
2. Add filter state to URL
   - Sync URL with current filter
   - Support bookmarking filtered views
3. Return filter counts in loader data
   - Count open work orders
   - Count in-progress work orders
   - Count completed, cancelled for filter buttons
4. Test default behavior

**Files to Modify**:
- `apps/ops/app/routes/admin.work-orders._index.tsx` (or similar)

**Loader Logic**:
```typescript
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const statusFilter = url.searchParams.get('status') || 'open_in_progress';

  // Map filter presets to actual statuses
  const statusMap = {
    'open_in_progress': ['open', 'in_progress'],
    'all': null, // No filter
    'completed': ['completed'],
    'cancelled': ['cancelled'],
  };

  const statuses = statusMap[statusFilter] || statusMap['open_in_progress'];

  // Fetch work orders with filter
  const workOrders = await fetchWorkOrders(env, siteId, { statuses });
  const counts = await fetchWorkOrderCounts(env, siteId);

  return json({ workOrders, counts, currentFilter: statusFilter });
}
```

**Acceptance Criteria**:
- `/admin/work-orders` shows only open + in-progress work orders
- URL updates when filter changes
- Filter persists across page refreshes
- Back button works correctly with filters

---

### Phase 2: Filter Preset Buttons & UI (2-3 hours)
**Goal**: Add filter preset buttons and visual status indicators

**Tasks**:
1. Create filter preset buttons
   - "Open & In-Progress" (default, active state)
   - "All"
   - "Completed"
   - "Cancelled"
2. Add badge counts to filter buttons
   - Show count next to each filter option
   - Highlight active filter
3. Create status indicator component
   - Color-coded status badges
   - Priority indicators (urgent, high)
   - Icons for each status
4. Update work order list styling
   - Different visual treatment for open vs in-progress
   - Priority highlighting (red for urgent)
5. Add empty state for no work orders

**Files to Create/Modify**:
- `apps/ops/app/components/work-order/WorkOrderStatusBadge.tsx` (new)
- `apps/ops/app/components/work-order/WorkOrderFilterBar.tsx` (new)
- `apps/ops/app/components/work-order/index.ts` (new/update)
- `apps/ops/app/routes/admin.work-orders._index.tsx` (update)

**Status Badge Component**:
```typescript
interface StatusBadgeProps {
  status: 'open' | 'in_progress' | 'completed' | 'cancelled'
  priority?: 'urgent' | 'high' | 'medium' | 'low'
}

export function WorkOrderStatusBadge({ status, priority }: StatusBadgeProps) {
  // Color scheme:
  // - open + urgent: red
  // - open: yellow
  // - in_progress: blue
  // - completed: green
  // - cancelled: gray
}
```

**Filter Bar Component**:
```typescript
interface FilterBarProps {
  currentFilter: string
  counts: {
    open: number
    in_progress: number
    completed: number
    cancelled: number
  }
  onFilterChange: (filter: string) => void
}

export function WorkOrderFilterBar({ currentFilter, counts, onFilterChange }: FilterBarProps) {
  const filters = [
    {
      id: 'open_in_progress',
      label: 'Open & In-Progress',
      count: counts.open + counts.in_progress
    },
    { id: 'all', label: 'All', count: null },
    { id: 'completed', label: 'Completed', count: counts.completed },
    { id: 'cancelled', label: 'Cancelled', count: counts.cancelled },
  ];

  // Render filter buttons with active state and counts
}
```

**Acceptance Criteria**:
- Filter buttons prominently displayed at top of page
- Active filter is highlighted
- Badge counts show correct numbers
- Status indicators use color + icon (accessible)
- Urgent work orders are visually distinct
- Clicking filter updates URL and list

---

### Phase 3: Navigation Badge & Count Endpoint (2-3 hours)
**Goal**: Add badge count to navigation and create count endpoint

**Tasks**:
1. Create work order counts endpoint
   - GET /api/ops/work-orders/counts
   - Return counts by status and priority
   - Optimize query performance
2. Update navigation to show badge
   - Fetch counts in layout loader
   - Display badge with open + in-progress count
   - Hide badge when count is 0
3. Add badge styling
   - Small, unobtrusive but visible
   - Red for urgent items, blue otherwise
4. Handle real-time updates (optional for Phase 3)
   - Poll counts endpoint every 60 seconds
   - Or use revalidator on navigation

**Files to Create/Modify**:
- `apps/worker/routes/ops-work-orders.ts` (create or update)
  - Add `/work-orders/counts` endpoint
- `apps/ops/app/routes/admin.tsx` (update navigation)

**Counts Endpoint**:
```typescript
// GET /api/ops/work-orders/counts
opsWorkOrdersRoutes.get('/work-orders/counts', async (c: Context) => {
  const siteId = c.get('siteId');

  const counts = await getWorkOrderCounts(c.env.DB, siteId);

  return c.json({
    open: counts.open,
    in_progress: counts.in_progress,
    urgent: counts.urgent, // Priority = urgent
    total_actionable: counts.open + counts.in_progress,
  });
});
```

**Navigation Update**:
```typescript
// In admin.tsx loader
const workOrderCounts = await fetch(`${workerUrl}/api/ops/work-orders/counts`, {
  headers: { 'x-site-id': siteId, 'x-user-id': user.id },
});

return json({
  user,
  currentSite,
  availableSites,
  leasesInProgressCount,
  workOrdersActionableCount: counts.total_actionable,
});
```

**Acceptance Criteria**:
- Badge shows count of open + in-progress work orders
- Badge updates when work orders change
- Badge hidden when count is 0
- Badge is red if any urgent work orders exist
- Clicking badge navigates to work orders with default filter

---

### Phase 4: Advanced Filters & Polish (Optional) (2-3 hours)
**Goal**: Add advanced filtering options for power users

**Tasks**:
1. Add "Overdue" filter option
   - Show work orders past estimated completion date
   - Highlight overdue items in list
2. Add "Unassigned" filter
   - Show open work orders without assignment
   - Useful for task distribution
3. Add "Urgent" quick filter
   - Show only urgent/emergency priority
   - Alternative to scanning the list
4. Add property filter dropdown
   - Filter by specific property
   - Combine with status filters
5. Add sort options
   - Sort by priority, created date, updated date
   - Remember sort preference

**Files to Create/Modify**:
- `apps/ops/app/components/work-order/WorkOrderAdvancedFilters.tsx` (new)
- `apps/ops/app/routes/admin.work-orders._index.tsx` (update)

**Advanced Filter Component**:
```typescript
interface AdvancedFiltersProps {
  properties: Property[]
  currentFilters: {
    overdue?: boolean
    unassigned?: boolean
    urgent?: boolean
    propertyId?: string
  }
  onFilterChange: (filters: any) => void
}
```

**Acceptance Criteria**:
- Advanced filters work in combination with status filters
- Overdue calculation is accurate
- Unassigned filter only shows open work orders
- Property filter works correctly
- Filters can be combined (e.g., urgent + unassigned)
- Clear filters button resets to default

---

### Phase 5: Testing & Documentation (2-3 hours)
**Goal**: Comprehensive testing and deployment documentation

**Tasks**:
1. Create unit tests for filter logic
   - Test status filter mapping
   - Test filter combinations
   - Test count calculations
2. Test UI interactions
   - Filter button clicks
   - URL updates
   - Badge count updates
3. Create deployment documentation
   - No database changes to document
   - UI verification steps
   - Browser testing checklist
4. Update feature specification with implementation details

**Test Files**:
- Manual UI testing checklist
- Browser compatibility testing

**Acceptance Criteria**:
- All filter combinations work correctly
- UI is responsive on mobile
- No console errors
- Badge counts are accurate
- Filter state persists correctly
- Documentation complete

---

## State Management

### URL State (Primary)
```
/admin/work-orders                           → Default (open + in-progress)
/admin/work-orders?status=all                → All work orders
/admin/work-orders?status=completed          → Completed only
/admin/work-orders?status=open_in_progress   → Explicit default
```

### LocalStorage (Optional Enhancement)
```typescript
// Save last used filter for convenience
localStorage.setItem('work_orders_last_filter', 'open_in_progress');
```

---

## Visual Design Specifications

### Status Color Scheme
- **Open (Urgent)**: Red circle + "URGENT" label + red border
- **Open (Normal)**: Yellow circle + "OPEN" label
- **In-Progress**: Blue circle + "IN-PROGRESS" label + subtle animation
- **Completed**: Green circle + "COMPLETED" label (when viewing all)
- **Cancelled**: Gray circle + "CANCELLED" label (when viewing all)

### Filter Button Styles
```css
/* Active filter */
.filter-active {
  background: indigo-600
  color: white
  font-weight: 600
}

/* Inactive filter */
.filter-inactive {
  background: gray-100
  color: gray-700
  hover: gray-200
}

/* Badge count */
.filter-badge {
  background: indigo-100 (or red for urgent)
  color: indigo-700
  font-size: xs
  padding: 2px 6px
  border-radius: full
}
```

### Navigation Badge
```css
.nav-badge {
  background: indigo-600 (or red-600 if urgent)
  color: white
  font-size: xs
  padding: 2px 8px
  border-radius: full
  position: absolute
  top: -4px
  right: -8px
}
```

---

## Performance Considerations

### Query Optimization
```sql
-- Current indexes (check if they exist)
CREATE INDEX IF NOT EXISTS idx_work_orders_status
  ON work_orders(status);

CREATE INDEX IF NOT EXISTS idx_work_orders_priority
  ON work_orders(priority);

-- Optional composite index for common query
CREATE INDEX IF NOT EXISTS idx_work_orders_status_created
  ON work_orders(status, created_at DESC);
```

### Caching Strategy
- Cache badge counts for 30 seconds
- Use stale-while-revalidate pattern
- Invalidate cache on work order status change

### Load Performance
- Limit default view to 50 work orders (pagination)
- Lazy load work order details
- Use virtualization for large lists (future)

---

## Accessibility Requirements

1. **Color Independence**
   - Use icons + text labels, not color alone
   - Test with browser color filters

2. **Screen Reader Support**
   - ARIA labels for all filter buttons
   - Announce filter changes
   - Announce badge count changes

3. **Keyboard Navigation**
   - Tab through filter buttons
   - Arrow keys to switch filters
   - Enter to apply filter
   - Escape to clear filters

4. **Focus Management**
   - Maintain focus on filter bar when switching
   - Return focus to list after filter change

---

## Risk Assessment & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Too many urgent items overwhelm badge | Medium | Cap badge at 99, show "99+" |
| Default filter hides important completed items | Low | Clearly label as default, easy access to "All" |
| Performance with thousands of work orders | Medium | Implement pagination, optimize queries |
| Users miss filter is active | Low | Prominent filter bar, clear active state |
| Filter state confusion on back/forward | Low | Proper URL state management |

---

## Estimated Timeline

- **Phase 1**: Default Filter & Route Updates - 1-2 hours
- **Phase 2**: Filter Preset Buttons & UI - 2-3 hours
- **Phase 3**: Navigation Badge & Count Endpoint - 2-3 hours
- **Phase 4**: Advanced Filters & Polish - 2-3 hours (optional)
- **Phase 5**: Testing & Documentation - 2-3 hours

**Total Estimated Time**: 9-16 hours (7-10 hours for core Phases 1-3 + 5)

---

## Success Criteria

- ✅ Default view shows only open + in-progress work orders
- ✅ Filter buttons work correctly with badge counts
- ✅ Status indicators are visually distinct and accessible
- ✅ Navigation badge shows accurate count
- ✅ Badge updates in real-time (or on page load)
- ✅ URL state reflects current filter
- ✅ Filter state persists across refreshes
- ✅ No performance degradation with large datasets
- ✅ Mobile-friendly layout
- ✅ Documentation complete

---

## Open Questions & Decisions

**Q1: Should we implement auto-refresh for badge counts?**
- **Decision**: Phase 1 uses loader refresh only, Phase 3+ can add polling
- **Rationale**: Simpler implementation, most updates happen on user actions

**Q2: What should the default sort order be?**
- **Decision**: Priority desc (urgent first), then created_at desc
- **Rationale**: Most urgent items should be visible first

**Q3: Should "Overdue" be part of core or advanced filters?**
- **Decision**: Phase 4 (advanced), not core functionality
- **Rationale**: Requires estimated completion date field, may not be widely used

**Q4: How to handle "On Hold" status?**
- **Decision**: Treat as "In-Progress" for default filter
- **Rationale**: Still requires attention, shouldn't be hidden

---

## Dependencies

- **Existing Work Orders System**: Must have work order CRUD operations
- **Work Order Status Field**: Must exist in database
- **Work Order Priority Field**: Should exist for visual indicators

---

## Next Steps

1. Begin Phase 1: Update work orders route with default filter
2. Test default filter behavior
3. Proceed to Phase 2: Create filter UI components
4. Add status indicators
5. Proceed to Phase 3: Add navigation badge
6. Test and document

---

**Status**: Ready to begin implementation
**Blockers**: None
**Prerequisites**: Work orders system exists ✓

