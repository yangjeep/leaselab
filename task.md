# AI-First Rental Ops Platform - Task Breakdown

## Overview
Unified rental management platform using Remix + Cloudflare Pages/Workers for both storefront and ops backend, with shared packages in a monorepo structure.

**Primary Goal:** Build complete AI-powered rental ops platform
**Secondary Goal:** Migrate storefront from Next.js to Remix + Cloudflare Pages for consistency

---

## Completed Phases (Initial Build)

> Phases 1-6 have been completed in the initial build. Tasks marked with [x] are done.

---

## Phase 1: Monorepo Foundation

### Task 1.1: Scaffold Monorepo Directory Structure
**Priority:** Critical
**Dependencies:** None

- [ ] Create root directory structure:
  - `apps/site/` (for existing storefront)
  - `apps/ops/` (for new Ops backend)
  - `packages/shared-types/`
  - `packages/shared-utils/`
  - `packages/shared-config/`
- [ ] Move/clone existing storefront code into `apps/site/`
- [ ] Verify storefront code integrity after move

### Task 1.2: Root Workspace Configuration
**Priority:** Critical
**Dependencies:** Task 1.1

- [ ] Create root `package.json` with workspaces config:
  ```json
  {
    "workspaces": ["apps/*", "packages/*"]
  }
  ```
- [ ] Create `pnpm-workspace.yaml` (if using pnpm)
- [ ] Add root scripts:
  - `dev:site`
  - `dev:ops`
  - `dev` (parallel)
  - `build:site`
  - `build:ops`
  - `build`

### Task 1.3: TypeScript Path Mapping
**Priority:** Critical
**Dependencies:** Task 1.1

- [ ] Create root `tsconfig.json` with path aliases:
  - `@rental/shared-types`
  - `@rental/shared-utils`
  - `@rental/shared-config`
- [ ] Update `apps/site/tsconfig.json` to extend root
- [ ] Create `apps/ops/tsconfig.json` to extend root

---

## Phase 2: Shared Packages

### Task 2.1: Shared Types Package
**Priority:** High
**Dependencies:** Task 1.2

- [ ] Create `packages/shared-types/package.json`
- [ ] Create `packages/shared-types/src/index.ts`
- [ ] Define and export core domain models:
  - [ ] `Property`
  - [ ] `Tenant`
  - [ ] `Lead`
  - [ ] `LeadAIResult`
  - [ ] `Lease`
  - [ ] `WorkOrder`
  - [ ] `ScreeningResult` (placeholder)
  - [ ] `DocuSignEnvelopeInfo` (placeholder)

### Task 2.2: Shared Config Package
**Priority:** High
**Dependencies:** Task 1.2

- [ ] Create `packages/shared-config/package.json`
- [ ] Create `packages/shared-config/src/index.ts`
- [ ] Implement and export:
  - [ ] Status enums (LeadStatus, LeaseStatus, WorkOrderStatus, etc.)
  - [ ] Route definitions
  - [ ] Zod schemas for API DTOs:
    - [ ] Lead submission schema
    - [ ] AI evaluation result schema
    - [ ] File metadata schema
    - [ ] Work order schema

### Task 2.3: Shared Utils Package
**Priority:** High
**Dependencies:** Task 1.2

- [ ] Create `packages/shared-utils/package.json`
- [ ] Create `packages/shared-utils/src/index.ts`
- [ ] Implement and export:
  - [ ] Date helpers (formatting, parsing, age calculation)
  - [ ] Income/rent ratio calculator
  - [ ] Money formatting utilities
  - [ ] R2 signed URL helper

---

## Phase 3: Ops App Setup (Remix + Cloudflare)

### Task 3.1: Initialize Remix Cloudflare App
**Priority:** High
**Dependencies:** Task 1.2

- [ ] Create Remix app with Cloudflare template in `apps/ops/`
- [ ] Configure `wrangler.toml` with bindings:
  - [ ] D1 database binding
  - [ ] KV namespace binding
  - [ ] R2 bucket binding
- [ ] Set up development environment
- [ ] Verify local dev server works

### Task 3.2: D1 Database Schema
**Priority:** High
**Dependencies:** Task 3.1

- [ ] Create migration files for tables:
  - [ ] `properties` table
  - [ ] `leads` table
  - [ ] `lead_files` table
  - [ ] `lead_ai_evaluations` table
  - [ ] `tenants` table
  - [ ] `leases` table
  - [ ] `work_orders` table
- [ ] Create indexes for common queries
- [ ] Test migrations locally with D1

### Task 3.3: Authentication System
**Priority:** High
**Dependencies:** Task 3.1

- [ ] Set up KV-backed session storage
- [ ] Implement Lucia auth (or minimal session system)
- [ ] Create login/logout routes
- [ ] Implement auth middleware for `/admin/*` routes
- [ ] Add session validation utilities

---

## Phase 4: Core API Routes

### Task 4.1: Public Lead Ingestion API
**Priority:** Critical
**Dependencies:** Task 3.2

- [ ] Implement `POST /api/public/leads`
  - [ ] Validate request body with Zod schema
  - [ ] Insert lead record into D1
  - [ ] Return lead ID for file uploads
- [ ] Add rate limiting/basic security

### Task 4.2: File Management API
**Priority:** High
**Dependencies:** Task 4.1

- [ ] Implement `POST /api/leads/:id/files`
  - [ ] Register file metadata in D1
  - [ ] Generate R2 presigned upload URLs
  - [ ] Track file types (ID, paystub, etc.)

### Task 4.3: AI Evaluation API
**Priority:** High
**Dependencies:** Task 4.2

- [ ] Implement `POST /api/leads/:id/ai`
  - [ ] Fetch lead data and associated files
  - [ ] Fetch property rent amount
  - [ ] Generate signed URLs for R2 files
  - [ ] Call OpenAI API (Vision + Text)
  - [ ] Parse AI response:
    ```json
    {
      "score": 0-100,
      "label": "A/B/C/D",
      "summary": "",
      "risk_flags": [],
      "recommendation": "",
      "fraud_signals": [],
      "model_version": "v1"
    }
    ```
  - [ ] Save results to `lead_ai_evaluations` table
  - [ ] Update `leads.ai_score` field

### Task 4.4: Work Orders CRUD API
**Priority:** Medium
**Dependencies:** Task 3.2

- [ ] Implement `GET /api/work-orders` (list)
- [ ] Implement `POST /api/work-orders` (create)
- [ ] Implement `GET /api/work-orders/:id` (read)
- [ ] Implement `PUT /api/work-orders/:id` (update)
- [ ] Implement `DELETE /api/work-orders/:id` (delete)

### Task 4.5: Placeholder APIs
**Priority:** Low
**Dependencies:** Task 3.2

- [ ] Implement `POST /api/leads/:id/screening`
  - [ ] Placeholder for Certn/SingleKey integration
  - [ ] Return mock response structure
- [ ] Implement `POST /api/leases/:id/send`
  - [ ] Placeholder for DocuSign integration
  - [ ] Return mock envelope info

---

## Phase 5: Admin UI

### Task 5.1: Admin Layout and Navigation
**Priority:** High
**Dependencies:** Task 3.3

- [ ] Create admin layout component
- [ ] Implement navigation sidebar
- [ ] Add auth protection to admin routes
- [ ] Create dashboard overview page

### Task 5.2: Leads Management UI
**Priority:** High
**Dependencies:** Task 4.3

- [ ] Create `/admin/leads` route
  - [ ] List view sorted by `ai_score` DESC
  - [ ] Filter/search functionality
  - [ ] Lead status indicators
- [ ] Create `/admin/leads/:id` detail view
  - [ ] Display lead info
  - [ ] Show uploaded files
  - [ ] Display AI evaluation results
  - [ ] Actions: trigger AI, view screening, etc.

### Task 5.3: Properties Management UI
**Priority:** Medium
**Dependencies:** Task 3.2

- [ ] Create `/admin/properties` route
  - [ ] List all properties
  - [ ] Add new property form
- [ ] Create `/admin/properties/:id` detail view
  - [ ] Edit property details
  - [ ] View associated leads/tenants

### Task 5.4: Tenants Management UI
**Priority:** Medium
**Dependencies:** Task 3.2

- [ ] Create `/admin/tenants` route
  - [ ] List all tenants
  - [ ] Search/filter
- [ ] Create `/admin/tenants/:id` detail view
  - [ ] Tenant info
  - [ ] Lease history
  - [ ] Associated work orders

### Task 5.5: Work Orders Management UI
**Priority:** Medium
**Dependencies:** Task 4.4

- [ ] Create `/admin/work-orders` route
  - [ ] List with status filters
  - [ ] Create new work order form
- [ ] Create `/admin/work-orders/:id` detail view
  - [ ] Status updates
  - [ ] Assignment
  - [ ] Notes/history

---

## Phase 6: Storefront Integration

### Task 6.1: Update Lead Form Submission
**Priority:** Critical
**Dependencies:** Task 4.1, Task 4.2

- [ ] Locate existing lead form in `apps/site`
- [ ] Update form submission to POST to:
  ```
  https://ops.<domain>/api/public/leads
  ```
- [ ] Implement file upload flow using presigned URLs
- [ ] Update error handling for API responses
- [ ] Ensure payload matches Zod schema from `@rental/shared-config`

### Task 6.2: Environment Configuration
**Priority:** High
**Dependencies:** Task 6.1

- [ ] Add Ops API URL to storefront environment variables
- [ ] Configure CORS on Ops API for storefront domain
- [ ] Update Vercel environment settings

---

## Phase 7: Testing and Validation

### Task 7.1: Storefront Integrity Check
**Priority:** Critical
**Dependencies:** All Phase 1 tasks

- [ ] Run `apps/site` dev server
- [ ] Verify all existing pages render correctly
- [ ] Check all existing imports resolve
- [ ] Test build process completes
- [ ] Confirm Vercel deployment works

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

## Phase 8: Deployment

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

## Phase 9: Site Migration (Next.js → Remix + Cloudflare Pages)

### Task 9.1: Create Remix App Structure
**Priority:** Critical
**Dependencies:** Phase 8 complete

- [ ] Back up existing Next.js code
- [ ] Create new Remix + Cloudflare Pages app structure
- [ ] Set up `apps/site/package.json` with Remix dependencies
- [ ] Create `apps/site/wrangler.toml` with D1 binding
- [ ] Configure Vite with Remix plugin
- [ ] Set up Tailwind CSS for Remix
- [ ] Create `apps/site/app/root.tsx` with base layout
- [ ] Create `apps/site/app/entry.client.tsx` and `entry.server.tsx`
- [ ] Create `apps/site/env.d.ts` for Cloudflare types

### Task 9.2: Migrate Home Page
**Priority:** Critical
**Dependencies:** Task 9.1

- [ ] Create `apps/site/app/routes/_index.tsx`
- [ ] Implement loader to fetch properties from D1
- [ ] Migrate home page UI components
- [ ] Migrate Filters component
- [ ] Migrate ListingCard component
- [ ] Migrate HomeTabs/TabbedLayout components
- [ ] Ensure responsive grid layout works
- [ ] Add proper meta tags for SEO

### Task 9.3: Migrate Property Detail Page
**Priority:** Critical
**Dependencies:** Task 9.2

- [ ] Create `apps/site/app/routes/properties.$slug.tsx`
- [ ] Implement loader to fetch single property from D1
- [ ] Migrate ListingGallery component (image carousel)
- [ ] Migrate PropertyTabs component
- [ ] Migrate GoogleMap component
- [ ] Migrate ContactForm component
- [ ] Update ContactForm to use Remix `<Form>`
- [ ] Implement action for form submission
- [ ] Add dynamic meta tags for property SEO

### Task 9.4: Migrate Thank You Page
**Priority:** High
**Dependencies:** Task 9.3

- [ ] Create `apps/site/app/routes/thank-you.tsx`
- [ ] Migrate thank you page content
- [ ] Add proper redirect handling

### Task 9.5: Migrate API Routes
**Priority:** High
**Dependencies:** Task 9.3

- [ ] Create `apps/site/app/routes/api.properties.tsx`
  - [ ] Implement loader to return properties from D1 as JSON
  - [ ] Match existing API response format
- [ ] Create `apps/site/app/routes/api.tenant-leads.tsx`
  - [ ] Implement action to handle form submission
  - [ ] Forward lead to Ops API
  - [ ] Remove Baserow dependency (or keep as backup)

### Task 9.6: Migrate Styles and Assets
**Priority:** High
**Dependencies:** Task 9.1

- [ ] Move `globals.css` to `app/tailwind.css`
- [ ] Migrate custom CSS classes
- [ ] Move public assets (images, robots.txt)
- [ ] Update Tailwind config if needed
- [ ] Ensure fonts are properly loaded

### Task 9.7: Database Integration
**Priority:** Critical
**Dependencies:** Task 9.1

- [ ] Create `apps/site/app/lib/db.server.ts`
- [ ] Implement property fetching functions:
  - [ ] `getProperties()` - list all available
  - [ ] `getPropertyBySlug()` - single property
- [ ] Map D1 results to Property types
- [ ] Implement caching strategy with Cloudflare

### Task 9.8: Environment & Configuration
**Priority:** High
**Dependencies:** Task 9.5

- [ ] Update `apps/site/.env.local` for Remix
- [ ] Configure environment variables:
  - [ ] `OPS_API_URL`
  - [ ] `GOOGLE_MAPS_API_KEY`
- [ ] Set up Cloudflare secrets for production

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
  - [ ] `app/` directory (Next.js version)
  - [ ] `middleware.ts`
  - [ ] Other Next.js specific files
- [ ] Update root `package.json` scripts
- [ ] Deploy to Cloudflare Pages
- [ ] Configure custom domain
- [ ] Test production deployment
- [ ] Update documentation

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
- [ ] Both site and ops apps deploy to Cloudflare Pages/Workers
- [ ] Monorepo correctly resolves all shared imports
- [ ] D1 records are created accurately
- [ ] R2 file uploads work correctly

### Site (After Migration)
- [ ] Site has full feature parity with original Next.js version
- [ ] All pages render correctly (home, property detail, thank you)
- [ ] Property listings load from D1 database
- [ ] Lead form submits to Ops API successfully
- [ ] Google Maps integration works
- [ ] Image galleries display correctly
- [ ] Mobile responsive design works
- [ ] SEO meta tags render properly
- [ ] Performance is equal or better than Next.js version

### Ops Backend
- [ ] Ops app deploys successfully to Cloudflare Workers
- [ ] AI evaluation pipeline works end-to-end
- [ ] Leads from site appear in Ops dashboard
- [ ] Admin UI is functional and usable
- [ ] Authentication system works correctly
- [ ] Screening & DocuSign placeholders are properly wired

---

## Notes

- **Consistency:** Both apps use Remix + Cloudflare for unified architecture
- **Migration Safety:** Back up existing code before migration
- **Feature Parity:** All existing functionality must be preserved
- **Import Paths:** Use `@rental/` prefixed paths for shared packages
- **D1 Shared:** Both apps connect to the same D1 database
