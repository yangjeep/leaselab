# LeaseLab Codebase Analysis

**Generated**: 2025-11-25
**Purpose**: Comprehensive analysis of D1, KV, and R2 usage across the monorepo

---

## Executive Summary

The LeaseLab monorepo consists of three main applications:

1. **apps/site** - Public storefront (Remix + Cloudflare Pages)
2. **apps/ops** - Admin backend (Remix + Cloudflare Pages)
3. **apps/worker** - API backend (Cloudflare Workers) - **formerly crud-worker, now leaselab-worker**

**Current State**:
- **apps/ops**: Heavy direct D1/KV/R2 usage (74+ routes with direct bindings)
- **apps/site**: Minimal direct usage (1 route with D1, rest use HTTP APIs)
- **apps/worker**: Underutilized (only 4 basic endpoints)

**Target State** (see [WORKER_MIGRATION.md](./WORKER_MIGRATION.md)):
- All D1/KV/R2 operations consolidated in `leaselab-worker`
- Both `apps/site` and `apps/ops` access data via HTTP APIs only
- Clear separation: UI apps handle presentation, worker handles data

---

## Shared Cloudflare Resources

All three apps currently share the same bindings:

### D1 Database
- **Binding**: `DB`
- **Name**: `leaselab-db`
- **ID**: `850dc940-1021-4c48-8d40-0f18992424ac`

### KV Namespace
- **Binding**: `SESSION_SECRET` (signed cookies)
- **Name**: Sessions storage
- **ID**: `a020a8412719406db3fc3066dc298981`
- **Usage**: User sessions (7-day TTL)

### R2 Bucket
- **Binding**: `FILE_BUCKET`
- **Name**: `leaselab-files`
- **Usage**: Property images, lead documents, AI analysis files

---

## Database Tables (D1)

Based on code analysis, these tables are actively used:

1. **leads** - Lead submissions from site
2. **lead_files** - File metadata for lead documents
3. **lead_ai_evaluations** - AI screening results
4. **properties** - Property listings
5. **units** - Individual units within properties
6. **unit_history** - Tenant assignment history
7. **images** - Property and unit images (metadata only)
8. **work_orders** - Maintenance requests
9. **tenants** - Tenant records
10. **users** - Admin/ops users
11. **user_access** - Multi-tenant access control
12. **site_api_tokens** - API authentication tokens
13. **site_configs** - Site-specific branding and configuration

---

## Apps/Site - Public Storefront

### Current Bindings
```toml
# apps/site/wrangler.toml
[[d1_databases]]
binding = "DB"  # ⚠️ Should be removed after migration

[[kv_namespaces]]
binding = "SESSION_SECRET"

[[r2_buckets]]
binding = "FILE_BUCKET"  # ⚠️ Not used, should be removed
```

### Environment Variables
```toml
WORKER_URL = "https://leaselab-worker.yangjeep.workers.dev"  # ✅ Primary API
OPS_API_URL = "https://leaselab-ops.pages.dev"  # Fallback
SITE_API_TOKEN = "set-via-secret"  # Bearer token for worker
```

### Direct D1 Usage (TO BE REMOVED)

**Only 1 route with direct D1 access**:

| File | Line | Operation |
|------|------|-----------|
| [apps/site/app/routes/api.properties.tsx](../apps/site/app/routes/api.properties.tsx) | 7 | Direct D1 query via `getListings()` |

**Action**: Migrate this route to use worker API, then remove D1 binding.

### Files to Delete After Migration

1. [apps/site/app/lib/db.server.ts](../apps/site/app/lib/db.server.ts) - Direct D1 queries
2. [apps/site/app/routes/api.properties.tsx](../apps/site/app/routes/api.properties.tsx) - Old API route

### Current API Client

[apps/site/app/lib/api-client.ts](../apps/site/app/lib/api-client.ts) already uses worker:
- `fetchProperties()` → `GET /api/public/properties`
- `fetchPropertyById()` → `GET /api/public/properties/:id`
- `fetchSiteConfig()` → `GET /api/public/site-config`
- `submitApplication()` → `POST /api/public/leads`

✅ **This is the pattern to follow for all site data access**

---

## Apps/Ops - Admin Backend

### Current Bindings
```toml
# apps/ops/wrangler.toml
[[d1_databases]]
binding = "DB"  # ⚠️ Heavy usage, needs migration

[[kv_namespaces]]
binding = "SESSION_SECRET"  # ✅ Sessions via signed cookies

[[r2_buckets]]
binding = "FILE_BUCKET"  # ⚠️ Heavy usage, needs migration
```

### Core Server Libraries

All these files have direct binding access:

| File | D1 | KV | R2 | Notes |
|------|----|----|-------|-------|
| [apps/ops/app/lib/db.server.ts](../apps/ops/app/lib/db.server.ts) | ✅ | ❌ | ❌ | 40+ database functions |
| [apps/ops/app/lib/auth.server.ts](../apps/ops/app/lib/auth.server.ts) | ✅ | ✅ | ❌ | Session management |
| [apps/ops/app/lib/files.server.ts](../apps/ops/app/lib/files.server.ts) | ❌ | ❌ | ✅ | R2 abstraction layer |
| [apps/ops/app/lib/ai.server.ts](../apps/ops/app/lib/ai.server.ts) | ❌ | ❌ | ✅ | AI evaluation pipeline |
| [apps/ops/app/lib/api-auth.server.ts](../apps/ops/app/lib/api-auth.server.ts) | ✅ | ❌ | ❌ | Token validation |

### Admin Routes (Direct D1 Access)

**15+ admin UI routes with direct database queries**:

| Route | D1 | Operations |
|-------|----|-----------|
| [admin.leads._index.tsx](../apps/ops/app/routes/admin.leads._index.tsx) | ✅ | `getLeads()` |
| [admin.properties._index.tsx](../apps/ops/app/routes/admin.properties._index.tsx) | ✅ | `getProperties()` |
| [admin.properties.new.tsx](../apps/ops/app/routes/admin.properties.new.tsx) | ✅ | `createProperty()` |
| [admin.properties.$id._index.tsx](../apps/ops/app/routes/admin.properties.$id._index.tsx) | ✅ | `getPropertyWithUnits()` |
| [admin.properties.$id.images.tsx](../apps/ops/app/routes/admin.properties.$id.images.tsx) | ✅ | `getImagesByEntity()` |
| [admin.units.$id._index.tsx](../apps/ops/app/routes/admin.units.$id._index.tsx) | ✅ | `getUnitWithDetails()`, `updateUnit()` |
| [admin.tenants._index.tsx](../apps/ops/app/routes/admin.tenants._index.tsx) | ✅ | `getTenants()` |
| [admin.users._index.tsx](../apps/ops/app/routes/admin.users._index.tsx) | ✅ | `getUsers()` |

**Action**: Update loaders to call worker API instead of direct D1.

### API Routes (Direct D1/R2 Access)

**30+ API routes with direct binding usage**:

#### Properties & Units (D1 Heavy)
| Route | Methods | D1 | R2 |
|-------|---------|----|----|
| [api.properties._index.tsx](../apps/ops/app/routes/api.properties._index.tsx) | GET, POST | ✅ | ❌ |
| [api.properties.$id.tsx](../apps/ops/app/routes/api.properties.$id.tsx) | GET, POST | ✅ | ❌ |
| [api.units._index.tsx](../apps/ops/app/routes/api.units._index.tsx) | GET, POST | ✅ | ❌ |
| [api.units.$id.tsx](../apps/ops/app/routes/api.units.$id.tsx) | GET, POST | ✅ | ❌ |
| [api.units.$id.assign-tenant.tsx](../apps/ops/app/routes/api.units.$id.assign-tenant.tsx) | POST | ✅ | ❌ |
| [api.units.$id.remove-tenant.tsx](../apps/ops/app/routes/api.units.$id.remove-tenant.tsx) | POST | ✅ | ❌ |
| [api.units.$id.history.tsx](../apps/ops/app/routes/api.units.$id.history.tsx) | GET | ✅ | ❌ |

#### Images (R2 Heavy)
| Route | Methods | D1 | R2 | R2 Operation |
|-------|---------|----|----|--------------|
| [api.images._index.tsx](../apps/ops/app/routes/api.images._index.tsx) | GET, POST | ✅ | ✅ | Read metadata |
| [api.images.upload.tsx](../apps/ops/app/routes/api.images.upload.tsx) | POST | ✅ | ✅ | `bucket.put()` - Line 30 |
| [api.images.$id.tsx](../apps/ops/app/routes/api.images.$id.tsx) | GET, POST | ✅ | ✅ | `bucket.delete()` - Line 70 |
| [api.images.$id.file.tsx](../apps/ops/app/routes/api.images.$id.file.tsx) | GET | ✅ | ✅ | `bucket.get()` - Line 55 |
| [api.images.presign.tsx](../apps/ops/app/routes/api.images.presign.tsx) | POST | ❌ | ✅ | Generate upload URL |
| [api.images.reorder.tsx](../apps/ops/app/routes/api.images.reorder.tsx) | POST | ✅ | ❌ | Update sort order |

#### Leads & AI (D1 + R2)
| Route | Methods | D1 | R2 | Notes |
|-------|---------|----|----|-------|
| [api.leads.$id.ai.tsx](../apps/ops/app/routes/api.leads.$id.ai.tsx) | POST | ✅ | ✅ | AI evaluation + R2 file access |
| [api.leads.$id.files.tsx](../apps/ops/app/routes/api.leads.$id.files.tsx) | POST | ✅ | ✅ | File metadata registration |
| [api.leads.$id.screening.tsx](../apps/ops/app/routes/api.leads.$id.screening.tsx) | POST | ✅ | ❌ | Placeholder for Certn |

#### Work Orders & Tenants
| Route | Methods | D1 | R2 |
|-------|---------|----|----|
| [api.work-orders._index.tsx](../apps/ops/app/routes/api.work-orders._index.tsx) | GET, POST | ✅ | ❌ |
| [api.work-orders.$id.tsx](../apps/ops/app/routes/api.work-orders.$id.tsx) | GET, POST | ✅ | ❌ |

#### Public APIs (Token Auth)
| Route | Methods | D1 | R2 | Notes |
|-------|---------|----|----|-------|
| [api.public.leads.tsx](../apps/ops/app/routes/api.public.leads.tsx) | POST | ✅ | ❌ | Lead submission |
| [api.public.properties._index.tsx](../apps/ops/app/routes/api.public.properties._index.tsx) | GET | ✅ | ❌ | Property listings |
| [api.public.properties.$id.tsx](../apps/ops/app/routes/api.public.properties.$id.tsx) | GET | ✅ | ❌ | Property details |
| [api.public.site-config.tsx](../apps/ops/app/routes/api.public.site-config.tsx) | GET | ✅ | ❌ | Site configuration |

#### Session/Auth Routes (KV Heavy)
| Route | Methods | KV | Notes |
|-------|---------|-------|-------|
| [login.tsx](../apps/ops/app/routes/login.tsx) | POST | ✅ | `createSession()` |
| [logout.tsx](../apps/ops/app/routes/logout.tsx) | POST | ✅ | `deleteSession()` |
| [api.site.switch.tsx](../apps/ops/app/routes/api.site.switch.tsx) | POST | ✅ | Multi-site switching |
| [api.user.update-password.tsx](../apps/ops/app/routes/api.user.update-password.tsx) | POST | ✅ | Password update |

---

## Apps/Worker - API Backend

### Current Implementation

**File**: [apps/worker/worker.ts](../apps/worker/worker.ts)

**Bindings**: D1, KV, R2 (all configured but KV/R2 unused)

**Current Routes** (only 4):
1. `GET /properties` → `getProperties(env.DB, siteId)`
2. `GET /properties/:id` → `getPropertyById(env.DB, siteId, id)`
3. `POST /properties` → Placeholder
4. `POST /leads` → `createLead(env.DB, siteId, body)`

**Authentication**: Bearer token validated via `validateApiToken(token, env.DB)`

**Code Reuse**: Imports functions from `apps/ops/app/lib/*`

### Issues with Current Worker

1. **No routing framework** - Manual URL parsing
2. **Limited endpoints** - Only 4 routes implemented
3. **No /api/ops/* endpoints** - Only public APIs
4. **No R2 support** - Binding configured but unused
5. **No error handling** - Basic try/catch only

### Recommended Enhancements

1. **Add routing framework**: Hono or itty-router
2. **Implement all /api/public/* endpoints**
3. **Implement all /api/ops/* endpoints**
4. **Add middleware**: CORS, auth, logging
5. **Add R2 routes**: Image upload/download, lead files

---

## R2 Key Patterns

Based on code analysis:

| Pattern | Example | Used By |
|---------|---------|---------|
| Lead files | `leads/${leadId}/${uniqueId}/${fileName}` | [api.leads.$id.files.tsx](../apps/ops/app/routes/api.leads.$id.files.tsx) |
| Property images | `${siteId}/property/${propertyId}/${timestamp}-${filename}` | Image upload routes |
| Unit images | `${siteId}/unit/${unitId}/${timestamp}-${filename}` | Image upload routes |

---

## KV Keys

Based on [apps/ops/app/lib/auth.server.ts](../apps/ops/app/lib/auth.server.ts):

| Pattern | TTL | Data |
|---------|-----|------|
| `session:${sessionId}` | 7 days | `{ userId: string, expiresAt: string }` |

---

## Migration Priority

### Phase 1: Site Public APIs ⭐ HIGH PRIORITY
1. Migrate [apps/site/app/routes/api.properties.tsx](../apps/site/app/routes/api.properties.tsx) to worker
2. Remove D1/KV/R2 bindings from [apps/site/wrangler.toml](../apps/site/wrangler.toml)
3. Delete [apps/site/app/lib/db.server.ts](../apps/site/app/lib/db.server.ts)

**Impact**: Site becomes fully API-based, no direct database access

### Phase 2: Ops API Routes ⭐⭐ MEDIUM PRIORITY
1. Migrate property/unit CRUD to worker
2. Migrate image upload/download (R2) to worker
3. Update [apps/ops API routes](../apps/ops/app/routes/) to call worker

**Impact**: Ops backend becomes API client, most D1/R2 moved to worker

### Phase 3: Admin UI Loaders ⭐⭐⭐ LOW PRIORITY
1. Create [apps/ops/app/lib/worker-client.ts](../apps/ops/app/lib/worker-client.ts)
2. Update admin route loaders to call worker
3. Remove D1/R2 bindings from [apps/ops/wrangler.toml](../apps/ops/wrangler.toml)

**Impact**: Ops app fully decoupled from database

### Phase 4: Session Management (TBD)
- **Option A**: Keep KV sessions in ops (simpler)
- **Option B**: Move sessions to worker (cleaner)

See [WORKER_MIGRATION.md](./WORKER_MIGRATION.md) for detailed plan.

---

## Key Files Reference

### Configuration
- [apps/site/wrangler.toml](../apps/site/wrangler.toml) - Site Cloudflare config
- [apps/ops/wrangler.toml](../apps/ops/wrangler.toml) - Ops Cloudflare config
- [apps/worker/wrangler.toml](../apps/worker/wrangler.toml) - Worker Cloudflare config

### Core Libraries (apps/ops)
- [app/lib/db.server.ts](../apps/ops/app/lib/db.server.ts) - 40+ database functions
- [app/lib/auth.server.ts](../apps/ops/app/lib/auth.server.ts) - Session management
- [app/lib/files.server.ts](../apps/ops/app/lib/files.server.ts) - R2 abstraction
- [app/lib/ai.server.ts](../apps/ops/app/lib/ai.server.ts) - AI evaluation
- [app/lib/api-auth.server.ts](../apps/ops/app/lib/api-auth.server.ts) - Token validation
- [app/lib/storage.server.ts](../apps/ops/app/lib/storage.server.ts) - Storage abstraction

### API Clients
- [apps/site/app/lib/api-client.ts](../apps/site/app/lib/api-client.ts) - Site → Worker/Ops
- [apps/worker/worker.ts](../apps/worker/worker.ts) - Worker implementation

---

## Next Steps

1. ✅ **Rename worker**: `crud-worker` → `leaselab-worker`
2. ✅ **Document architecture**: Create WORKER_MIGRATION.md
3. ⏳ **Choose routing framework**: Hono vs itty-router
4. ⏳ **Implement Phase 1**: Migrate site public APIs
5. ⏳ **Test thoroughly**: Ensure no regressions
6. ⏳ **Implement Phase 2**: Migrate ops APIs
7. ⏳ **Remove bindings**: Clean up wrangler.toml files

---

## Questions to Resolve

- [ ] Use Hono or itty-router for worker routing?
- [ ] Keep KV sessions in ops (Option A) or move to worker (Option B)?
- [ ] Implement all endpoints at once or incrementally?
- [ ] How to handle authentication for /api/ops/* endpoints?
- [ ] Should we implement rate limiting from day 1?
- [ ] Do we need backwards compatibility during migration?

---

**For detailed migration steps, see [WORKER_MIGRATION.md](./WORKER_MIGRATION.md)**
