# CI/CD Strategy

## Overview

This document describes the CI/CD strategy for deploying the LeaseLab monorepo applications using GitHub Actions and Cloudflare Wrangler.

## Applications

The monorepo contains three applications:

1. **leaselab-worker** - API worker service
2. **leaselab-ops** - Admin operations app (Cloudflare Pages)
3. **leaselab-site** - Public-facing site (Cloudflare Pages)

## Environments

### Production Environment
- **Trigger**: Push to `main` branch
- **Worker URL**: `https://leaselab-worker.yangjeep.workers.dev`
- **Ops URL**: `https://leaselab-ops.pages.dev`
- **Site URL**: `https://leaselab-site.pages.dev`

### Preview Environment
- **Trigger**: Pull requests to `main` branch
- **Worker URL**: `https://leaselab-worker-preview.yangjeep.workers.dev`
- **Ops URL**: `https://preview-{PR_NUMBER}.leaselab-ops.pages.dev`
- **Site URL**: `https://preview-{PR_NUMBER}.leaselab-site.pages.dev`

## Deployment Strategy

### Deployment Order

1. **Worker** deploys first (both ops and site depend on it)
2. **Ops** deploys second
3. **Site** deploys last (may depend on ops API)

### Production Deployment

Production deployments are triggered automatically when code is pushed to the `main` branch.

**Workflow**: `.github/workflows/deploy-production.yml`

Steps:
1. Run tests across the workspace
2. Deploy worker to production
3. Build and deploy ops to Cloudflare Pages (main branch)
4. Build and deploy site to Cloudflare Pages (main branch)

### Preview Deployment

Preview deployments are triggered automatically when a pull request is opened, synchronized, or reopened.

**Workflow**: `.github/workflows/deploy-preview.yml`

Steps:
1. Run tests across the workspace
2. Deploy worker to preview environment
3. Build and deploy ops to preview branch
4. Build and deploy site to preview branch
5. Comment on PR with preview URLs

## Required Secrets

Configure these secrets in your GitHub repository settings:

- `CLOUDFLARE_API_TOKEN` - Cloudflare API token with permissions for Workers and Pages
- `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare account ID

### Setting Up Secrets

1. Go to repository **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add each required secret

## Cloudflare Resources

### D1 Databases

- **Production**: `leaselab-db`
- **Preview**: `leaselab-db-preview` (you'll need to create this)

### R2 Buckets

- **Production Public**: `leaselab-pub`
- **Production Private**: `leaselab-pri`
- **Preview Public**: `leaselab-pub-preview` (you'll need to create this)
- **Preview Private**: `leaselab-pri-preview` (you'll need to create this)

## Environment-Specific Secrets

Some secrets need to be set per environment using Wrangler CLI:

### For Site (Pages)
```bash
# Production
wrangler pages secret put SITE_API_TOKEN --project-name=leaselab-site
wrangler pages secret put GOOGLE_MAPS_API_KEY --project-name=leaselab-site

# Preview (if needed)
wrangler pages secret put SITE_API_TOKEN --project-name=leaselab-site --env=preview
wrangler pages secret put GOOGLE_MAPS_API_KEY --project-name=leaselab-site --env=preview
```

### For Worker
```bash
# Production
wrangler secret put WORKER_API_SECRET

# Preview
wrangler secret put WORKER_API_SECRET --env preview
```

## Setting Up Preview Resources

Before your first preview deployment, create the preview resources:

### 1. Create Preview D1 Database
```bash
wrangler d1 create leaselab-db-preview
```

This will output a `database_id`. **Important:** Update this ID in both wrangler.toml files:
- `apps/worker/wrangler.toml` - Look for `REPLACE_WITH_PREVIEW_DB_ID` in `[env.preview.d1_databases]`
- `apps/ops/wrangler.toml` - Look for `REPLACE_WITH_PREVIEW_DB_ID` in `[env.preview.d1_databases]`

Replace `REPLACE_WITH_PREVIEW_DB_ID` with the actual database ID from the command output.

### 2. Create Preview R2 Buckets
```bash
wrangler r2 bucket create leaselab-pub-preview
wrangler r2 bucket create leaselab-pri-preview
```

### 3. Migrate Preview Database
```bash
# Apply migrations to preview database
wrangler d1 migrations apply leaselab-db-preview --remote
```

## Manual Deployment

You can also deploy manually using Wrangler CLI:

### Production
```bash
# Worker
cd apps/worker
wrangler deploy --env production

# Ops
cd apps/ops
npm run build
wrangler pages deploy build/client --project-name=leaselab-ops --branch=main

# Site
cd apps/site
npm run build
wrangler pages deploy build/client --project-name=leaselab-site --branch=main
```

### Preview
```bash
# Worker
cd apps/worker
wrangler deploy --env preview

# Ops
cd apps/ops
npm run build
wrangler pages deploy build/client --project-name=leaselab-ops --branch=preview

# Site
cd apps/site
npm run build
wrangler pages deploy build/client --project-name=leaselab-site --branch=preview
```

## Testing Before Merge

When a PR is created:
1. Automated tests run
2. Preview environments are deployed
3. PR comment shows preview URLs
4. Test the preview environments thoroughly
5. Merge PR when ready

Upon merge to `main`:
1. Production deployment automatically triggers
2. All three apps deploy in sequence

## Rollback Strategy

### Quick Rollback
If a production deployment has issues:

1. **Revert the commit** in `main` branch
2. Push the revert (triggers new production deployment)

### Manual Rollback
```bash
# For Worker - use Wrangler rollback
wrangler rollback --env production

# For Pages - redeploy previous version
git checkout <previous-commit>
npm run build
wrangler pages deploy build/client --project-name=leaselab-ops --branch=main
```

## Monitoring

- **Cloudflare Dashboard**: Monitor deployments, logs, and analytics
- **GitHub Actions**: View deployment status and logs
- **Cloudflare Workers Logs**: Real-time logs via Wrangler or dashboard

## Best Practices

1. **Always create PRs** for changes - test in preview first
2. **Review preview deployments** before merging
3. **Monitor production deployments** after merge
4. **Keep secrets up to date** in GitHub and Cloudflare
5. **Test preview resources** periodically to ensure they match production setup
6. **Use semantic commits** for clear deployment history

## Troubleshooting

### Deployment Fails
- Check GitHub Actions logs
- Verify secrets are set correctly
- Ensure Cloudflare resources exist
- Check Wrangler CLI version compatibility

### Preview Not Working
- Verify preview resources (D1, R2) are created
- Check environment configuration in `wrangler.toml`
- Ensure preview secrets are set

### Database Issues
- Run migrations: `wrangler d1 migrations apply <database> --remote`
- Check bindings in `wrangler.toml`
- Verify database IDs match

## Additional Commands

### View Deployments
```bash
# Worker
wrangler deployments list

# Pages
wrangler pages deployment list --project-name=leaselab-ops
wrangler pages deployment list --project-name=leaselab-site
```

### View Logs
```bash
# Worker
wrangler tail

# Worker (specific environment)
wrangler tail --env production
wrangler tail --env preview
```

### Database Queries
```bash
# Production
wrangler d1 execute leaselab-db --remote --command="SELECT * FROM properties LIMIT 5"

# Preview
wrangler d1 execute leaselab-db-preview --remote --command="SELECT * FROM properties LIMIT 5"
```
