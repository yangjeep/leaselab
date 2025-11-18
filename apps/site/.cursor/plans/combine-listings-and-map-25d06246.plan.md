<!-- 25d06246-a225-482b-a207-24bb4634c07c e86fd8b2-057f-4907-9fa3-7dce2eb73911 -->
# Combine Residential Listings and Map View

## Changes Required

### 1. Update HomeTabs Component

**File:** `components/HomeTabs.tsx`

Modify the "Residential Listings" tab to include the map alongside the listings:

- Keep filters at the top (full width)
- Create a two-column layout below filters:
  - Left column (60% width): GoogleMap component
  - Right column (40% width): Listing cards grid
- Make responsive: side-by-side on desktop (`lg:flex`), stacked on mobile (map above listings)
- Remove the separate "Map" tab entirely

### 2. Adjust Listing Cards for Smaller Space

**File:** `components/ListingCard.tsx`

Since listings will now be in a narrower 40% column, adjust the card layout:

- Change grid from `sm:grid-cols-2 lg:grid-cols-3` to single column `grid-cols-1`
- Consider making images smaller/thumbnail-sized if needed for better fit

### 3. Map Height Adjustment

The map height may need adjustment to work well in the side-by-side layout. Currently set to `600px`, which should work but can be tweaked based on visual preference.

## Layout Structure

```
┌─────────────────────────────────────────┐
│           Filters (full width)          │
├─────────────────────┬───────────────────┤
│                     │                   │
│   Map (60%)        │   Listings (40%)  │
│   600px height     │   Scrollable      │
│                     │   Single column   │
│                     │   cards           │
└─────────────────────┴───────────────────┘
```

On mobile: stacks vertically (map on top, listings below)

### To-dos

- [x] Modify HomeTabs.tsx to combine Residential Listings and Map tabs into one unified view with proper layout
- [x] Update the listing cards grid to single column layout for the narrower 40% space
- [x] Verify the layout works correctly on desktop and mobile viewports