# Apps/Ops Migration Guide

**Goal**: Migrate `apps/ops` to use `leaselab-worker` API instead of direct D1/R2 access.

## Current Status

- ✅ Worker is deployed and working
- ✅ Worker has `/api/ops/*` endpoints implemented
- ✅ `worker-client.ts` helper created
- ⏳ Ops still uses direct D1/KV/R2 access
- ⏳ Sessions still use KV (should migrate to signed cookies first)

## Prerequisites

**Before migrating ops routes, you MUST**:
1. ✅ Migrate sessions from KV to signed cookies (see SESSION_COOKIE_MIGRATION.md)
2. ✅ Add `WORKER_URL` to ops environment variables
3. ✅ Optionally add `WORKER_INTERNAL_KEY` for internal authentication

## Migration Order

### Step 1: Session Migration (Priority 1)

Follow [SESSION_COOKIE_MIGRATION.md](./SESSION_COOKIE_MIGRATION.md) to migrate from KV to signed cookies.

**Why first?**
- Removes KV dependency
- Simplifies architecture
- No cost for sessions
- Required before removing KV binding

**Estimated time**: 1-2 hours

### Step 2: Add Worker Configuration (Priority 2)

Add worker URL to ops environment:

```toml
# apps/ops/wrangler.toml
[vars]
WORKER_URL = "https://leaselab-worker.yangjeep.workers.dev"
# WORKER_INTERNAL_KEY = "set-via-secret" # Optional

# For local development, add to .dev.vars:
# WORKER_URL=http://localhost:8787
# WORKER_INTERNAL_KEY=your-secret-key # Optional
```

### Step 3: Migrate Admin Routes (Priority 3)

Update admin routes one-by-one to use worker API.

#### Example: admin.properties._index.tsx

**Before** (Direct D1):
```typescript
export async function loader({ request, context }: LoaderFunctionArgs) {
  const db = context.cloudflare.env.DB;
  const siteId = getSiteId(request);
  const properties = await getProperties(db, siteId);
  // ...
}
```

**After** (Worker API):
```typescript
import { fetchPropertiesFromWorker, isWorkerConfigured } from '~/lib/worker-client';

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env;
  const siteId = getSiteId(request);

  // Use worker if configured, fallback to direct D1
  const properties = isWorkerConfigured(env)
    ? await fetchPropertiesFromWorker(env, siteId)
    : await getProperties(env.DB, siteId);
  // ...
}
```

**Gradual Migration Approach**:
- Keep both methods during transition
- Use worker if `WORKER_URL` is configured
- Fallback to direct D1 if not
- Test each route before removing direct access

#### Routes to Migrate (in order)

1. **Read-only routes** (lowest risk):
   - [admin.properties._index.tsx](../apps/ops/app/routes/admin.properties._index.tsx) - List properties
   - [admin.units._index.tsx](../apps/ops/app/routes/admin.units._index.tsx) - List units (if exists)
   - [admin.leads._index.tsx](../apps/ops/app/routes/admin.leads._index.tsx) - List leads
   - [admin.work-orders._index.tsx](../apps/ops/app/routes/admin.work-orders._index.tsx) - List work orders (if exists)

2. **Detail routes**:
   - [admin.properties.$id._index.tsx](../apps/ops/app/routes/admin.properties.$id._index.tsx) - Property details
   - [admin.units.$id._index.tsx](../apps/ops/app/routes/admin.units.$id._index.tsx) - Unit details

3. **Mutation routes** (higher risk):
   - [admin.properties.new.tsx](../apps/ops/app/routes/admin.properties.new.tsx) - Create property
   - Property edit actions
   - Unit assignments
   - Work order creation

### Step 4: Migrate API Routes (Priority 4)

Update `/api/*` routes that ops UI calls via fetch.

**Example**: apps/ops/app/routes/api.properties._index.tsx

**Before**:
```typescript
export async function loader({ request, context }: LoaderFunctionArgs) {
  const db = context.cloudflare.env.DB;
  const siteId = getSiteId(request);
  return json(await getProperties(db, siteId));
}
```

**After**:
```typescript
export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env;
  const siteId = getSiteId(request);

  // Proxy to worker
  const url = `${env.WORKER_URL}/api/ops/properties`;
  const response = await fetch(url, {
    headers: { 'X-Site-Id': siteId },
  });

  return json(await response.json());
}
```

**Or better**: Just delete these routes and update frontend to call worker directly!

### Step 5: Remove Direct Database Access (Priority 5)

Once all routes are migrated and tested:

1. **Update environment types** (apps/ops/env.d.ts):
```typescript
interface Env {
  // Keep only SESSION_SECRET and WORKER_URL
  SESSION_SECRET: string;
  WORKER_URL: string;
  WORKER_INTERNAL_KEY?: string;

  // Remove these:
  // DB: D1Database;
  // FILE_BUCKET: R2Bucket;
}
```

2. **Update wrangler.toml**:
```toml
# Remove D1 and R2 bindings
# Keep only SESSION_SECRET in secrets

[vars]
WORKER_URL = "https://leaselab-worker.yangjeep.workers.dev"
```

3. **Delete unused files**:
```bash
# These are now used only by worker
# Keep db.server.ts as worker imports it
# But ops routes shouldn't import it
```

## Testing Strategy

### Phase 1: Local Testing

```bash
# Start worker locally
cd apps/worker
npx wrangler dev --port 8787 --local

# Start ops locally (with worker URL in .dev.vars)
cd apps/ops
npm run dev

# Test each migrated route:
# 1. Can you load the page?
# 2. Does data display correctly?
# 3. Do mutations work?
# 4. Are errors handled gracefully?
```

### Phase 2: Staging Testing

1. Deploy worker to production
2. Update ops .dev.vars to point to production worker
3. Test locally against production worker
4. Verify all features work

### Phase 3: Production Deployment

1. Set `WORKER_URL` secret for production ops
2. Deploy ops to production
3. Monitor logs for errors
4. Test critical paths (property creation, lead management)

## Rollback Plan

If issues occur:

1. **Keep direct D1 binding during migration**
   - Don't remove bindings until fully tested
   - Fallback code allows reverting to direct access

2. **Revert environment variable**:
```bash
# Remove WORKER_URL to disable worker client
wrangler secret delete WORKER_URL
```

3. **Redeploy previous version**:
```bash
wrangler rollback
```

## Migration Checklist

### Session Migration
- [ ] Generate SESSION_SECRET
- [ ] Update auth.server.ts to use signed cookies
- [ ] Update all routes to use SESSION_SECRET instead of SESSION_KV
- [ ] Test login/logout
- [ ] Remove KV binding from wrangler.toml

### Worker Configuration
- [ ] Add WORKER_URL to .dev.vars
- [ ] Add WORKER_URL to production (wrangler secret put)
- [ ] Optionally add WORKER_INTERNAL_KEY
- [ ] Verify worker is accessible

### Admin Routes Migration
- [ ] Migrate admin.properties._index.tsx
- [ ] Migrate admin.leads._index.tsx
- [ ] Migrate admin.units._index.tsx
- [ ] Migrate detail routes
- [ ] Migrate mutation routes
- [ ] Test all routes

### API Routes Migration
- [ ] Decide: proxy or delete?
- [ ] Update frontend if deleting
- [ ] Test API endpoints

### Cleanup
- [ ] Remove D1 binding from wrangler.toml
- [ ] Remove R2 binding from wrangler.toml
- [ ] Update env.d.ts
- [ ] Remove unused imports
- [ ] Update documentation

## Benefits After Migration

- ✅ **Zero direct database access** from UI layer
- ✅ **Centralized business logic** in worker
- ✅ **Easier to add new frontends** (mobile app, etc.)
- ✅ **Better separation of concerns**
- ✅ **No KV costs** (signed cookies)
- ✅ **Simplified ops deployment**

## Estimated Timeline

| Phase | Time | Description |
|-------|------|-------------|
| Session Migration | 1-2 hours | Migrate KV → signed cookies |
| Worker Config | 15 minutes | Add environment variables |
| Admin Routes (read) | 2-3 hours | Migrate list/detail routes |
| Admin Routes (write) | 2-3 hours | Migrate mutations carefully |
| API Routes | 1 hour | Proxy or delete |
| Testing | 2-4 hours | Thorough testing |
| Cleanup | 30 minutes | Remove bindings, update docs |
| **Total** | **9-14 hours** | Full migration |

**Recommendation**: Do it incrementally over several days, testing each phase thoroughly.

## Questions?

See:
- [SESSION_COOKIE_MIGRATION.md](./SESSION_COOKIE_MIGRATION.md) - Session migration details
- [WORKER_MIGRATION.md](./WORKER_MIGRATION.md) - Overall architecture
- [apps/ops/app/lib/worker-client.ts](../apps/ops/app/lib/worker-client.ts) - Helper functions
