# Worker Migration Guide

## Overview

This guide outlines the migration strategy to consolidate all D1, KV, and R2 operations into the `leaselab-worker` backend service.

## Current Architecture Issues

Based on codebase analysis, we currently have:

1. **apps/ops** - Heavy direct D1/KV/R2 usage (all CRUD operations)
2. **apps/site** - Minimal direct D1 usage (1 route still queries D1 directly)
3. **apps/worker** - Underutilized (only token validation and basic queries)

## Target Architecture

```
┌─────────────┐
│  apps/site  │
│  (Frontend) │──────┐
└─────────────┘      │
                     │    /api/public/*
                     │    (Bearer Token)
                     ▼
              ┌──────────────┐
              │   leaselab-  │
              │    worker    │◄──────┐
              │  (Backend)   │       │
              └──────────────┘       │
                     │               │  /api/ops/*
                     │               │  (Admin Auth)
                     ▼               │
              ┌──────────────┐       │
              │ D1 + KV + R2 │       │
              └──────────────┘       │
                                     │
┌─────────────┐                      │
│  apps/ops   │──────────────────────┘
│  (Admin UI) │
└─────────────┘
```

## API Endpoint Structure

### Public Endpoints (for apps/site)
All requests require `Authorization: Bearer <token>`

- `GET /api/public/properties` - List properties
- `GET /api/public/properties/:id` - Get property details
- `GET /api/public/site-config` - Get site configuration
- `POST /api/public/leads` - Submit lead
- `GET /api/public/images/:id/file` - Get image file (R2)

### Ops Endpoints (for apps/ops admin)
All requests require admin session authentication

- `GET /api/ops/leads` - List leads
- `GET /api/ops/leads/:id` - Get lead details
- `POST /api/ops/leads/:id/ai` - Run AI evaluation (R2 + OpenAI)
- `POST /api/ops/leads/:id/files` - Upload lead files (R2)
- `GET /api/ops/leads/:id/files` - List lead files
- `CRUD /api/ops/properties` - Property management
- `CRUD /api/ops/units` - Unit management
- `CRUD /api/ops/images` - Image management (R2)
- `POST /api/ops/images/upload` - Upload image (R2)
- `GET /api/ops/images/:id/file` - Get image file (R2)
- `CRUD /api/ops/work-orders` - Work order management
- `CRUD /api/ops/tenants` - Tenant management
- `GET /api/ops/users` - User management
- `POST /api/ops/units/:id/assign-tenant` - Assign tenant
- `POST /api/ops/units/:id/remove-tenant` - Remove tenant

## Migration Phases

### Phase 1: Setup Worker Infrastructure ✅ (CURRENT)

**Status**: Basic worker exists with limited endpoints

**Actions Needed**:
- [x] Rename `crud-worker` to `leaselab-worker`
- [ ] Add proper routing structure (Hono or itty-router)
- [ ] Implement authentication middleware (bearer token for /public, session for /ops)
- [ ] Set up CORS headers

### Phase 2: Migrate Public Endpoints (apps/site → worker)

**Current Direct D1 Usage in apps/site**:
- [apps/site/app/routes/api.properties.tsx](../apps/site/app/routes/api.properties.tsx:7) - Direct D1 query

**Migration Steps**:
1. Implement in worker: `GET /api/public/properties`
2. Update [apps/site/app/lib/api-client.ts](../apps/site/app/lib/api-client.ts) to use worker
3. Remove direct D1 binding from [apps/site/wrangler.toml](../apps/site/wrangler.toml)
4. Delete [apps/site/app/routes/api.properties.tsx](../apps/site/app/routes/api.properties.tsx)
5. Delete [apps/site/app/lib/db.server.ts](../apps/site/app/lib/db.server.ts)

**Expected Result**: `apps/site` has NO direct D1/KV/R2 access

### Phase 3: Migrate Ops CRUD Operations (apps/ops → worker)

**High-Priority Routes** (Most commonly used):

#### Properties & Units
- [apps/ops/app/routes/api.properties._index.tsx](../apps/ops/app/routes/api.properties._index.tsx)
- [apps/ops/app/routes/api.properties.$id.tsx](../apps/ops/app/routes/api.properties.$id.tsx)
- [apps/ops/app/routes/api.units._index.tsx](../apps/ops/app/routes/api.units._index.tsx)
- [apps/ops/app/routes/api.units.$id.tsx](../apps/ops/app/routes/api.units.$id.tsx)

#### Images (Heavy R2 Usage)
- [apps/ops/app/routes/api.images._index.tsx](../apps/ops/app/routes/api.images._index.tsx)
- [apps/ops/app/routes/api.images.upload.tsx](../apps/ops/app/routes/api.images.upload.tsx:30) - R2 PUT
- [apps/ops/app/routes/api.images.$id.file.tsx](../apps/ops/app/routes/api.images.$id.file.tsx:55) - R2 GET
- [apps/ops/app/routes/api.images.$id.tsx](../apps/ops/app/routes/api.images.$id.tsx:70) - R2 DELETE

#### Leads & AI
- [apps/ops/app/routes/api.leads.$id.ai.tsx](../apps/ops/app/routes/api.leads.$id.ai.tsx:18) - R2 + OpenAI
- [apps/ops/app/routes/api.leads.$id.files.tsx](../apps/ops/app/routes/api.leads.$id.files.tsx:19) - R2

#### Work Orders & Tenants
- [apps/ops/app/routes/api.work-orders._index.tsx](../apps/ops/app/routes/api.work-orders._index.tsx)
- [apps/ops/app/routes/api.work-orders.$id.tsx](../apps/ops/app/routes/api.work-orders.$id.tsx)
- [apps/ops/app/routes/api.units.$id.assign-tenant.tsx](../apps/ops/app/routes/api.units.$id.assign-tenant.tsx)

**Migration Steps** (per route):
1. Copy business logic from `apps/ops/app/routes/api.*.tsx` to worker
2. Reuse functions from [apps/ops/app/lib/db.server.ts](../apps/ops/app/lib/db.server.ts) (import them)
3. Add `/api/ops/*` route in worker with session auth middleware
4. Update `apps/ops` routes to call worker API instead of direct D1
5. Test admin UI to ensure functionality

### Phase 4: Migrate Admin UI Loaders (apps/ops → worker)

**Admin Routes with Direct D1 Access**:
- [apps/ops/app/routes/admin.leads._index.tsx](../apps/ops/app/routes/admin.leads._index.tsx:13)
- [apps/ops/app/routes/admin.properties._index.tsx](../apps/ops/app/routes/admin.properties._index.tsx)
- [apps/ops/app/routes/admin.properties.new.tsx](../apps/ops/app/routes/admin.properties.new.tsx:13)
- [apps/ops/app/routes/admin.properties.$id._index.tsx](../apps/ops/app/routes/admin.properties.$id._index.tsx)
- [apps/ops/app/routes/admin.units.$id._index.tsx](../apps/ops/app/routes/admin.units.$id._index.tsx:13)
- [apps/ops/app/routes/admin.tenants._index.tsx](../apps/ops/app/routes/admin.tenants._index.tsx:13)
- [apps/ops/app/routes/admin.users._index.tsx](../apps/ops/app/routes/admin.users._index.tsx:10)

**Migration Steps**:
1. Create helper function in `apps/ops/app/lib/worker-client.ts` for authenticated API calls
2. Update admin route loaders to call worker instead of direct D1
3. Pass session cookie/token to worker for authentication

### Phase 5: Handle Authentication (Signed Cookie Sessions)

**Current State**: KV-based sessions in [apps/ops/app/lib/auth.server.ts](../apps/ops/app/lib/auth.server.ts:90-94)

**Decision**: ✅ **Use Signed Cookies (JWT-style) - Eliminate KV entirely**

**Rationale**:
- ✅ **Zero cost** - No KV operations needed
- ✅ **Faster** - No database lookup on every request
- ✅ **Simpler** - No external storage dependency
- ✅ **Stateless** - Perfect for Cloudflare Workers
- ✅ **Secure** - HMAC-SHA256 signed cookies

**Implementation**:

#### 1. Migrate apps/ops to Signed Cookies

See [SESSION_COOKIE_MIGRATION.md](./SESSION_COOKIE_MIGRATION.md) for detailed steps.

**Summary**:
1. Add `SESSION_SECRET` environment variable
2. Replace KV functions with cookie-based functions
3. Update all routes to use `SESSION_SECRET` instead of `SESSION_KV`
4. Remove KV binding from wrangler.toml

#### apps/ops configuration:
```toml
# apps/ops/wrangler.toml
# NO KV binding needed!

[vars]
WORKER_URL = "https://leaselab-worker.yangjeep.workers.dev"
WORKER_INTERNAL_KEY = "set-via-secret"  # Optional: for ops → worker auth
# SESSION_SECRET set via wrangler secret put
```

#### Worker configuration:
```toml
# apps/worker/wrangler.toml
# NO KV binding needed!

[[d1_databases]]
binding = "DB"

[[r2_buckets]]
binding = "FILE_BUCKET"
```

#### Ops → Worker Authentication:

**Option 1**: Trust internal requests (simplest) ⭐ RECOMMENDED
- Worker trusts all requests from ops
- Only validate external requests (public APIs)
- Fastest, no overhead

**Option 2**: Internal API key
- Add `X-Internal-Key` header to ops → worker requests
- Worker validates this key for `/api/ops/*` endpoints
- Simple shared secret

**Option 3**: Pass user context
- Ops validates session, extracts `userId` and `siteId`
- Passes these in request headers to worker
- Worker uses them for authorization checks
- Most granular control

### Phase 6: Remove Direct Bindings

**Final Configuration** (after all migrations complete):

**apps/site/wrangler.toml**:
```toml
# NO D1, KV, or R2 bindings!
# 100% API-driven

[vars]
WORKER_URL = "https://leaselab-worker.yangjeep.workers.dev"
# SITE_API_TOKEN set via wrangler secret put
```

**apps/ops/wrangler.toml**:
```toml
# NO D1, KV, or R2 bindings!
# Sessions use signed cookies (SESSION_SECRET)
# Data access via worker API

[vars]
WORKER_URL = "https://leaselab-worker.yangjeep.workers.dev"
# SESSION_SECRET set via wrangler secret put
# WORKER_INTERNAL_KEY set via wrangler secret put (optional)
```

**apps/worker/wrangler.toml**:
```toml
# D1 and R2 only - NO KV needed!
[[d1_databases]]
binding = "DB"
database_name = "leaselab-db"
database_id = "850dc940-1021-4c48-8d40-0f18992424ac"

[[r2_buckets]]
binding = "FILE_BUCKET"
bucket_name = "leaselab-files"

[vars]
# OPENAI_API_KEY set via wrangler secret put
```

**Summary**:
- ✅ **site**: No bindings (fully API-driven)
- ✅ **ops**: No bindings (signed cookies + worker API)
- ✅ **worker**: D1 + R2 only (all data operations)

## Implementation Details

### Worker Project Structure (with Hono)

```
apps/worker/
├── worker.ts                 # Main entry point with Hono app
├── routes/
│   ├── public.ts            # All /api/public/* routes
│   └── ops.ts               # All /api/ops/* routes
├── middleware/
│   ├── auth.ts              # Bearer token validation for public APIs
│   ├── internal.ts          # Internal auth for ops APIs (optional)
│   └── cors.ts              # CORS headers
└── package.json             # Add hono dependency
```

### Setup Hono

**Install Hono**:
```bash
cd apps/worker
npm install hono
```

**apps/worker/package.json**:
```json
{
  "name": "leaselab-worker",
  "dependencies": {
    "hono": "^4.0.0"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20240903.0",
    "typescript": "^5.5.4"
  }
}
```

### Authentication Flow (with Hono)

**Public Endpoints** (/api/public/*):
```typescript
// middleware/auth.ts
import { validateApiToken } from '../../ops/app/lib/api-auth.server';

export async function authMiddleware(c, next) {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = auth.replace('Bearer ', '');
  const siteId = await validateApiToken(token, c.env.DB);

  if (!siteId) {
    return c.json({ error: 'Invalid token' }, 401);
  }

  c.set('siteId', siteId);
  await next();
}
```

**Ops Endpoints** (/api/ops/*):
```typescript
// middleware/internal.ts
export async function internalAuthMiddleware(c, next) {
  // Option 1: Trust all requests (simplest)
  await next();

  // Option 2: Validate internal key
  const key = c.req.header('X-Internal-Key');
  if (key !== c.env.WORKER_INTERNAL_KEY) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  await next();

  // Option 3: Validate user context from headers
  const userId = c.req.header('X-User-Id');
  const siteId = c.req.header('X-Site-Id');
  if (!userId || !siteId) {
    return c.json({ error: 'Missing user context' }, 401);
  }
  c.set('userId', userId);
  c.set('siteId', siteId);
  await next();
}
```

### Example Hono Worker Implementation

**apps/worker/worker.ts**:
```typescript
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authMiddleware } from './middleware/auth';
import { internalAuthMiddleware } from './middleware/internal';
import { publicRoutes } from './routes/public';
import { opsRoutes } from './routes/ops';

export interface Env {
  DB: D1Database;
  FILE_BUCKET: R2Bucket;
  OPENAI_API_KEY: string;
  WORKER_INTERNAL_KEY?: string;
}

const app = new Hono<{ Bindings: Env }>();

// Global CORS
app.use('*', cors());

// Public API routes (token auth)
app.route('/api/public', publicRoutes);

// Ops API routes (internal auth)
app.route('/api/ops', opsRoutes);

// Health check
app.get('/', (c) => c.json({ status: 'ok', service: 'leaselab-worker' }));

export default app;
```

**apps/worker/routes/public.ts**:
```typescript
import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { getProperties, getPropertyById, createLead } from '../../ops/app/lib/db.server';

const publicRoutes = new Hono();

// Apply auth middleware to all public routes
publicRoutes.use('*', authMiddleware);

// GET /api/public/properties
publicRoutes.get('/properties', async (c) => {
  const siteId = c.get('siteId');
  const city = c.req.query('city');
  const status = c.req.query('status');

  const properties = await getProperties(c.env.DB, siteId, { city, status });
  return c.json({ success: true, data: properties });
});

// GET /api/public/properties/:id
publicRoutes.get('/properties/:id', async (c) => {
  const siteId = c.get('siteId');
  const id = c.req.param('id');

  const property = await getPropertyById(c.env.DB, siteId, id);
  if (!property) {
    return c.json({ error: 'Property not found' }, 404);
  }
  return c.json({ success: true, data: property });
});

// POST /api/public/leads
publicRoutes.post('/leads', async (c) => {
  const siteId = c.get('siteId');
  const body = await c.req.json();

  const lead = await createLead(c.env.DB, siteId, body);
  return c.json({ success: true, data: lead });
});

export { publicRoutes };
```

**apps/worker/routes/ops.ts**:
```typescript
import { Hono } from 'hono';
import { internalAuthMiddleware } from '../middleware/internal';
import { getProperties, createProperty, updateProperty } from '../../ops/app/lib/db.server';

const opsRoutes = new Hono();

// Apply internal auth middleware
opsRoutes.use('*', internalAuthMiddleware);

// GET /api/ops/properties
opsRoutes.get('/properties', async (c) => {
  const siteId = c.req.header('X-Site-Id') || 'default';
  const properties = await getProperties(c.env.DB, siteId);
  return c.json({ success: true, data: properties });
});

// GET /api/ops/properties/:id
opsRoutes.get('/properties/:id', async (c) => {
  const siteId = c.req.header('X-Site-Id') || 'default';
  const id = c.req.param('id');

  const property = await getPropertyById(c.env.DB, siteId, id);
  if (!property) {
    return c.json({ error: 'Property not found' }, 404);
  }
  return c.json({ success: true, data: property });
});

// POST /api/ops/properties (create or update)
opsRoutes.post('/properties', async (c) => {
  const siteId = c.req.header('X-Site-Id') || 'default';
  const body = await c.req.json();

  // If ID provided, update; otherwise create
  if (body.id) {
    const updated = await updateProperty(c.env.DB, siteId, body.id, body);
    return c.json({ success: true, data: updated });
  } else {
    const created = await createProperty(c.env.DB, siteId, body);
    return c.json({ success: true, data: created });
  }
});

export { opsRoutes };
```

### Reusing Existing Code

The worker **imports and reuses** existing functions from `apps/ops`:

**Benefits**:
- ✅ No code duplication
- ✅ Single source of truth for business logic
- ✅ Easier testing and maintenance
- ✅ All db.server.ts functions work as-is

## Testing Strategy

### Phase 2 Testing (Public APIs)
1. Test `apps/site` can fetch properties from worker
2. Test lead submission works
3. Verify token authentication
4. Test CORS headers

### Phase 3 Testing (Ops APIs)
1. Test each CRUD operation via worker
2. Verify admin UI still works
3. Test R2 file uploads/downloads
4. Test AI evaluation pipeline

### Phase 4 Testing (Admin Loaders)
1. Test all admin pages load correctly
2. Verify data mutations work
3. Test session authentication

## Rollback Plan

Each phase can be rolled back independently:

1. Keep old direct D1 routes until worker routes are tested
2. Use feature flags to switch between direct and worker access
3. Monitor error rates in production before removing old code

## Performance Considerations

### Latency
- Direct D1: ~5-20ms
- Worker → D1: +10-30ms (HTTP overhead)
- Mitigation: Use worker in same region as D1

### Caching
- Implement Redis/KV cache in worker for frequently accessed data
- Cache invalidation on mutations

### Rate Limiting
- Add rate limiting per API token
- Prevent abuse of public endpoints

## Security Benefits

1. **No database credentials in frontend apps**
2. **Centralized access control**
3. **Audit logging** (all DB operations in one place)
4. **Token rotation** (easier to manage)
5. **Rate limiting** (per token/user)

## Next Steps

1. Review this migration plan
2. Choose authentication strategy (Option A or B)
3. Set up worker routing framework (Hono recommended)
4. Start with Phase 2 (migrate apps/site)
5. Test thoroughly before proceeding to Phase 3

## Decisions Made ✅

- [x] ✅ **Session strategy**: Signed cookies (JWT-style) - No KV needed!
- [x] ✅ **Routing framework**: Hono
- [x] ✅ **API design**: GET/POST only (no PUT/DELETE/PATCH)
- [x] ✅ **Migration order**: Phase 1 (site public APIs) → Phase 2 (ops APIs)

## Questions to Resolve

- [ ] What's the deployment strategy? (Deploy worker first, then update apps)
- [ ] Do we need backwards compatibility during migration?
- [ ] Should we implement rate limiting from day 1?
- [ ] Which ops → worker auth option? (Option 1: Trust, Option 2: Key, Option 3: Context)
