# LeaseLab Architecture Summary

**Last Updated**: 2025-11-25

## 🎯 Final Target Architecture

```
┌─────────────┐                                    ┌─────────────┐
│  apps/site  │         /api/public/*              │  apps/ops   │
│  (Frontend) │──────────(Bearer Token)───────┐    │  (Admin UI) │
│             │                               │    │             │
│  NO BINDINGS│                               │    │ NO BINDINGS │
│  100% API   │                               │    │ Signed      │
│             │                               │    │ Cookies     │
└─────────────┘                               │    └─────────────┘
                                              │            │
                                              ▼            │
                                       ┌──────────────┐    │
                                       │   leaselab-  │    │
                                       │    worker    │◄───┤
                                       │  (Backend)   │    │ /api/ops/*
                                       └──────────────┘    │
                                              │            │
                                              ▼            │
                                       ┌──────────────┐    │
                                       │ D1 Database  │    │
                                       │  R2 Files    │    │
                                       └────────────── ┘    │
```

## 📦 App Responsibilities

### apps/site (Public Storefront)
- **Purpose**: Display property listings, accept tenant applications
- **Framework**: Remix + Cloudflare Pages
- **Bindings**: NONE (100% API-driven)
- **Authentication**: Bearer token (`SITE_API_TOKEN`)
- **APIs Used**: `/api/public/*` on worker
- **Environment Variables**:
  - `WORKER_URL` - Worker API endpoint
  - `SITE_API_TOKEN` - Bearer token (secret)

### apps/ops (Admin Dashboard)
- **Purpose**: Admin UI for property/tenant/lead management
- **Framework**: Remix + Cloudflare Pages
- **Bindings**: NONE (sessions use signed cookies)
- **Authentication**: Signed cookies (HMAC-SHA256)
- **APIs Used**: `/api/ops/*` on worker
- **Environment Variables**:
  - `WORKER_URL` - Worker API endpoint
  - `SESSION_SECRET` - Cookie signing key (secret)
  - `WORKER_INTERNAL_KEY` - Optional ops→worker auth (secret)

### apps/worker (Backend API)
- **Purpose**: All database, storage, and business logic operations
- **Framework**: Cloudflare Workers + Hono
- **Bindings**: D1 (database) + R2 (storage)
- **Authentication**:
  - Public APIs: Bearer token validation
  - Ops APIs: Internal auth (trust/key/context)
- **APIs Provided**:
  - `/api/public/*` - For apps/site
  - `/api/ops/*` - For apps/ops
- **Environment Variables**:
  - `OPENAI_API_KEY` - For AI evaluation (secret)

## 🔐 Authentication Architecture

### Public API (apps/site → worker)
```
1. Site has SITE_API_TOKEN (64-char hex)
2. Site sends: Authorization: Bearer <token>
3. Worker validates token against site_api_tokens table (D1)
4. Worker extracts siteId, returns data for that site only
```

### Admin UI (apps/ops users)
```
1. User logs in with email/password
2. Ops validates credentials (D1 lookup)
3. Ops creates signed cookie: { userId, siteId, expiresAt }
4. Ops signs with HMAC-SHA256 using SESSION_SECRET
5. Cookie set: HttpOnly, Secure, SameSite=Lax, 7-day expiry
6. Every request: Ops verifies signature, extracts userId/siteId
7. NO KV LOOKUP NEEDED - Everything in cookie!
```

### Ops API (apps/ops → worker)
```
Option 1: Trust (recommended)
- Worker trusts all requests from ops
- No authentication needed

Option 2: Internal key
- Ops sends: X-Internal-Key: <shared secret>
- Worker validates against WORKER_INTERNAL_KEY

Option 3: User context
- Ops sends: X-User-Id, X-Site-Id headers
- Worker uses for authorization
```

## 🗄️ Data Storage

### D1 Database (leaselab-db)
**Owned by**: `apps/worker`
**Tables**:
- `properties` - Property listings
- `units` - Individual rental units
- `images` - Image metadata (files in R2)
- `leads` - Tenant applications
- `lead_files` - Lead document metadata
- `lead_ai_evaluations` - AI screening results
- `tenants` - Tenant records
- `leases` - Lease agreements
- `work_orders` - Maintenance requests
- `users` - Admin users
- `user_access` - Multi-tenant access control
- `site_api_tokens` - API authentication tokens
- `site_configs` - Site branding/configuration

### R2 Storage (leaselab-files)
**Owned by**: `apps/worker`
**Key Patterns**:
- `leads/{leadId}/{uniqueId}/{fileName}` - Lead documents
- `{siteId}/property/{propertyId}/{timestamp}-{filename}` - Property images
- `{siteId}/unit/{unitId}/{timestamp}-{filename}` - Unit images

### KV Namespace
**Status**: ❌ REMOVED (was used for sessions)
**Replacement**: Signed cookies with SESSION_SECRET

## 🚀 Deployment Configuration

### apps/site/wrangler.toml
```toml
name = "leaselab-site"
pages_build_output_dir = "./build/client"

# NO bindings!

[vars]
WORKER_URL = "https://leaselab-worker.yangjeep.workers.dev"
# SITE_API_TOKEN set via: wrangler pages secret put SITE_API_TOKEN
```

### apps/ops/wrangler.toml
```toml
name = "leaselab-ops"
pages_build_output_dir = "./build/client"

# NO bindings!

[vars]
WORKER_URL = "https://leaselab-worker.yangjeep.workers.dev"
# SESSION_SECRET set via: wrangler secret put SESSION_SECRET
# WORKER_INTERNAL_KEY set via: wrangler secret put WORKER_INTERNAL_KEY
```

### apps/worker/wrangler.toml
```toml
name = "leaselab-worker"
main = "worker.ts"

[[d1_databases]]
binding = "DB"
database_name = "leaselab-db"
database_id = "850dc940-1021-4c48-8d40-0f18992424ac"

[[r2_buckets]]
binding = "FILE_BUCKET"
bucket_name = "leaselab-files"

[vars]
# OPENAI_API_KEY set via: wrangler secret put OPENAI_API_KEY
```

## 📡 API Endpoints

### Public APIs (/api/public/*)
**Used by**: apps/site
**Auth**: Bearer token

- `GET /api/public/properties` - List properties (with filters)
- `GET /api/public/properties/:id` - Get property details
- `GET /api/public/site-config` - Get site branding/config
- `POST /api/public/leads` - Submit tenant application

### Ops APIs (/api/ops/*)
**Used by**: apps/ops
**Auth**: Internal (trust/key/context)

**Properties**:
- `GET /api/ops/properties` - List properties
- `GET /api/ops/properties/:id` - Get property
- `POST /api/ops/properties` - Create/update property

**Units**:
- `GET /api/ops/units` - List units
- `GET /api/ops/units/:id` - Get unit
- `POST /api/ops/units` - Create/update unit
- `POST /api/ops/units/:id/assign-tenant` - Assign tenant
- `POST /api/ops/units/:id/remove-tenant` - Remove tenant

**Images** (R2):
- `GET /api/ops/images` - List images
- `POST /api/ops/images/upload` - Upload to R2
- `GET /api/ops/images/:id/file` - Download from R2
- `POST /api/ops/images/:id` - Update metadata

**Leads**:
- `GET /api/ops/leads` - List leads
- `GET /api/ops/leads/:id` - Get lead
- `POST /api/ops/leads/:id/ai` - Run AI evaluation (R2 + OpenAI)
- `POST /api/ops/leads/:id/files` - Upload lead files (R2)

**Work Orders**:
- `GET /api/ops/work-orders` - List work orders
- `POST /api/ops/work-orders` - Create/update work order

**Note**: All operations use GET (read) and POST (write) only.

## 🔄 Migration Status

| Phase | Status | Description |
|-------|--------|-------------|
| **Setup** | ✅ Complete | Worker renamed to `leaselab-worker` |
| **Session Migration** | ✅ Ready | Signed cookie implementation created |
| **Phase 1** | ⏳ Pending | Migrate site public APIs to worker |
| **Phase 2** | ⏳ Pending | Migrate ops CRUD APIs to worker |
| **Phase 3** | ⏳ Pending | Migrate admin UI loaders to worker |
| **Phase 4** | ⏳ Pending | Remove all direct D1/R2 bindings |

## 📚 Documentation

- [WORKER_MIGRATION.md](./WORKER_MIGRATION.md) - Complete migration plan
- [SESSION_COOKIE_MIGRATION.md](./SESSION_COOKIE_MIGRATION.md) - KV → Signed cookies
- [BACKEND_API.md](./BACKEND_API.md) - API documentation
- [CODEBASE_ANALYSIS.md](./CODEBASE_ANALYSIS.md) - Current state analysis

## 💡 Key Benefits

### Before (Current)
- ❌ apps/site has direct D1 access (security risk)
- ❌ apps/ops has direct D1/R2 access (tight coupling)
- ❌ KV costs for sessions (~$0.50+/month)
- ❌ Complex binding management

### After (Target)
- ✅ Zero direct database access from UI apps
- ✅ Clean API boundaries
- ✅ Zero KV costs (signed cookies)
- ✅ Centralized data operations
- ✅ Multi-tenant by design
- ✅ Easy to add new frontends

## 🎯 Next Steps

1. **Migrate sessions** to signed cookies (see SESSION_COOKIE_MIGRATION.md)
2. **Set up Hono** in worker (add dependency, create routes)
3. **Implement Phase 1** (site public APIs)
4. **Test thoroughly** before proceeding
5. **Implement Phase 2** (ops APIs)
6. **Remove bindings** from site and ops

---

**Questions?** See the detailed guides in `/docs` folder.
