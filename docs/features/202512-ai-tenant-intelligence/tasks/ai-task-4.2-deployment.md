# Task 4.2: Deployment & Verification

**Estimated Time**: 45 minutes  
**Dependencies**: All backend + frontend tasks complete  
**Artifacts**: `apps/worker/`, `apps/ai-cron/`, `apps/ops/` deployments, Cloudflare env configuration

---

## Objective

Deploy the CRUD worker, cron worker, and Ops dashboard updates to production, ensuring AI Tenant Intelligence is fully operational end-to-end.

---

## Preflight Checklist

1. ✅ `npm run lint` + `npm run test` (or `pnpm`) pass for workspace.
2. ✅ Database migrations applied in preview + production D1 instances (`ai_evaluation_*`, fingerprint tables, settings fields).
3. ✅ Wrangler environments configured with secrets:
   - `AI` binding (Workers AI token)
   - `R2_PRIVATE` bucket credentials
   - `AI_WORKFLOW` (if using workflows for fallback)
4. ✅ Cron trigger schedule defined (`0 * * * *`).
5. ✅ Ops dashboard `.env` has `AI_FEATURE_FLAG=1`.

---

## Steps

### 1. Deploy CRUD Worker

```bash
cd apps/worker
npm run build
npx wrangler deploy --env production
```

- Verify D1 migrations reference set (`wrangler d1 migrations list`).
- Tail logs to confirm no errors: `npx wrangler tail --env production`.

### 2. Deploy Cron Worker

```bash
cd apps/ai-cron
npm run build
npx wrangler deploy --env production
```

- Confirm cron schedules exist via `wrangler cron triggers list`.
- Run manual invocation in preview to sanity-check: `npx wrangler dev --test-scheduled` (should process pending jobs without errors).

### 3. Deploy Ops Frontend

```bash
cd apps/ops
npm run build
npm run deploy   # or wrangler pages deploy, depending on hosting
```

- Ensure environment variables include API base URLs + feature flags.
- After deploy, purge Cloudflare cache if using Pages (`wrangler pages deployment tail`).

### 4. Smoke Test

1. Navigate to production Ops dashboard, open tenant record, ensure AI pane loads.
2. Trigger evaluation; verify job creation logs appear in worker + cron finishes run.
3. Check D1 tables for new evaluation row + audit entry.
4. Confirm quota tab increments usage count and resets correctly on new month boundary (manually adjust `ai_evaluation_usage` if necessary).
5. Test settings update from Ops UI; inspect D1 `sites` row for updated flags.

### 5. Monitoring Hooks

- Add alerts to Cloudflare Logs for `QuotaExceeded`, `DuplicateDocuments`, and `ModelTimeout` spikes.
- Ensure Sentry/Datadog instrumentation captures UI errors inside AI pane.

---

## Rollback Plan

- Revert Ops deployment via hosting provider (previous build ID).
- Re-deploy previous worker/cron versions using `wrangler deploy --message "rollback" --env production --config wrangler.previous.toml` if necessary.
- Restore D1 backup snapshot (created before migrations) if schema changes broke production.

---

## Deliverables

- Production environment running latest worker + cron + Ops UI.
- Documented smoke-test results (paste links/screenshots in release ticket).
- Monitoring + alerting configured for AI evaluation flow.
