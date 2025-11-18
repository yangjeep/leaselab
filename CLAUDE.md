AI Development Task Guide (Cursor-Ready)
AI-First Rental Ops Platform – Monorepo Build Instructions

Repo Name: rental-mgr
Primary Goal:
Build a unified rental management platform using Remix + Cloudflare Pages/Workers for both storefront and ops backend, with shared types, configs, and utilities in a monorepo structure.

Secondary Goal (Migration):
Migrate the existing Next.js storefront to Remix + Cloudflare Pages for consistency, performance, and unified deployment.

This document is written for AI Agents (Cursor) to follow safely.

📁 1. Monorepo Directory Structure (Strict Requirement)

The repository MUST follow this layout:

rental-mgr/
├─ apps/
│  ├─ site/        # Storefront (Remix + Cloudflare Pages) – migrated from Next.js
│  └─ ops/         # Ops backend (Remix + Cloudflare Workers)
│
├─ packages/
│  ├─ shared-types/
│  ├─ shared-utils/
│  └─ shared-config/
│
├─ package.json         # root workspace config
├─ pnpm-workspace.yaml  # (or yarn/npm workspaces)
├─ turbo.json           # optional
└─ README.md

⚠️ 2. Critical Safety Rules for Cursor
During migration, preserve all existing functionality while converting to new framework.

The folder:

apps/site/


Will be migrated from Next.js to Remix + Cloudflare Pages.
All existing pages, components, and functionality must be preserved.
Migration should be incremental and testable.

Ops App is isolated

All backend/Ops code must live inside:

apps/ops/

Shared packages must use non-conflicting import paths

Use path aliases:

@rental/shared-types
@rental/shared-utils
@rental/shared-config

🔄 2.1 Site Migration Strategy (Next.js → Remix)

The migration must follow these principles:

1. Feature parity - All existing pages and functionality preserved
2. Incremental migration - Convert one route/component at a time
3. Shared infrastructure - Both apps use same Cloudflare bindings
4. Consistent patterns - Same auth, data fetching, and styling approach

🔧 3. Root package.json (Workspace Setup)

Cursor MUST generate a root package.json like this:

{
  "name": "rental-mgr",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev:site": "npm run dev --workspace site",
    "dev:ops": "npm run dev --workspace ops",
    "dev": "npm-run-all -p dev:site dev:ops",
    "build": "npm-run-all build:site build:ops",
    "build:site": "npm run build --workspace site",
    "build:ops": "npm run build --workspace ops"
  }
}

🧱 4. Shared Packages – Required Structure

Cursor must scaffold:

packages/shared-types/src/index.ts
packages/shared-utils/src/index.ts
packages/shared-config/src/index.ts

Shared-types must export core domain models:

Property

Tenant

Lead

LeadAIResult

Lease

WorkOrder

ScreeningResult (placeholder)

DocuSignEnvelopeInfo (placeholder)

shared-config must contain:

status enums

route definitions

Zod schemas for API DTOs

shared-utils must contain:

date helpers

income/rent ratio

money formatting

R2 signed URL helper

🔌 5. tsconfig Path Mapping

Cursor must create root tsconfig.json:

{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@rental/shared-types": ["packages/shared-types/src"],
      "@rental/shared-utils": ["packages/shared-utils/src"],
      "@rental/shared-config": ["packages/shared-config/src"]
    }
  }
}


Both Remix (ops) and Next.js (site) tsconfigs must extend this.

⚡ 6. Ops App (Remix + Cloudflare) – Required Setup

Create folder:

apps/ops/


Inside:

Remix Cloudflare template

wrangler.toml with:

D1 binding

KV binding

R2 binding

Mandatory routes:

Route	Method	Description
/api/public/leads	POST	Receive new leads from storefront
/api/leads/:id/files	POST	R2 file metadata register
/api/leads/:id/ai	POST	Trigger AI screening
/api/leads/:id/screening	POST	Placeholder for Certn/SingleKey
/api/leases/:id/send	POST	Placeholder for DocuSign
/api/work-orders	CRUD	Maintenance ops
🏠 7. Site App Migration (Next.js → Remix + Cloudflare Pages)

Cursor must migrate the existing Next.js storefront to Remix + Cloudflare Pages.

7.1 Migration Scope

Pages to migrate:
- `/` - Home page with property listings
- `/properties/[slug]` - Property detail page
- `/thank-you` - Form submission confirmation

Components to migrate:
- ContactForm.tsx - Lead submission form
- Filters.tsx - Property filtering
- ListingCard.tsx - Property card display
- ListingGallery.tsx - Image gallery
- GoogleMap.tsx - Map integration
- PropertyTabs.tsx / HomeTabs.tsx - Tab navigation
- AboutSection.tsx - About content

7.2 Technical Requirements

Remix Configuration:
- Use Cloudflare Pages adapter
- Configure wrangler.toml with D1 binding for property data
- Set up proper meta tags and SEO

Route Structure:
```
app/routes/
├─ _index.tsx          # Home page
├─ properties.$slug.tsx # Property detail
└─ thank-you.tsx       # Confirmation
```

Data Loading:
- Use Remix loaders instead of getServerSideProps/getStaticProps
- Fetch properties from D1 database
- Implement proper caching with Cloudflare

Styling:
- Keep Tailwind CSS configuration
- Migrate global styles to Remix conventions

7.3 API Routes Migration

Convert Next.js API routes to Remix resource routes:
- `/api/properties` → `app/routes/api.properties.tsx`
- `/api/tenant-leads` → `app/routes/api.tenant-leads.tsx`
- `/api/revalidate` → Remove (not needed in Remix)

7.4 Cloudflare Bindings

wrangler.toml for site:
```toml
[[d1_databases]]
binding = "DB"
database_name = "rental-db"
database_id = "YOUR_D1_DATABASE_ID"
```

🤝 8. Linking Site → Ops API

The site must submit leads to the Ops API:

POST https://ops.<domain>/api/public/leads


Payload must follow a Zod schema defined in:

packages/shared-config


No direct DB writes from site - read-only access to properties table.

🪄 9. AI Evaluation Pipeline (Ops)

Cursor must implement:

POST /api/leads/:id/ai


Steps:

Fetch lead + files + property rent

Generate signed URLs from R2

Call OpenAI (Vision + Text)

Expect JSON response:

{
  "score": 0-100,
  "label": "A/B/C/D",
  "summary": "",
  "risk_flags": [],
  "recommendation": "",
  "fraud_signals": [],
  "model_version": "v1"
}


Save into lead_ai_evaluations + leads.ai_score fields

Dashboard sorted by ai_score DESC

📄 10. D1 Schema (Required Tables)

Cursor must implement models for tables:

properties

leads

lead_files

lead_ai_evaluations

tenants

leases

work_orders

Schema definitions live in packages/shared-config (Zod + SQL).

🔐 11. Auth Requirements

Cursor must set up:

KV-backed session storage

Lucia (preferred) or minimal session system

Protect all admin routes under /admin/*

🚀 12. Development Tasks (Cursor Breakdown)
Task 1 — Scaffold monorepo folders

Create apps/site, apps/ops, packages/…

Move existing storefront into apps/site

Task 2 — Create root workspace config

package.json

pnpm-workspace

tsconfig paths

Task 3 — Create shared packages

shared-types: export interfaces

shared-utils: basic helpers

shared-config: enums + Zod schemas

Task 4 — Create Ops app (Remix CF)

Setup Remix + Wrangler

Build necessary API routes

Connect to D1/KV/R2 bindings

Task 5 — Implement lead ingestion

From storefront → Ops

Save lead → Save files metadata

Task 6 — Implement AI pipeline

Build runLeadAI service

Call OpenAI with multimodal

Save results to D1

Task 7 — Admin UI

Remix routes:

/admin/leads

/admin/properties

/admin/tenants

/admin/work-orders

Task 8 — Placeholder APIs

Screening API

DocuSign Lease API

Task 9 — Migrate Site to Remix (Phase 1 - Setup)

Create new Remix + Cloudflare Pages structure in apps/site

Set up wrangler.toml with D1 binding

Configure Tailwind CSS

Create base layout and root component

Task 10 — Migrate Site Pages (Phase 2 - Routes)

Convert home page to Remix route

Migrate property detail page

Migrate thank-you page

Implement loaders for data fetching from D1

Task 11 — Migrate Site Components (Phase 3 - UI)

Convert all React components to work with Remix

Update ContactForm to use Remix Form

Migrate image gallery and maps

Ensure responsive design works

Task 12 — Migrate Site API Routes (Phase 4 - APIs)

Convert /api/properties to Remix resource route

Convert /api/tenant-leads to Remix resource route

Update to fetch from D1 instead of Baserow

Task 13 — Site Testing & Cleanup

Test all routes and functionality

Remove old Next.js files

Update documentation

Verify Cloudflare deployment

🎯 13. Acceptance Criteria

Both site and ops apps deploy to Cloudflare Pages/Workers

Site has full feature parity with original Next.js version

All pages render correctly with proper SEO meta tags

Property listings load from D1 database

Lead form submits to Ops API successfully

Google Maps integration works

Image galleries display correctly

Ops app functions as designed

Monorepo resolves shared imports

AI evaluation works end-to-end

Leads from site appear in Ops dashboard

R2 uploads and D1 records correct

Admin UI usable

Screening & DocuSign placeholders wired

💡 14. Bonus Tasks (Optional)

Add TurboRepo pipeline

Add Prettier/ESLint at root

Automatic migrations for D1

Add basic tenant portal skeleton
