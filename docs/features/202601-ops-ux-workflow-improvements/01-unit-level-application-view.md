# Feature 01: Unit-Level Application View (Default)

**Status**: Draft
**Feature ID**: 202601-UX-01
**Last Updated**: 2025-12-23

---

## Problem Statement

Currently applications may be organized at the property level, which creates extra navigation steps when properties have multiple units. Most operational decisions happen at the unit level—property managers need to know which specific unit an applicant is interested in, which units are available, and which units have pending applications.

Organizing by property level adds unnecessary clicks and cognitive load when the real decision-making happens at the unit level.

---

## User Stories

### Story 1: Default Unit-Level Organization

**As a property manager**, I want to see applications organized by unit by default, so that I can quickly identify which specific unit each applicant is interested in without additional clicks.

**Acceptance Criteria:**
- When I navigate to `/applications`, the default view groups or filters applications by unit
- Each application card/row clearly displays which unit it's for
- I can immediately see which units have pending applications

### Story 2: View Toggle Capability

**As an ops admin**, I want the ability to toggle between unit-level and property-level views, so that I can choose the grouping that makes sense for my current task (e.g., property-level when reviewing overall demand).

**Acceptance Criteria:**
- A toggle control allows switching between "By Unit" and "By Property" views
- The selected view preference persists during my session (localStorage or session state)
- The toggle is clearly labeled and easy to find

### Story 3: Prominent Unit Display

**As a property manager reviewing applications**, I want each application card/row to prominently display the unit identifier (e.g., "Unit 2B"), so that I can immediately understand which unit is being applied for.

**Acceptance Criteria:**
- Unit identifier appears prominently in list view (e.g., in the header or as a visual tag)
- Unit identifier is visible in both list and detail views
- For multi-unit properties, the unit is the most prominent grouping/sorting factor

---

## Acceptance Criteria (Feature-Level)

1. **Default View**: The `/applications` route defaults to grouping/filtering by unit
2. **Unit Prominence**: Unit information is displayed prominently in both list and detail views
3. **View Toggle**: A toggle between unit-level and property-level views exists and persists user preference
4. **Filtering/Sorting**: Filtering and sorting work correctly in both unit and property views
5. **Performance**: View switching happens without full page reload

---

## Technical Considerations

### Data Model

No schema changes required. Applications already have a `unit_id` or similar field.

### UI/UX Design

```
┌─────────────────────────────────────────────┐
│ Applications                    [⚙ Settings]│
│ ┌──────────────────┐                        │
│ │ View: ◉ By Unit  ○ By Property           │
│ └──────────────────┘                        │
│                                             │
│ Property: Maple Towers                      │
│                                             │
│ ┌─────────────────────────────────────────┐│
│ │ Unit 2B  ● 3 Applications               ││
│ │ ├─ John Doe      [Shortlist] [View]     ││
│ │ ├─ Jane Smith    [Under Review] [View]  ││
│ │ └─ Bob Wilson    [Rejected] [View]      ││
│ └─────────────────────────────────────────┘│
│                                             │
│ ┌─────────────────────────────────────────┐│
│ │ Unit 3A  ● 1 Application                ││
│ │ └─ Alice Chen    [New] [View]           ││
│ └─────────────────────────────────────────┘│
└─────────────────────────────────────────────┘
```

### API Changes

**Existing Endpoint Enhancement:**
```
GET /api/ops/applications?group_by=unit&property_id=123
```

**Response Format (Grouped by Unit):**
```json
{
  "property": {
    "id": 123,
    "name": "Maple Towers"
  },
  "units": [
    {
      "id": 456,
      "identifier": "2B",
      "applications": [
        {
          "id": 789,
          "applicant_name": "John Doe",
          "status": "shortlist",
          "created_at": "2025-12-01T10:00:00Z"
        }
      ]
    }
  ]
}
```

### State Management

- View preference stored in localStorage: `apps_view_mode: 'unit' | 'property'`
- Default to 'unit' if no preference exists

---

## Open Questions

1. **Routing Strategy**: Should "unit view" be:
   - A nested route (`/properties/:id/units/:unitId/applications`)?
   - A query parameter (`/applications?view=unit&property_id=:id`)?
   - A filter/grouping option on the main applications page?

   **Recommendation**: Start with query parameter approach for flexibility

2. **Single-Family Homes**: How to handle properties with no explicit units (e.g., single-family homes)?
   - Option A: Treat the property itself as "Unit 1" or "Main Unit"
   - Option B: Automatically show property view for single-unit properties
   - Option C: Use property name as unit identifier

   **Recommendation**: Option B (auto-switch to property view for single-unit properties)

3. **Mobile View**: On mobile, should we show a different layout (e.g., tabs per unit instead of expandable sections)?

---

## Success Metrics

- **Reduced Clicks**: Measure average clicks to reach an application detail from dashboard
- **Time to Action**: Track time from applications page load to taking an action (approve, reject, etc.)
- **User Feedback**: Survey property managers on ease of application review

**Target**: 30% reduction in clicks to reach application details for multi-unit properties

---

## Dependencies

- None (standalone feature)

---

## Implementation Notes

### Phase 1: Backend
1. Enhance applications query to support `group_by=unit` parameter
2. Ensure response includes unit information with each application

### Phase 2: Frontend
1. Add view toggle component
2. Implement localStorage persistence for view preference
3. Update application list component to support grouped rendering
4. Add unit-level filtering

### Phase 3: Polish
1. Add loading states for view switching
2. Implement responsive design for mobile
3. Add accessibility labels and keyboard navigation

---

## Related Features

- [02 - Multi-Select Operations for Applications](./02-multiselect-applications.md): Multi-select should respect unit grouping
- Property/Unit Management: Ensures units are properly defined and associated
