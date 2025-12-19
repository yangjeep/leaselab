# PRD: Property & Unit Management

## Overview

Add comprehensive property and unit management functionality to the LeaseLab.io admin dashboard, enabling landlords to create, update, and manage their property portfolio with a hierarchical structure of Properties → Units → Tenants.

## Problem Statement

Currently, the admin dashboard only supports viewing and managing tenant leads. Landlords need the ability to:
- Manage their property portfolio
- Define units within each property
- Track which tenants occupy which units
- Handle both multi-unit buildings and single-family homes

## Goals

1. Enable full CRUD operations for properties and units
2. Establish clear hierarchy: Property → Units → Tenants
3. Support flexible unit configuration (single unit for whole house, multiple for apartments)
4. Improve lead-to-tenant workflow by linking to specific units
5. Display properties/units on public site for prospective tenants
6. Enable image uploads with R2 storage and Cloudflare Image Resizing

## User Stories

### Property Management

1. **As a landlord**, I want to add a new property so I can track it in the system
2. **As a landlord**, I want to edit property details (address, description, photos) to keep information current
3. **As a landlord**, I want to delete a property that I no longer own
4. **As a landlord**, I want to view all my properties in a list with key metrics

### Unit Management

5. **As a landlord**, I want to add units to a property to represent rentable spaces
6. **As a landlord**, I want to configure a property as "whole house" (single unit) for single-family rentals
7. **As a landlord**, I want to set unit-specific details (rent, bedrooms, bathrooms, sqft)
8. **As a landlord**, I want to mark units as available/occupied/maintenance
9. **As a landlord**, I want to assign a tenant to a unit when they sign a lease

### Tenant-Unit Relationship

10. **As a landlord**, I want to see which tenant occupies each unit
11. **As a landlord**, I want to view unit history (past tenants, rent changes)
12. **As a landlord**, I want leads to be associated with specific units they're interested in

### Image Management

13. **As a landlord**, I want to upload photos of my properties directly in the admin
14. **As a landlord**, I want to upload unit-specific photos (interior, layout)
15. **As a landlord**, I want to reorder and delete photos
16. **As a landlord**, I want photos to be automatically optimized for web display

### Public Site (Prospective Tenants)

17. **As a prospective tenant**, I want to browse available properties on the public site
18. **As a prospective tenant**, I want to view property details and photos
19. **As a prospective tenant**, I want to see available units within a property
20. **As a prospective tenant**, I want to apply for a specific unit
21. **As a prospective tenant**, I want images to load quickly on any device

---

## Image Management with R2

### Storage Architecture

All property and unit images are stored in Cloudflare R2 bucket (`leaselab-files`).

**Directory Structure:**
```
leaselab-files/
├── properties/
│   ├── {property_id}/
│   │   ├── cover.jpg
│   │   ├── img_001.jpg
│   │   ├── img_002.jpg
│   │   └── ...
├── units/
│   ├── {unit_id}/
│   │   ├── cover.jpg
│   │   ├── img_001.jpg
│   │   └── ...
```

### Image Upload Flow

1. Landlord selects images in admin UI
2. Frontend requests presigned upload URLs from API
3. Frontend uploads directly to R2 using presigned URLs
4. API records image metadata in database
5. Images immediately available via Cloudflare CDN

### Cloudflare Image Resizing

Use Cloudflare Image Resizing for on-the-fly transformations on the public site.

**URL Format:**
```
https://site.leaselab.io/cdn-cgi/image/{options}/{image_path}
```

**Transformation Options:**
- `width` - Target width in pixels
- `height` - Target height in pixels
- `fit` - cover, contain, scale-down, crop
- `quality` - 1-100 (default 85)
- `format` - auto, webp, avif, json

**Standard Sizes:**
| Use Case | Options | Example |
|----------|---------|---------|
| Thumbnail | `width=300,height=200,fit=cover` | Grid cards |
| Gallery | `width=800,height=600,fit=contain` | Detail page |
| Full | `width=1200,quality=90` | Lightbox |
| Mobile | `width=400,format=webp` | Mobile optimized |

### Image Metadata Schema

```sql
-- Property/Unit images table
CREATE TABLE images (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL, -- 'property' or 'unit'
  entity_id TEXT NOT NULL,
  r2_key TEXT NOT NULL, -- R2 object key
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  width INTEGER,
  height INTEGER,
  sort_order INTEGER DEFAULT 0,
  is_cover INTEGER DEFAULT 0,
  alt_text TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(entity_type, entity_id, r2_key)
);

CREATE INDEX idx_images_entity ON images(entity_type, entity_id);
```

### Image API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/images/presign` | Get presigned upload URL |
| POST | `/api/images` | Register uploaded image |
| GET | `/api/properties/:id/images` | List property images |
| GET | `/api/units/:id/images` | List unit images |
| PUT | `/api/images/:id` | Update image metadata |
| DELETE | `/api/images/:id` | Delete image |
| PUT | `/api/images/reorder` | Reorder images |

---

## Public Site Integration

### Site App Changes

The public site (`apps/site`) displays properties and units from the shared D1 database.

### Public Routes

| Route | Description |
|-------|-------------|
| `/` | Home page with featured/available units |
| `/properties` | Browse all properties |
| `/properties/:slug` | Property detail with units |
| `/units/:id` | Unit detail page |
| `/apply/:unitId` | Application form for unit |

### Data Flow

```
Site App (Read-Only)          Ops App (Read-Write)
─────────────────────         ───────────────────
      │                              │
      ▼                              ▼
┌─────────────┐              ┌─────────────┐
│   D1 DB     │◄────────────►│   D1 DB     │
│  (shared)   │              │  (shared)   │
└─────────────┘              └─────────────┘
      │                              │
      ▼                              ▼
┌─────────────┐              ┌─────────────┐
│     R2      │◄────────────►│     R2      │
│  (images)   │              │  (uploads)  │
└─────────────┘              └─────────────┘
```

### Site Loaders

```typescript
// Home page - featured available units
export async function loader({ context }: LoaderFunctionArgs) {
  const db = context.cloudflare.env.DB;
  const units = await getAvailableUnits(db, { limit: 12, featured: true });
  return json({ units });
}

// Property detail
export async function loader({ params, context }: LoaderFunctionArgs) {
  const db = context.cloudflare.env.DB;
  const property = await getPropertyBySlug(db, params.slug);
  const units = await getUnitsByProperty(db, property.id);
  const images = await getPropertyImages(db, property.id);
  return json({ property, units, images });
}
```

### Image Component with Resizing

```tsx
// components/OptimizedImage.tsx
interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fit?: 'cover' | 'contain' | 'scale-down';
  className?: string;
}

export function OptimizedImage({
  src,
  alt,
  width = 800,
  height,
  fit = 'cover',
  className
}: OptimizedImageProps) {
  const options = [
    `width=${width}`,
    height && `height=${height}`,
    `fit=${fit}`,
    'format=auto',
    'quality=85'
  ].filter(Boolean).join(',');

  const optimizedSrc = `/cdn-cgi/image/${options}/${src}`;

  return (
    <img
      src={optimizedSrc}
      alt={alt}
      className={className}
      loading="lazy"
    />
  );
}
```

### Combined Image Gallery Display

When displaying a unit on the public site, images from both the property and unit are combined into a single gallery for the best user experience.

**Display Order:**
1. Unit cover image (if set)
2. Unit images
3. Property images (exterior, common areas)

**Implementation:**

```typescript
// Get combined images for unit display
export async function getUnitGalleryImages(
  db: D1Database,
  unitId: string,
  propertyId: string
): Promise<Image[]> {
  // Get unit images
  const unitImages = await db
    .prepare(`
      SELECT * FROM images
      WHERE entity_type = 'unit' AND entity_id = ?
      ORDER BY is_cover DESC, sort_order ASC
    `)
    .bind(unitId)
    .all();

  // Get property images
  const propertyImages = await db
    .prepare(`
      SELECT * FROM images
      WHERE entity_type = 'property' AND entity_id = ?
      ORDER BY is_cover DESC, sort_order ASC
    `)
    .bind(propertyId)
    .all();

  // Combine: unit images first, then property images
  return [
    ...unitImages.results,
    ...propertyImages.results.map(img => ({
      ...img,
      // Mark property images for UI differentiation if needed
      isPropertyImage: true
    }))
  ];
}
```

**Gallery UI:**
- Single unified gallery view
- Optional labels to distinguish "Unit Photos" vs "Property Photos"
- Seamless navigation between all images
- Cover image from unit takes priority as first image

### Lead-to-Unit Association

When a prospective tenant applies:

1. They browse available units on site
2. Click "Apply" on specific unit
3. Application form pre-filled with unit info
4. Lead created with `unit_id` reference
5. Landlord sees lead associated with unit in Ops dashboard

```typescript
// Lead submission includes unit
const LeadSubmissionSchema = z.object({
  // ... existing fields
  unitId: z.string().uuid(), // Required - which unit they're applying for
  propertyId: z.string().uuid(), // Denormalized for convenience
});
```

---

## Data Model

### Updated Schema

```sql
-- Properties table (updated)
CREATE TABLE properties (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip TEXT NOT NULL,
  property_type TEXT NOT NULL, -- 'single_family', 'multi_family', 'condo', 'townhouse', 'commercial'
  description TEXT,
  year_built INTEGER,
  lot_size REAL,
  images TEXT, -- JSON array of image URLs
  amenities TEXT, -- JSON array of amenities
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Units table (new)
CREATE TABLE units (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL,
  unit_number TEXT NOT NULL, -- e.g., "101", "A", "Main" for whole house
  name TEXT, -- optional friendly name
  bedrooms INTEGER NOT NULL DEFAULT 1,
  bathrooms REAL NOT NULL DEFAULT 1,
  sqft INTEGER,
  rent_amount REAL NOT NULL,
  deposit_amount REAL,
  status TEXT NOT NULL DEFAULT 'available', -- 'available', 'occupied', 'maintenance', 'pending'
  floor INTEGER,
  features TEXT, -- JSON array of unit-specific features
  images TEXT, -- JSON array of unit-specific images
  current_tenant_id TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (current_tenant_id) REFERENCES tenants(id) ON DELETE SET NULL
);

-- Update leads table to reference unit
ALTER TABLE leads ADD COLUMN unit_id TEXT REFERENCES units(id);

-- Update leases table to reference unit
ALTER TABLE leases ADD COLUMN unit_id TEXT REFERENCES units(id);

-- Unit history for tracking changes
CREATE TABLE unit_history (
  id TEXT PRIMARY KEY,
  unit_id TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'tenant_move_in', 'tenant_move_out', 'rent_change', 'status_change'
  event_data TEXT, -- JSON with event details
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_units_property_id ON units(property_id);
CREATE INDEX idx_units_status ON units(status);
CREATE INDEX idx_units_current_tenant ON units(current_tenant_id);
CREATE INDEX idx_unit_history_unit_id ON unit_history(unit_id);
```

### TypeScript Types

```typescript
// Property type (updated)
export interface Property {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  propertyType: PropertyType;
  description?: string;
  yearBuilt?: number;
  lotSize?: number;
  images: string[];
  amenities: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Computed
  unitCount?: number;
  occupiedCount?: number;
  vacantCount?: number;
}

export type PropertyType =
  | 'single_family'
  | 'multi_family'
  | 'condo'
  | 'townhouse'
  | 'commercial';

// Unit type (new)
export interface Unit {
  id: string;
  propertyId: string;
  unitNumber: string;
  name?: string;
  bedrooms: number;
  bathrooms: number;
  sqft?: number;
  rentAmount: number;
  depositAmount?: number;
  status: UnitStatus;
  floor?: number;
  features: string[];
  images: string[];
  currentTenantId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Computed/joined
  property?: Property;
  currentTenant?: Tenant;
}

export type UnitStatus =
  | 'available'
  | 'occupied'
  | 'maintenance'
  | 'pending';

// Unit history
export interface UnitHistoryEntry {
  id: string;
  unitId: string;
  eventType: UnitEventType;
  eventData: Record<string, any>;
  createdAt: string;
}

export type UnitEventType =
  | 'tenant_move_in'
  | 'tenant_move_out'
  | 'rent_change'
  | 'status_change';
```

---

## API Endpoints

### Properties API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/properties` | List all properties with unit counts |
| POST | `/api/properties` | Create new property |
| GET | `/api/properties/:id` | Get property with units |
| PUT | `/api/properties/:id` | Update property |
| DELETE | `/api/properties/:id` | Delete property (soft delete) |

### Units API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/properties/:propertyId/units` | List units for property |
| POST | `/api/properties/:propertyId/units` | Create unit |
| GET | `/api/units/:id` | Get unit details |
| PUT | `/api/units/:id` | Update unit |
| DELETE | `/api/units/:id` | Delete unit (soft delete) |
| POST | `/api/units/:id/assign-tenant` | Assign tenant to unit |
| POST | `/api/units/:id/remove-tenant` | Remove tenant from unit |
| GET | `/api/units/:id/history` | Get unit history |

### Zod Schemas

```typescript
// Create property
export const CreatePropertySchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().length(2),
  zip: z.string().regex(/^\d{5}(-\d{4})?$/),
  propertyType: z.enum(['single_family', 'multi_family', 'condo', 'townhouse', 'commercial']),
  description: z.string().optional(),
  yearBuilt: z.number().int().min(1800).max(new Date().getFullYear()).optional(),
  lotSize: z.number().positive().optional(),
  images: z.array(z.string().url()).optional(),
  amenities: z.array(z.string()).optional(),
});

// Create unit
export const CreateUnitSchema = z.object({
  unitNumber: z.string().min(1),
  name: z.string().optional(),
  bedrooms: z.number().int().min(0).max(20),
  bathrooms: z.number().min(0).max(20),
  sqft: z.number().int().positive().optional(),
  rentAmount: z.number().positive(),
  depositAmount: z.number().positive().optional(),
  status: z.enum(['available', 'occupied', 'maintenance', 'pending']).optional(),
  floor: z.number().int().optional(),
  features: z.array(z.string()).optional(),
  images: z.array(z.string().url()).optional(),
});

// Assign tenant to unit
export const AssignTenantSchema = z.object({
  tenantId: z.string().uuid(),
  moveInDate: z.string().datetime().optional(),
});
```

---

## UI Requirements

### Properties List Page (`/admin/properties`)

**Layout:**
- Grid/list toggle view
- Search by name/address
- Filter by property type, vacancy status
- Sort by name, units, vacancy rate

**Property Card/Row:**
- Property name and address
- Property type badge
- Unit count (X/Y occupied)
- Vacancy indicator (green/yellow/red)
- Quick actions: View, Edit, Add Unit

**Actions:**
- "Add Property" button (top right)
- Bulk actions (optional)

### Property Detail Page (`/admin/properties/:id`)

**Sections:**

1. **Property Header**
   - Name, address, type
   - Edit/Delete buttons
   - Overall occupancy stats

2. **Units Grid/Table**
   - Unit number, beds/baths, sqft
   - Rent amount
   - Status badge
   - Current tenant (if occupied)
   - Actions: Edit, Assign Tenant, View History

3. **Property Details**
   - Description
   - Year built, lot size
   - Amenities
   - Images gallery

4. **Quick Stats**
   - Total units
   - Occupied/Vacant
   - Total monthly income
   - Average rent

### Add/Edit Property Modal

**Fields:**
- Basic Info: Name, Property Type
- Address: Street, City, State, ZIP
- Details: Year Built, Lot Size, Description
- Images: Upload/URL input
- Amenities: Multi-select or tag input

**Whole House Toggle:**
- When "Single Family" selected, show option: "This is a whole-house rental"
- Auto-creates single unit with property defaults

### Add/Edit Unit Modal

**Fields:**
- Unit Number (required)
- Name (optional)
- Bedrooms, Bathrooms
- Square Footage
- Rent Amount, Deposit
- Status
- Floor
- Features (multi-select)
- Images

### Assign Tenant Modal

**Flow:**
1. Select from existing tenants (dropdown with search)
2. Or create new tenant inline
3. Set move-in date
4. Confirm assignment

**Validation:**
- Warn if unit already occupied
- Warn if tenant already assigned elsewhere

---

## Workflow Changes

### Lead to Tenant Flow (Updated)

1. Lead submits application for specific unit
2. Lead appears in dashboard with unit reference
3. AI evaluation runs
4. Landlord reviews and approves
5. **NEW:** Landlord assigns lead to unit → converts to tenant
6. Unit status changes to "occupied"
7. Lease created with unit reference

### Tenant Move-Out Flow

1. Landlord initiates move-out for tenant
2. Move-out date recorded
3. Unit status changes to "available" (or "maintenance")
4. History entry created
5. Tenant marked as former

---

## Migration Strategy

### Phase 1: Schema Migration
1. Create new `units` table
2. Create `unit_history` table
3. Add `unit_id` columns to `leads` and `leases`
4. Migrate existing properties to have default "Main" unit

### Phase 2: API Implementation
1. Implement properties CRUD (enhanced)
2. Implement units CRUD
3. Implement tenant assignment
4. Implement history tracking

### Phase 3: UI Implementation
1. Update properties list with unit counts
2. Build property detail with units section
3. Add/Edit property modal
4. Add/Edit unit modal
5. Assign tenant flow

### Phase 4: Integration
1. Update lead form to select unit
2. Update lease creation to include unit
3. Update dashboard metrics

---

## Acceptance Criteria

### Properties
- [ ] Can create property with all fields
- [ ] Can edit existing property
- [ ] Can soft-delete property (marks inactive)
- [ ] Property list shows accurate unit/occupancy counts
- [ ] Can filter/search properties

### Units
- [ ] Can add units to property
- [ ] Can edit unit details
- [ ] Can delete unit (only if no active tenant)
- [ ] Unit status updates correctly on tenant changes
- [ ] Can view unit history

### Tenant Assignment
- [ ] Can assign existing tenant to unit
- [ ] Can remove tenant from unit
- [ ] Unit status auto-updates on assignment/removal
- [ ] History entry created on changes
- [ ] Validation prevents double-assignment

### Whole House Support
- [ ] Single-family property can be configured as whole-house
- [ ] Auto-creates single "Main" unit
- [ ] UI simplified for single-unit properties

### Data Integrity
- [ ] Cannot delete property with active tenants
- [ ] Cannot delete unit with active tenant
- [ ] Cascading updates work correctly
- [ ] Historical data preserved

---

## Future Considerations

1. **Rent Roll Reports** - Monthly income by property/unit
2. **Vacancy Tracking** - Days vacant, turnover rate
3. **Maintenance by Unit** - Work orders linked to units
4. **Rent History** - Track rent changes over time
5. **Unit Comparisons** - Market rent analysis
6. **Bulk Unit Creation** - Template for multi-unit buildings
7. **Floor Plans** - Visual unit layouts

---

## Technical Notes

### Performance
- Index unit queries by property_id and status
- Eager load tenant info for unit lists
- Cache property metrics

### Validation
- Enforce unique unit numbers within property
- Validate rent amounts > 0
- Require at least one unit per property

### Soft Deletes
- Properties and units use `is_active` flag
- Preserve historical data for reporting
- Allow reactivation

---

## Timeline Estimate

- **Phase 1 (Schema):** 1-2 days
- **Phase 2 (API):** 2-3 days
- **Phase 3 (UI):** 3-5 days
- **Phase 4 (Integration):** 1-2 days
- **Testing & Polish:** 2-3 days

**Total:** 9-15 days

---

## Open Questions

1. Should units have their own listing pages on the public site?
2. How to handle rent changes mid-lease?
3. Should we support sub-units (rooms within units)?
4. Integration with property management accounting?
