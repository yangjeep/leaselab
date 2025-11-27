# Plan: Remove Direct D1 Access from Ops App

The Ops app currently has 48 route files making direct D1 database calls through `apps/ops/app/lib/db.server.ts`. We'll migrate all database operations to go through the Worker API at `leaselab-worker.yangjeep.workers.dev` (production) and `leaselab-worker-preview.yangjeep.workers.dev` (preview), using the existing `X-Internal-Key` authentication.

## Steps

1. **Add Worker configuration** to `apps/ops/wrangler.toml` by setting `WORKER_URL` and `WORKER_INTERNAL_KEY` in `[vars]`, `[env.preview.vars]`, and `[env.production.vars]` sections, using the production/preview worker URLs you specified.

2. **Extend Worker API endpoints** in `apps/worker/routes/api/ops/` to add missing operations: tenant CRUD (`tenants.ts`), user management (`users.ts`), image operations (`images/presign.ts`, `images/upload.ts`, `images/reorder.ts`), lead file uploads (`leads/files.ts`), AI evaluation (`leads/ai-evaluate.ts`), site switching (`users/switch-site.ts`), and financial queries (`reports.ts`).

3. **Expand `apps/ops/app/lib/worker-client.ts`** to add client functions for all new Worker endpoints, following the existing pattern with `workerFetch()`, `parseResponse()`, and proper error handling.

4. **Update all 48 route files** in `apps/ops/app/routes/` to replace `context.cloudflare.env.DB` access and `db.server.ts` function calls with `worker-client.ts` function calls, ensuring all loaders and actions use the Worker API.

5. **Migrate R2 operations** by creating Worker endpoints for image/file serving, presigned URL generation, and uploads, then updating routes that currently access `env.PUBLIC_BUCKET` and `env.PRIVATE_BUCKET` directly (`api.images.*`, `api.leads.$id.files.*`).

6. **Remove D1 and R2 bindings** from `apps/ops/wrangler.toml` (delete `[[d1_databases]]` and `[[r2_buckets]]` sections from all three environments) and update `apps/ops/worker-entry.ts` or environment type definitions to remove `DB`, `PUBLIC_BUCKET`, and `PRIVATE_BUCKET` from the `Env` interface.

## Further Considerations

1. **Development environment** - For local development, should `WORKER_URL` point to `http://localhost:8788` when running the worker locally, or always use the preview/production worker URLs?

2. **Performance impact** - Network latency from Ops→Worker API calls will be higher than direct D1 access; consider if any high-frequency operations need batching or caching strategies.

3. **Rollback strategy** - Should we keep `apps/ops/app/lib/db.server.ts` in the codebase temporarily (just unused) for easy rollback, or delete it immediately after migration is complete?

## Configuration Details

### Worker URL Configuration
- **Production**: `https://leaselab-worker.yangjeep.workers.dev`
- **Preview**: `https://leaselab-worker-preview.yangjeep.workers.dev`

### Authentication Strategy
- Use existing `X-Internal-Key` header approach for Ops→Worker communication
- No changes needed to current internal auth mechanism

### Error Handling & Retries
- Keep current simple error handling without retry logic
- Rely on Remix error boundaries for user-facing errors
