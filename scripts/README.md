# Scripts Directory

This directory contains all scripts for database migrations and utilities.

## 🚀 Quick Start - Generate Test Data

**RECOMMENDED**: Use the SQL seed script for fastest setup:

```bash
# Set your Cloudflare account ID (required for wrangler)
export CLOUDFLARE_ACCOUNT_ID=280e7379fc5d19bfd9b65ee682896dbe

# Seed test data to remote database
npx wrangler d1 execute leaselab-db --remote --file=scripts/util/seed-test-data.sql
```

**What this creates**:
- ✅ 3 Properties (Maple View Apartments, Oak Ridge Townhomes, Downtown Lofts)
- ✅ 6 Leads/Applications including **James Kim** (`lead_james_kim`)
- ✅ Lead history events

**Access the data**:
- All Leads: http://localhost:5173/admin/leads
- James Kim: http://localhost:5173/admin/leads/lead_james_kim

## Directory Structure

### `/migrations`
Database migration scripts for Cloudflare D1. All migrations are idempotent and safe to run multiple times.

**Usage:**
```bash
# Run migrations on preview database
CLOUDFLARE_ACCOUNT_ID=<account-id> npx wrangler d1 execute leaselab-db-preview --remote --file=scripts/migrations/0000_init_from_production.sql

# Run migrations on production database
CLOUDFLARE_ACCOUNT_ID=<account-id> npx wrangler d1 execute leaselab-db --remote --file=scripts/migrations/0000_init_from_production.sql
```

See [migrations/README.md](migrations/README.md) for detailed information about each migration.

### `/util`
Utility scripts for maintenance tasks, data generation, and one-off operations.

**Available utilities:**
- `generate-test-tenants.ts` - Generate test tenant data
- `generate-test-tenants-wrangler.ts` - Generate test data using Wrangler
- `migrate-r2-buckets.ts` - Migrate R2 bucket data
- `copy-all-to-public.sh` - Copy files to public bucket
- `clear-property-images.sql` - Clear property images
- `cleanup-images.md` - Image cleanup documentation
- `wrangler-migration.toml` - Wrangler configuration for migrations

## Migration Path Change

**Old location:** `apps/worker/migrations/`
**New location:** `scripts/migrations/`

All migration files have been moved to the root-level scripts directory for better organization and visibility. The old location has been preserved in `apps/worker/migrations/` for backwards compatibility with the worker deployment.

## Archive

Historical scripts and utilities have been archived in `docs/archive/scripts/` for reference.
