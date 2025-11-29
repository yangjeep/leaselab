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
- **Trigger**: Release creation (when a release is published on GitHub)
- **Worker URL**: `https://leaselab-worker.yangjeep.workers.dev`
- **Ops URL**: `https://leaselab-ops.pages.dev`
- **Site URL**: `https://leaselab-site.pages.dev`

### Preview Environments

#### PR Preview
- **Trigger**: Pull requests to `main` branch
- **Worker URL**: `https://leaselab-worker-preview.yangjeep.workers.dev`
- **Ops URL**: `https://preview-{PR_NUMBER}.leaselab-ops.pages.dev`
- **Site URL**: `https://preview-{PR_NUMBER}.leaselab-site.pages.dev`

#### Main Branch Preview
- **Trigger**: Push to `main` branch (after PR merge)
- **Worker URL**: `https://leaselab-worker-preview.yangjeep.workers.dev`
- **Ops URL**: `https://preview-main.leaselab-ops.pages.dev`
- **Site URL**: `https://preview-main.leaselab-site.pages.dev`

## Deployment Strategy

### Deployment Order

1. **Worker** deploys first (both ops and site depend on it)
2. **Ops** and **Site** deploy in parallel (both depend on worker)

### Preview Environment Naming

To avoid confusion and provide clear staging environments:

- **PR Previews**: `preview-{PR_NUMBER}` (e.g., `preview-123.leaselab-ops.pages.dev`)
  - Unique URL for each pull request
  - Automatically deployed when PR is opened or updated
  - Used for testing individual feature branches

- **Main Preview**: `preview-main` (e.g., `preview-main.leaselab-ops.pages.dev`)
  - Consistent URL for main branch preview
  - Automatically deployed after merging to main
  - Used as final staging environment before production release
  - Tests integration of multiple merged features

**Note**: Both use the same preview environment configuration (preview D1 database, preview R2 buckets, etc.)

### Production Deployment

Production deployments are triggered automatically when a GitHub release is published.

**Workflow**: `.github/workflows/deploy-production.yml`

**Trigger**: `release` event with type `published`

Steps:
1. Run tests across the workspace
2. Deploy worker to production
3. Build and deploy ops to Cloudflare Pages (main branch)
4. Build and deploy site to Cloudflare Pages (main branch)

**To deploy to production:**
1. Ensure all changes are merged to `main` branch
2. Create a new release on GitHub (e.g., `v1.0.0`)
3. Publish the release
4. GitHub Actions will automatically deploy to production

### Preview Deployments

There are two types of preview deployments, both using the preview environment configuration:

#### PR Preview Deployment

**Workflow**: `.github/workflows/deploy-preview.yml`

**Trigger**: Pull requests opened, synchronized, or reopened

Steps:
1. Run tests across the workspace
2. Deploy worker to preview environment
3. Build and deploy ops to PR-specific preview branch (`preview-{PR_NUMBER}`)
4. Build and deploy site to PR-specific preview branch (`preview-{PR_NUMBER}`)
5. Comment on PR with preview URLs

#### Main Branch Preview Deployment

**Workflow**: `.github/workflows/deploy-preview-main.yml`

**Trigger**: Push to `main` branch (after PR merge)

Steps:
1. Run tests across the workspace
2. Deploy worker to preview environment
3. Build and deploy ops to main preview branch (`preview-main`)
4. Build and deploy site to main preview branch (`preview-main`)
5. Display preview URLs in workflow summary

**Purpose**: Test the latest `main` branch code in a preview environment before creating a production release

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

## Deployment Flow

### Development to Production

1. **Create Feature Branch**: Develop your changes in a feature branch
2. **Open Pull Request**: Create PR to `main` branch
3. **PR Preview Deployment**: GitHub Actions automatically:
   - Runs tests
   - Deploys to PR-specific preview environments
   - Comments on PR with preview URLs (e.g., `preview-123`)
4. **Test PR Preview**: Test the PR preview environments thoroughly
5. **Merge PR**: Merge to `main` when ready
6. **Main Preview Deployment**: After merge, GitHub Actions automatically:
   - Runs tests
   - Deploys to main branch preview environments (`preview-main`)
   - Provides a final staging environment for testing
7. **Test Main Preview**: Test the `preview-main` environment (optional but recommended)
8. **Create Release**: When ready to deploy to production:
   - Go to GitHub Releases
   - Create a new release (e.g., `v1.0.0`)
   - Add release notes describing changes
   - Publish the release
9. **Production Deployment**: GitHub Actions automatically deploys to production

### Release Versioning

Follow semantic versioning for releases:
- **Major** (v1.0.0): Breaking changes
- **Minor** (v1.1.0): New features, backwards compatible
- **Patch** (v1.0.1): Bug fixes, backwards compatible

## Rollback Strategy

### Quick Rollback (Recommended)
If a production deployment has issues:

**Option 1: Create a new patch release**
1. Fix the issue in a new PR
2. Merge to `main`
3. Create a new patch release (e.g., `v1.0.1` → `v1.0.2`)
4. Publish the release to deploy the fix

**Option 2: Re-release previous version**
1. Go to GitHub Releases
2. Find the last working release
3. Edit it and click "Publish release" again (GitHub will re-trigger the workflow)

### Manual Rollback
For immediate rollback without waiting for CI/CD:

```bash
# For Worker - use Wrangler rollback
cd apps/worker
wrangler rollback --env production

# For Pages - redeploy previous release
git checkout <previous-release-tag>
cd apps/ops
npm run build
wrangler pages deploy build/client --project-name=leaselab-ops --branch=main

cd ../site
npm run build
wrangler pages deploy build/client --project-name=leaselab-site --branch=main
```

### Emergency Rollback
If you need to rollback immediately:
1. Use Wrangler CLI commands above for instant rollback
2. Then create a proper fix and follow the normal release process

## Monitoring

- **Cloudflare Dashboard**: Monitor deployments, logs, and analytics
- **GitHub Actions**: View deployment status and logs
- **Cloudflare Workers Logs**: Real-time logs via Wrangler or dashboard

## Best Practices

1. **Always create PRs** for changes - test in preview first
2. **Review preview deployments** before merging
3. **Use release tags** for production deployments - provides clear versioning
4. **Add release notes** describing what changed in each release
5. **Monitor production deployments** after release
6. **Keep secrets up to date** in GitHub and Cloudflare
7. **Test preview resources** periodically to ensure they match production setup
8. **Use semantic versioning** for releases (major.minor.patch)

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
