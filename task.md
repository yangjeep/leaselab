# LeaseLab - AI-First Rental Ops Platform - Task Breakdown

## Overview
Unified rental management platform using Remix + Cloudflare Pages/Workers for both storefront and ops backend, with shared packages in a monorepo structure.

**Primary Goal:** Build complete AI-powered rental ops platform
**Secondary Goal:** Migrate storefront from Next.js to Remix + Cloudflare Pages for consistency

---

## Completed Phases

> All core phases have been completed. Tasks marked with [x] are done.

---

## Phase 1: Monorepo Foundation [COMPLETED]

### Task 1.1: Scaffold Monorepo Directory Structure
**Priority:** Critical
**Dependencies:** None

- [x] Create root directory structure:
  - `apps/site/` (for existing storefront)
  - `apps/ops/` (for new Ops backend)
  - `packages/shared-types/`
  - `packages/shared-utils/`
  - `packages/shared-config/`
- [x] Move/clone existing storefront code into `apps/site/`
- [x] Verify storefront code integrity after move

### Task 1.2: Root Workspace Configuration
**Priority:** Critical
**Dependencies:** Task 1.1

- [x] Create root `package.json` with workspaces config:
  ```json
  {
    "workspaces": ["apps/*", "packages/*"]
  }
  ```
- [x] Create `pnpm-workspace.yaml` (if using pnpm)
- [x] Add root scripts:
  - `dev:site`
  - `dev:ops`
  - `dev` (parallel)
  - `build:site`
  - `build:ops`
  - `build`

### Task 1.3: TypeScript Path Mapping
**Priority:** Critical
**Dependencies:** Task 1.1

- [x] Create root `tsconfig.json` with path aliases:
  - `@leaselab/shared-types`
  - `@leaselab/shared-utils`
  - `@leaselab/shared-config`
- [x] Update `apps/site/tsconfig.json` to extend root
- [x] Create `apps/ops/tsconfig.json` to extend root

---

## Phase 2: Shared Packages [COMPLETED]

### Task 2.1: Shared Types Package
**Priority:** High
**Dependencies:** Task 1.2

- [x] Create `packages/shared-types/package.json`
- [x] Create `packages/shared-types/src/index.ts`
- [x] Define and export core domain models:
  - [x] `Property`
  - [x] `Tenant`
  - [x] `Lead`
  - [x] `LeadAIResult`
  - [x] `Lease`
  - [x] `WorkOrder`
  - [x] `ScreeningResult` (placeholder)
  - [x] `DocuSignEnvelopeInfo` (placeholder)

### Task 2.2: Shared Config Package
**Priority:** High
**Dependencies:** Task 1.2

- [x] Create `packages/shared-config/package.json`
- [x] Create `packages/shared-config/src/index.ts`
- [x] Implement and export:
  - [x] Status enums (LeadStatus, LeaseStatus, WorkOrderStatus, etc.)
  - [x] Route definitions
  - [x] Zod schemas for API DTOs:
    - [x] Lead submission schema
    - [x] AI evaluation result schema
    - [x] File metadata schema
    - [x] Work order schema

### Task 2.3: Shared Utils Package
**Priority:** High
**Dependencies:** Task 1.2

- [x] Create `packages/shared-utils/package.json`
- [x] Create `packages/shared-utils/src/index.ts`
- [x] Implement and export:
  - [x] Date helpers (formatting, parsing, age calculation)
  - [x] Income/rent ratio calculator
  - [x] Money formatting utilities
  - [x] R2 signed URL helper

---

## Phase 3: Ops App Setup (Remix + Cloudflare) [COMPLETED]

### Task 3.1: Initialize Remix Cloudflare App
**Priority:** High
**Dependencies:** Task 1.2

- [x] Create Remix app with Cloudflare template in `apps/ops/`
- [x] Configure `wrangler.toml` with bindings:
  - [x] D1 database binding
  - [x] KV namespace binding
  - [x] R2 bucket binding
- [x] Set up development environment
- [x] Verify local dev server works

### Task 3.2: D1 Database Schema
**Priority:** High
**Dependencies:** Task 3.1

- [x] Create migration files for tables:
  - [x] `properties` table
  - [x] `leads` table
  - [x] `lead_files` table
  - [x] `lead_ai_evaluations` table
  - [x] `tenants` table
  - [x] `leases` table
  - [x] `work_orders` table
- [x] Create indexes for common queries
- [x] Test migrations locally with D1

### Task 3.3: Authentication System
**Priority:** High
**Dependencies:** Task 3.1

- [x] Set up KV-backed session storage
- [x] Implement minimal session system
- [x] Create login/logout routes
- [x] Implement auth middleware for `/admin/*` routes
- [x] Add session validation utilities

---

## Phase 4: Core API Routes [COMPLETED]

### Task 4.1: Public Lead Ingestion API
**Priority:** Critical
**Dependencies:** Task 3.2

- [x] Implement `POST /api/public/leads`
  - [x] Validate request body with Zod schema
  - [x] Insert lead record into D1
  - [x] Return lead ID for file uploads
- [x] Add rate limiting/basic security

### Task 4.2: File Management API
**Priority:** High
**Dependencies:** Task 4.1

- [x] Implement `POST /api/leads/:id/files`
  - [x] Register file metadata in D1
  - [x] Generate R2 presigned upload URLs
  - [x] Track file types (ID, paystub, etc.)

### Task 4.3: AI Evaluation API
**Priority:** High
**Dependencies:** Task 4.2

- [x] Implement `POST /api/leads/:id/ai`
  - [x] Fetch lead data and associated files
  - [x] Fetch property rent amount
  - [x] Generate signed URLs for R2 files
  - [x] Call OpenAI API (Vision + Text)
  - [x] Parse AI response
  - [x] Save results to `lead_ai_evaluations` table
  - [x] Update `leads.ai_score` field

### Task 4.4: Work Orders CRUD API
**Priority:** Medium
**Dependencies:** Task 3.2

- [x] Implement `GET /api/work-orders` (list)
- [x] Implement `POST /api/work-orders` (create)
- [x] Implement `GET /api/work-orders/:id` (read)
- [x] Implement `PUT /api/work-orders/:id` (update)
- [x] Implement `DELETE /api/work-orders/:id` (delete)

### Task 4.5: Placeholder APIs
**Priority:** Low
**Dependencies:** Task 3.2

- [x] Implement `POST /api/leads/:id/screening`
  - [x] Placeholder for Certn/SingleKey integration
  - [x] Return mock response structure
- [x] Implement `POST /api/leases/:id/send`
  - [x] Placeholder for DocuSign integration
  - [x] Return mock envelope info

---

## Phase 5: Admin UI [COMPLETED]

### Task 5.1: Admin Layout and Navigation
**Priority:** High
**Dependencies:** Task 3.3

- [x] Create admin layout component
- [x] Implement navigation sidebar
- [x] Add auth protection to admin routes
- [x] Create dashboard overview page

### Task 5.2: Leads Management UI
**Priority:** High
**Dependencies:** Task 4.3

- [x] Create `/admin/leads` route
  - [x] List view sorted by `ai_score` DESC
  - [x] Filter/search functionality
  - [x] Lead status indicators
- [x] Create `/admin/leads/:id` detail view
  - [x] Display lead info
  - [x] Show uploaded files
  - [x] Display AI evaluation results
  - [x] Actions: trigger AI, view screening, etc.

### Task 5.3: Properties Management UI
**Priority:** Medium
**Dependencies:** Task 3.2

- [x] Create `/admin/properties` route
  - [x] List all properties
  - [x] Add new property form
- [x] Create `/admin/properties/:id` detail view
  - [x] Edit property details
  - [x] View associated leads/tenants

### Task 5.4: Tenants Management UI
**Priority:** Medium
**Dependencies:** Task 3.2

- [x] Create `/admin/tenants` route
  - [x] List all tenants
  - [x] Search/filter
- [x] Create `/admin/tenants/:id` detail view
  - [x] Tenant info
  - [x] Lease history
  - [x] Associated work orders

### Task 5.5: Work Orders Management UI
**Priority:** Medium
**Dependencies:** Task 4.4

- [x] Create `/admin/work-orders` route
  - [x] List with status filters
  - [x] Create new work order form
- [x] Create `/admin/work-orders/:id` detail view
  - [x] Status updates
  - [x] Assignment
  - [x] Notes/history

---

## Phase 6: Storefront Integration [COMPLETED]

### Task 6.1: Update Lead Form Submission
**Priority:** Critical
**Dependencies:** Task 4.1, Task 4.2

- [x] Locate existing lead form in `apps/site`
- [x] Update form submission to POST to Ops API
- [x] Implement file upload flow using presigned URLs
- [x] Update error handling for API responses
- [x] Ensure payload matches Zod schema from `@leaselab/shared-config`

### Task 6.2: Environment Configuration
**Priority:** High
**Dependencies:** Task 6.1

- [x] Add Ops API URL to storefront environment variables
- [x] Configure CORS on Ops API for storefront domain
- [x] Create .env.local files with placeholders

---

## Phase 7: Testing and Validation [IN PROGRESS]

### Task 7.1: Storefront Integrity Check
**Priority:** Critical
**Dependencies:** All Phase 1 tasks

- [x] Run `apps/site` dev server
- [ ] Verify all existing pages render correctly
- [x] Check all existing imports resolve
- [ ] Test build process completes
- [ ] Confirm Cloudflare deployment works

### Task 7.2: End-to-End Integration Test
**Priority:** High
**Dependencies:** Task 6.1

- [ ] Submit lead from storefront
- [ ] Verify lead appears in Ops dashboard
- [ ] Upload files and verify R2 storage
- [ ] Trigger AI evaluation
- [ ] Verify AI results display in admin UI

### Task 7.3: API Testing
**Priority:** Medium
**Dependencies:** Phase 4 tasks

- [ ] Create API test suite
- [ ] Test all public endpoints
- [ ] Test all admin endpoints with auth
- [ ] Validate Zod schema enforcement

---

## Phase 8: Deployment [PENDING]

### Task 8.1: Ops App Cloudflare Deployment
**Priority:** High
**Dependencies:** Phase 7 tasks

- [ ] Configure production wrangler.toml
- [ ] Set up production D1 database
- [ ] Configure production KV namespace
- [ ] Set up production R2 bucket
- [ ] Deploy to Cloudflare Workers
- [ ] Configure custom domain

### Task 8.2: Environment Secrets
**Priority:** High
**Dependencies:** Task 8.1

- [ ] Set OpenAI API key in Cloudflare secrets
- [ ] Configure session secrets
- [ ] Set up any other API keys

---

## Phase 9: Site Migration (Next.js → Remix + Cloudflare Pages) [COMPLETED]

### Task 9.1: Create Remix App Structure
**Priority:** Critical
**Dependencies:** Phase 8 complete

- [x] Back up existing Next.js code (to app-nextjs/)
- [x] Create new Remix + Cloudflare Pages app structure
- [x] Set up `apps/site/package.json` with Remix dependencies
- [x] Create `apps/site/wrangler.toml` with D1 binding
- [x] Configure Vite with Remix plugin
- [x] Set up Tailwind CSS for Remix
- [x] Create `apps/site/app/root.tsx` with base layout
- [x] Create `apps/site/app/entry.client.tsx` and `entry.server.tsx`
- [x] Create `apps/site/env.d.ts` for Cloudflare types

### Task 9.2: Migrate Home Page
**Priority:** Critical
**Dependencies:** Task 9.1

- [x] Create `apps/site/app/routes/_index.tsx`
- [x] Implement loader to fetch properties from D1
- [x] Migrate home page UI components
- [x] Migrate Filters component
- [x] Migrate ListingCard component
- [x] Migrate HomeTabs/TabbedLayout components
- [x] Ensure responsive grid layout works
- [x] Add proper meta tags for SEO

### Task 9.3: Migrate Property Detail Page
**Priority:** Critical
**Dependencies:** Task 9.2

- [x] Create `apps/site/app/routes/properties.$slug.tsx`
- [x] Implement loader to fetch single property from D1
- [x] Migrate ListingGallery component (image carousel)
- [x] Migrate PropertyTabs component
- [x] Migrate GoogleMap component
- [x] Migrate ContactForm component
- [x] Update ContactForm to use Remix `<Form>`
- [x] Implement action for form submission
- [x] Add dynamic meta tags for property SEO

### Task 9.4: Migrate Thank You Page
**Priority:** High
**Dependencies:** Task 9.3

- [x] Create `apps/site/app/routes/thank-you.tsx`
- [x] Migrate thank you page content
- [x] Add proper redirect handling

### Task 9.5: Migrate API Routes
**Priority:** High
**Dependencies:** Task 9.3

- [x] Create `apps/site/app/routes/api.properties.tsx`
  - [x] Implement loader to return properties from D1 as JSON
  - [x] Match existing API response format
- [x] Create `apps/site/app/routes/api.tenant-leads.tsx`
  - [x] Implement action to handle form submission
  - [x] Forward lead to Ops API
  - [x] Remove Baserow dependency (or keep as backup)

### Task 9.6: Migrate Styles and Assets
**Priority:** High
**Dependencies:** Task 9.1

- [x] Move `globals.css` to `app/tailwind.css`
- [x] Migrate custom CSS classes
- [x] Move public assets (images, robots.txt)
- [x] Update Tailwind config if needed
- [x] Ensure fonts are properly loaded

### Task 9.7: Database Integration
**Priority:** Critical
**Dependencies:** Task 9.1

- [x] Create `apps/site/app/lib/db.server.ts`
- [x] Implement property fetching functions:
  - [x] `getProperties()` - list all available
  - [x] `getPropertyBySlug()` - single property
- [x] Map D1 results to Property types
- [x] Implement caching strategy with Cloudflare

### Task 9.8: Environment & Configuration
**Priority:** High
**Dependencies:** Task 9.5

- [x] Update `apps/site/.env.local` for Remix
- [x] Configure environment variables:
  - [x] `OPS_API_URL`
  - [x] `GOOGLE_MAPS_API_KEY`
- [x] Set up Cloudflare secrets for production

### Task 9.9: Testing & Validation
**Priority:** Critical
**Dependencies:** Tasks 9.2-9.7

- [ ] Test home page renders correctly
- [ ] Test property detail page with various properties
- [ ] Test lead form submission end-to-end
- [ ] Verify Google Maps loads correctly
- [ ] Test image gallery functionality
- [ ] Test filtering functionality
- [ ] Verify mobile responsiveness
- [ ] Check all links work
- [ ] Validate SEO meta tags
- [ ] Test 404 handling

### Task 9.10: Cleanup & Deployment
**Priority:** High
**Dependencies:** Task 9.9

- [ ] Remove old Next.js files:
  - [ ] `next.config.mjs`
  - [ ] `app-nextjs/` directory
  - [ ] `middleware.ts`
  - [ ] Other Next.js specific files
- [ ] Update root `package.json` scripts
- [ ] Deploy to Cloudflare Pages
- [ ] Configure custom domain
- [ ] Test production deployment
- [ ] Update documentation

---

## Phase 10: Branding & Polish [COMPLETED]

### Task 10.1: Rebrand to LeaseLab.io
**Priority:** High
**Dependencies:** Phase 9

- [x] Update all package names from @rental to @leaselab
- [x] Update wrangler.toml names (leaselab-site, leaselab-ops, leaselab-db)
- [x] Update all source file imports
- [x] Update UI branding from "Rental Ops" to "LeaseLab.io"
- [x] Update landing page with LeaseLab.io branding
- [x] Simplify landing page (Sign In button only)

### Task 10.2: Fix Build Issues
**Priority:** Critical
**Dependencies:** Task 10.1

- [x] Fix react-dom/server import for Cloudflare (use server.browser)
- [x] Add explicit Vite resolve aliases for monorepo path resolution
- [x] Verify dev server runs without errors

---

## Phase 11: Property & Unit Management [PENDING]

> See full PRD: `docs/PRD-property-unit-management.md`

### Task 11.1: Database Schema Updates
**Priority:** Critical
**Dependencies:** Phase 3

- [ ] Create migration for updated `properties` table
  - [ ] Add property_type, year_built, lot_size fields
  - [ ] Add amenities JSON field
  - [ ] Add slug field for URLs
- [ ] Create `units` table
  - [ ] unit_number, bedrooms, bathrooms, sqft
  - [ ] rent_amount, deposit_amount
  - [ ] status (available/occupied/maintenance/pending)
  - [ ] current_tenant_id reference
- [ ] Create `unit_history` table for audit trail
- [ ] Create `images` table for property/unit images
- [ ] Add unit_id to leads table
- [ ] Add unit_id to leases table
- [ ] Create necessary indexes
- [ ] Run migrations locally and test

### Task 11.2: Image Upload Infrastructure
**Priority:** High
**Dependencies:** Task 11.1

- [ ] Configure R2 bucket for image storage
- [ ] Implement presigned URL generation for uploads
- [ ] Create image upload API endpoint (`POST /api/images/presign`)
- [ ] Create image registration endpoint (`POST /api/images`)
- [ ] Implement image deletion (R2 + DB)
- [ ] Add image reordering endpoint
- [ ] Set up Cloudflare Image Resizing configuration

### Task 11.3: Properties API (Ops)
**Priority:** High
**Dependencies:** Task 11.1

- [ ] Implement `GET /api/properties` - list with unit counts
- [ ] Implement `POST /api/properties` - create with validation
- [ ] Implement `GET /api/properties/:id` - detail with units
- [ ] Implement `PUT /api/properties/:id` - update
- [ ] Implement `DELETE /api/properties/:id` - soft delete
- [ ] Add Zod schemas for validation
- [ ] Include image management in property responses

### Task 11.4: Units API (Ops)
**Priority:** High
**Dependencies:** Task 11.3

- [ ] Implement `GET /api/properties/:id/units` - list units
- [ ] Implement `POST /api/properties/:id/units` - create unit
- [ ] Implement `GET /api/units/:id` - unit detail
- [ ] Implement `PUT /api/units/:id` - update unit
- [ ] Implement `DELETE /api/units/:id` - soft delete
- [ ] Implement `POST /api/units/:id/assign-tenant` - assign tenant
- [ ] Implement `POST /api/units/:id/remove-tenant` - remove tenant
- [ ] Implement `GET /api/units/:id/history` - get history
- [ ] Auto-update unit status on tenant changes
- [ ] Record history entries on changes

### Task 11.5: Properties Admin UI
**Priority:** High
**Dependencies:** Task 11.3

- [ ] Update `/admin/properties` list view
  - [ ] Show unit counts (occupied/total)
  - [ ] Add vacancy indicators
  - [ ] Add search/filter functionality
  - [ ] Add property type badges
- [ ] Create Add Property modal
  - [ ] Basic info fields
  - [ ] Address fields
  - [ ] Property type selector
  - [ ] "Whole house" toggle for single-family
  - [ ] Image upload component
  - [ ] Amenities selector
- [ ] Create Edit Property modal
- [ ] Add delete confirmation

### Task 11.6: Property Detail Page (Admin)
**Priority:** High
**Dependencies:** Task 11.4, Task 11.5

- [ ] Create `/admin/properties/:id` detail page
- [ ] Property header with stats
- [ ] Units grid/table view
  - [ ] Unit number, beds/baths, rent
  - [ ] Status badges
  - [ ] Current tenant display
  - [ ] Quick actions
- [ ] Property details section
- [ ] Image gallery management
- [ ] Quick stats sidebar

### Task 11.7: Units Admin UI
**Priority:** High
**Dependencies:** Task 11.6

- [ ] Create Add Unit modal
  - [ ] Unit number, name
  - [ ] Beds, baths, sqft
  - [ ] Rent, deposit
  - [ ] Status selector
  - [ ] Features multi-select
  - [ ] Image upload
- [ ] Create Edit Unit modal
- [ ] Create Assign Tenant modal
  - [ ] Tenant search/select
  - [ ] Move-in date picker
  - [ ] Validation warnings
- [ ] Create Unit History view
- [ ] Add delete confirmation with validation

### Task 11.8: Image Upload Component
**Priority:** High
**Dependencies:** Task 11.2

- [ ] Create reusable ImageUploader component
- [ ] Drag-and-drop support
- [ ] Multiple file selection
- [ ] Upload progress indicators
- [ ] Image preview thumbnails
- [ ] Reorder functionality (drag)
- [ ] Delete button with confirmation
- [ ] Set cover image option

### Task 11.9: Public Site - Properties Browse
**Priority:** High
**Dependencies:** Task 11.3

- [ ] Create `/properties` route - browse all
- [ ] Property cards with cover images
- [ ] Filter by type, beds, price range
- [ ] Sort options
- [ ] Pagination or infinite scroll
- [ ] Available units count display

### Task 11.10: Public Site - Property Detail
**Priority:** High
**Dependencies:** Task 11.9

- [ ] Update `/properties/:slug` route
- [ ] Property info header
- [ ] Property-level image gallery with Cloudflare resizing
- [ ] Available units list
  - [ ] Unit details (beds, baths, rent)
  - [ ] Combined gallery (unit + property images)
  - [ ] "Apply" button per unit
- [ ] Property amenities display
- [ ] Map integration
- [ ] Mobile responsive layout
- [ ] Implement `getUnitGalleryImages()` - combines unit + property images
- [ ] Gallery displays unit images first, then property images

### Task 11.11: Public Site - Unit Application
**Priority:** High
**Dependencies:** Task 11.10

- [ ] Create `/apply/:unitId` route
- [ ] Pre-fill unit/property info
- [ ] Application form fields
- [ ] File upload for documents
- [ ] Submit to Ops API with unit_id
- [ ] Confirmation/thank you redirect
- [ ] Update lead schema to require unit_id

### Task 11.12: OptimizedImage Component & Combined Gallery
**Priority:** Medium
**Dependencies:** Task 11.2

- [ ] Create OptimizedImage component
- [ ] Cloudflare Image Resizing URL generation
- [ ] Standard size presets
- [ ] Lazy loading support
- [ ] WebP/AVIF format auto-detection
- [ ] Placeholder/loading state
- [ ] Error fallback
- [ ] Create CombinedGallery component
  - [ ] Accepts unit + property images
  - [ ] Unified navigation
  - [ ] Optional section labels (Unit/Property)
  - [ ] Lightbox/fullscreen support

### Task 11.13: Shared Types & Schemas
**Priority:** High
**Dependencies:** Task 11.1

- [ ] Add Property type updates to shared-types
- [ ] Add Unit type to shared-types
- [ ] Add UnitHistory type to shared-types
- [ ] Add Image type to shared-types
- [ ] Add PropertyType enum to shared-config
- [ ] Add UnitStatus enum to shared-config
- [ ] Add CreatePropertySchema to shared-config
- [ ] Add CreateUnitSchema to shared-config
- [ ] Add AssignTenantSchema to shared-config

### Task 11.14: Data Migration
**Priority:** Medium
**Dependencies:** Task 11.1

- [ ] Migrate existing properties to new schema
- [ ] Create default "Main" unit for existing properties
- [ ] Update existing leads with unit references
- [ ] Verify data integrity after migration

### Task 11.15: Testing & Validation
**Priority:** High
**Dependencies:** Tasks 11.1-11.14

- [ ] Test property CRUD operations
- [ ] Test unit CRUD operations
- [ ] Test image upload flow
- [ ] Test tenant assignment/removal
- [ ] Test unit status auto-updates
- [ ] Test history recording
- [ ] Test public site property browsing
- [ ] Test unit application flow
- [ ] Test image resizing on public site
- [ ] Verify mobile responsiveness
- [ ] Test edge cases (delete with tenants, etc.)

---

## Bonus Tasks (Optional)

### Task B.1: Build Optimization
- [ ] Add TurboRepo pipeline (`turbo.json`)
- [ ] Configure caching strategies
- [ ] Optimize build times

### Task B.2: Code Quality
- [ ] Add Prettier config at root
- [ ] Add ESLint config at root
- [ ] Configure lint-staged with husky

### Task B.3: Database Migrations
- [ ] Create automatic migration system for D1
- [ ] Add migration CLI commands
- [ ] Document migration workflow

### Task B.4: Tenant Portal Skeleton
- [ ] Create basic tenant-facing routes
- [ ] Implement tenant auth
- [ ] Basic dashboard for tenants

---

## Acceptance Criteria Summary

### Platform Core
- [x] Both site and ops apps use Remix + Cloudflare
- [x] Monorepo correctly resolves all shared imports
- [x] D1 schema created with all required tables
- [x] R2 bucket configured for file storage
- [x] KV namespace configured for sessions

### Site (After Migration)
- [x] Site migrated to Remix + Cloudflare Pages
- [x] All pages created (home, property detail, thank you)
- [x] Property listings configured to load from D1
- [x] Lead form configured to submit to Ops API
- [x] Google Maps component migrated
- [x] Image galleries migrated
- [x] Mobile responsive design preserved
- [x] SEO meta tags configured

### Ops Backend
- [x] Ops app configured for Cloudflare Workers
- [x] AI evaluation pipeline implemented
- [x] Admin UI fully functional
- [x] Authentication system working
- [x] Screening & DocuSign placeholders wired
- [x] LeaseLab.io branding applied

### Pending Validation
- [ ] End-to-end integration testing
- [ ] Production deployment
- [ ] Performance testing

---

## Notes

- **Branding:** Platform is branded as LeaseLab.io
- **Import Paths:** Use `@leaselab/` prefixed paths for shared packages
- **D1 Shared:** Both apps connect to the same D1 database (leaselab-db)
- **Consistency:** Both apps use Remix + Cloudflare for unified architecture
