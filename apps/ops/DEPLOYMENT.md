# Cloudflare Pages Deployment Guide

## Quick Links

- **Dashboard**: https://dash.cloudflare.com/280e7379fc5d19bfd9b65ee682896dbe/pages
- **Project**: leaselab-ops
- **Current URL**: https://bc906a81.leaselab-ops.pages.dev

## Initial Setup (One-Time)

### 1. Configure Bindings

Bindings connect your Pages deployment to Cloudflare services (D1, KV, R2).

**Navigate to**: Dashboard → Pages → leaselab-ops → Settings → Functions

Add the following bindings in the **Production** environment:

#### D1 Database
- **Variable name**: `DB`
- **D1 database**: `leaselab-db`
- **Database ID**: `850dc940-1021-4c48-8d40-0f18992424ac`

#### KV Namespace
- **Variable name**: `SESSION_KV`
- **KV namespace**: Select your namespace
- **Namespace ID**: `a020a8412719406db3fc3066dc298981`

#### R2 Bucket
- **Variable name**: `FILE_BUCKET`
- **R2 bucket**: `leaselab-files`

### 2. Environment Variables (Optional)

**Navigate to**: Settings → Environment variables

Add any secrets:
```
OPENAI_API_KEY = <your-key>
```

## Deployment Process

### Standard Deployment

```bash
# Build the app
npm run build

# Deploy to Cloudflare Pages
npm run deploy
```

This creates a new deployment with a unique URL like:
`https://[commit-hash].leaselab-ops.pages.dev`

### Database Migrations

**Before deploying**:
```bash
# Run migrations on production database
npm run db:migrate:prod
```

**Verify migrations**:
```bash
wrangler d1 execute leaselab-db --remote --command="SELECT name FROM sqlite_master WHERE type='table'"
```

## Troubleshooting

### 500 Error After Deployment

**Cause**: Bindings not configured

**Fix**:
1. Go to Settings → Functions
2. Add all bindings (DB, SESSION_KV, FILE_BUCKET)
3. Redeploy

### Database Not Found

**Cause**: Migration not run

**Fix**:
```bash
npm run db:migrate:prod
```

### KV/Session Errors

**Cause**: SESSION_KV binding missing

**Fix**: Add KV binding in dashboard

## Viewing Logs

### Live Logs
```bash
wrangler pages deployment tail --project-name=leaselab-ops
```

### Specific Deployment
```bash
# Get deployment ID from dashboard
wrangler pages deployment tail <deployment-id>
```

## Custom Domain

1. Go to **Settings** → **Custom domains**
2. Click **Set up a custom domain**
3. Enter your domain (e.g., `ops.leaselab.io`)
4. Follow DNS configuration instructions

## Rollback

1. Go to **Deployments** tab
2. Find previous working deployment
3. Click **⋮** → **Rollback to this deployment**

## Important Notes

- **Bindings are per-environment**: Configure separately for Production and Preview
- **Migrations are permanent**: Test locally first with `npm run db:migrate`
- **No downtime**: New deployments are atomic, old version serves until ready
- **Automatic HTTPS**: All deployments get free SSL certificates
