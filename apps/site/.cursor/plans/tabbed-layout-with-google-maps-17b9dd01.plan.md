<!-- 17b9dd01-7096-4ebc-900e-6ed6656d326a db96d494-9522-43f9-8e5a-19549fb5323b -->
# Tabbed Layout with Google Maps Implementation

## Overview

Add a tabbed interface to both the home page (`app/page.tsx`) and property detail pages (`app/properties/[slug]/page.tsx`) with five tabs: Overview, Map, Details, Contact, and About. The Map tab will use Google Maps JavaScript API to display property locations.

## Implementation Steps

### 1. Create Reusable TabbedLayout Component

- **File**: `components/TabbedLayout.tsx`
- Create a client component that manages tab state and renders tab buttons with content panels
- Use Tailwind CSS for styling consistent with the existing design
- Support multiple tabs with active state management

### 2. Create GoogleMap Component

- **File**: `components/GoogleMap.tsx`
- Client component that loads Google Maps JavaScript API
- Accept props: `listings` (array for multiple markers) or `listing` (single marker)
- Use geocoding to convert addresses to coordinates
- Display markers with info windows showing property details
- Handle loading states and API key configuration

### 3. Create About Section Component

- **File**: `components/AboutSection.tsx`
- Static content component for the About tab
- Can be a simple component with company/property management information

### 4. Update Home Page with Tabs

- **File**: `app/page.tsx`
- Wrap existing content in TabbedLayout component
- **Overview tab**: Current listing grid with filters
- **Map tab**: GoogleMap component showing all filtered properties
- **Details tab**: Summary statistics or additional property information
- **Contact tab**: Contact form or contact information
- **About tab**: AboutSection component

### 5. Update Property Detail Page with Tabs

- **File**: `app/properties/[slug]/page.tsx`
- Restructure existing content into TabbedLayout
- **Overview tab**: Current property information (title, gallery, description)
- **Map tab**: GoogleMap component showing single property location
- **Details tab**: Property details grid (status, parking, pets, utilities, address)
- **Contact tab**: Existing ContactForm component
- **About tab**: AboutSection component

### 6. Add Environment Variable

- **File**: `env.example`
- Add `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` for Google Maps JavaScript API

### 7. Install Google Maps Types (Optional)

- Add `@types/google.maps` to devDependencies if needed for TypeScript support

## Technical Details

- **Google Maps API**: Use `@react-google-maps/api` package or load the script directly
- **Geocoding**: Use Google Maps Geocoding API or client-side geocoding service
- **Map Display**: Show markers for each property with address-based positioning
- **Responsive Design**: Ensure tabs and map are mobile-friendly
- **Error Handling**: Handle cases where API key is missing or geocoding fails

## Files to Modify/Create

1. `components/TabbedLayout.tsx` (new)
2. `components/GoogleMap.tsx` (new)
3. `components/AboutSection.tsx` (new)
4. `app/page.tsx` (modify)
5. `app/properties/[slug]/page.tsx` (modify)
6. `env.example` (modify)
7. `package.json` (modify - add @react-google-maps/api if using library)

### To-dos

- [ ] Create TabbedLayout component with tab navigation and content panels
- [ ] Create GoogleMap component using Google Maps JavaScript API with geocoding support
- [ ] Create AboutSection component for About tab content
- [ ] Refactor home page to use TabbedLayout with Overview, Map, Details, Contact, and About tabs
- [ ] Refactor property detail page to use TabbedLayout with Overview, Map, Details, Contact, and About tabs
- [ ] Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to env.example
- [ ] Add @react-google-maps/api package dependency if using library approach