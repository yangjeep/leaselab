# GitHub Actions Workflows

This directory contains the CI/CD workflows for LeaseLab deployments.

## Quick Overview

```
Feature Branch → PR → Merge to Main → Create Release → Production
                 ↓         ↓                ↓
            PR Preview  Main Preview   Production Deploy
           (preview-123) (preview-main)  (live URLs)
```

**Three workflow types**:
1. **PR Preview** - Test feature branches (per-PR URLs)
2. **Main Preview** - Test integrated main branch (staging URL)
3. **Production** - Deploy releases (production URLs)

## Workflows

### 🚀 Production Deployment (`deploy-production.yml`)

**Trigger**: Release publication

**When to use**: 
- When you're ready to deploy to production
- After testing in preview environments
- When you want to create a versioned release

**How to deploy to production**:
1. Ensure all changes are merged to `main` branch
2. Go to GitHub → Releases → "Create a new release"
3. Choose a tag (e.g., `v1.0.0`, `v1.1.0`, `v1.0.1`)
4. Add release title and description
5. Click "Publish release"
6. GitHub Actions will automatically deploy all apps to production

**What it deploys**:
- Worker: `leaselab-worker.yangjeep.workers.dev`
- Ops: `leaselab-ops.pages.dev`
- Site: `leaselab-site.pages.dev`

### 🔍 Preview Deployments

#### PR Preview (`deploy-preview.yml`)

**Trigger**: Pull requests to `main` branch

**When it runs**:
- When a PR is opened
- When new commits are pushed to the PR
- When a closed PR is reopened

**What it does**:
1. Runs all tests
2. Deploys to PR-specific preview environments
3. Comments on the PR with preview URLs

**Preview URLs** (PR-specific):
- Worker: `leaselab-worker-preview.yangjeep.workers.dev`
- Ops: `preview-{PR_NUMBER}.leaselab-ops.pages.dev`
- Site: `preview-{PR_NUMBER}.leaselab-site.pages.dev`

#### Main Branch Preview (`deploy-preview-main.yml`)

**Trigger**: Push to `main` branch (after PR merge)

**When it runs**:
- When a PR is merged to `main`
- When commits are pushed directly to `main`

**What it does**:
1. Runs all tests
2. Deploys to main branch preview environments
3. Provides a staging environment for final testing before release

**Preview URLs** (Main branch):
- Worker: `leaselab-worker-preview.yangjeep.workers.dev`
- Ops: `preview-main.leaselab-ops.pages.dev`
- Site: `preview-main.leaselab-site.pages.dev`

**Purpose**: Test the latest `main` branch in a preview environment before creating a production release

## Required Secrets

Configure these in **Settings → Secrets and variables → Actions**:

- `CLOUDFLARE_API_TOKEN`: Cloudflare API token with Workers & Pages permissions
- `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare account ID

## Semantic Versioning

Follow semantic versioning for releases:

- **Major** (`v1.0.0` → `v2.0.0`): Breaking changes
- **Minor** (`v1.0.0` → `v1.1.0`): New features, backwards compatible
- **Patch** (`v1.0.0` → `v1.0.1`): Bug fixes, backwards compatible

## Development Workflow

```
1. Create feature branch
   └─> git checkout -b feature/my-feature

2. Make changes and commit
   └─> git commit -m "feat: add new feature"

3. Push and create PR
   └─> git push origin feature/my-feature
   └─> Open PR on GitHub

4. PR preview deployment (automatic)
   └─> Tests run
   └─> Preview environments deployed
   └─> Comment with PR-specific preview URLs appears
   └─> URLs: preview-{PR_NUMBER}.leaselab-ops.pages.dev

5. Test PR preview environments
   └─> Test worker at preview URL
   └─> Test ops at preview URL
   └─> Test site at preview URL

6. Merge to main
   └─> PR gets merged
   └─> Changes now in main branch

7. Main preview deployment (automatic)
   └─> Tests run automatically
   └─> Deploys to main preview environments
   └─> URLs: preview-main.leaselab-ops.pages.dev

8. Test main preview (optional but recommended)
   └─> Final staging environment testing
   └─> Test integration of multiple merged PRs

9. Create release (when ready for production)
   └─> GitHub → Releases → "Create a new release"
   └─> Tag: v1.0.0
   └─> Title: "Release v1.0.0"
   └─> Description: Release notes
   └─> Click "Publish release"

10. Production deployment (automatic)
    └─> GitHub Actions triggers
    └─> All apps deploy to production
    └─> Monitor deployment in Actions tab
```

## Rollback Strategy

### Quick Rollback Options

**Option 1: Create a patch release**
```bash
# Fix the issue
git checkout -b hotfix/issue-fix
# Make fixes
git commit -m "fix: critical bug"
git push origin hotfix/issue-fix
# Create PR, merge to main
# Create new patch release (e.g., v1.0.2)
```

**Option 2: Re-publish previous release**
1. Go to GitHub Releases
2. Find the last working release
3. Edit it and click "Publish release" again

**Option 3: Manual rollback**
```bash
# Worker
cd apps/worker
wrangler rollback --env production

# Pages apps
git checkout v1.0.0  # previous working release
cd apps/ops
npm run build
wrangler pages deploy build/client --project-name=leaselab-ops --branch=main
```

## Monitoring

- **GitHub Actions**: Monitor workflows in the Actions tab
- **Cloudflare Dashboard**: View logs and analytics
- **Worker Logs**: `wrangler tail --env production`

## Troubleshooting

### Deployment fails

1. Check GitHub Actions logs
2. Verify secrets are set correctly
3. Ensure Cloudflare resources exist
4. Check if tests are passing

### Preview not deploying

1. Verify PR targets `main` branch
2. Check if workflow was triggered in Actions tab
3. Review workflow logs for errors

### Production not deploying

1. Verify release was published (not just created as draft)
2. Check if tests passed before deployment
3. Review deployment logs in Actions tab

## Additional Resources

- Full documentation: `/docs/CI_CD_STRATEGY.md`
- Wrangler docs: https://developers.cloudflare.com/workers/wrangler/
- GitHub Actions docs: https://docs.github.com/en/actions

