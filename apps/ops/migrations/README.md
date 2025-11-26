# Database Migrations Guide

## Migration Status

All migrations have been audited for idempotency and safety.

### Fully Idempotent Migrations ✅
These migrations can be safely re-run multiple times:

- `0000_reset.sql` - No-op placeholder
- `0001_init.sql` - Uses `CREATE TABLE IF NOT EXISTS`
- `0003_default_admin.sql` - Uses `INSERT ... ON CONFLICT DO NOTHING`
- `0004_test_data.sql` - Uses `INSERT OR IGNORE`
- `0007_site_configuration.sql` - Uses `IF NOT EXISTS` and `INSERT OR IGNORE`
- `0008_api_tokens.sql` - Uses `IF NOT EXISTS`
- `0010_test_rental_applications.sql` - Uses `INSERT OR IGNORE`
- `0011_canadian_test_properties.sql` - Uses `UPDATE` (safe to re-run)

### Conditionally Idempotent Migrations ⚠️
These migrations will **fail on re-run** if already applied (expected behavior):

- `0002_property_units.sql` - Table renames and data migration (one-time only)
- `0005_add_site_id.sql` - `ALTER TABLE ADD COLUMN` (fails if column exists)
- `0006_user_access.sql` - `ALTER TABLE ADD COLUMN` (fails if column exists)
- `0009_canadian_format.sql` - `ALTER TABLE RENAME COLUMN` (fails if already renamed)
- `0012_add_updated_at_to_users.sql` - `ALTER TABLE ADD COLUMN` (fails if column exists)
- `0013_lead_notes_history.sql` - `ALTER TABLE ADD COLUMN` (fails if columns exist), but table/index creation is idempotent

**Why they fail:** SQLite doesn't support `IF NOT EXISTS` for `ALTER TABLE ADD COLUMN` or conditional column renames. This is **expected** and **safe** - the error indicates the migration was already applied.

## Running Migrations

### Local Development
```bash
cd apps/ops
wrangler d1 migrations apply DB --local
```

### Production
```bash
cd apps/ops
wrangler d1 migrations apply DB
```

### Check Migration Status
```bash
wrangler d1 migrations list DB --local  # Local
wrangler d1 migrations list DB          # Production
```

## Migration Tracking

Wrangler automatically tracks which migrations have been applied using the `d1_migrations` table. It will only apply unapplied migrations.

**Status Icons:**
- ✅ Applied successfully
- ❌ Failed (needs attention)
- 🕒 Pending (not yet applied)

## Expected Errors

If you see errors like these when re-running migrations, they are **expected and safe**:

```
✘ [ERROR] Migration 0005_add_site_id.sql failed with the following errors:
✘ [ERROR] duplicate column name: site_id at offset XXX: SQLITE_ERROR
```

This means the column already exists and the migration was previously applied. Wrangler will mark it as applied and continue.

```
✘ [ERROR] Migration 0009_canadian_format.sql failed with the following errors:
✘ [ERROR] no such column: state at offset XXX: SQLITE_ERROR
```

This means the column was already renamed. The migration was previously applied.

## Fresh Database Setup

To set up a completely fresh local database:

```bash
# Delete the local .wrangler folder
rm -rf .wrangler

# Run all migrations
wrangler d1 migrations apply DB --local
```

## Migration Best Practices

1. **Always use IF NOT EXISTS** for CREATE statements
2. **Use INSERT OR IGNORE** for data inserts
3. **Document when migrations aren't idempotent** (ALTER TABLE ADD COLUMN)
4. **Test migrations locally first** before production
5. **Never modify existing migrations** - create new ones instead
6. **Keep migrations small and focused** on one change

## Order of Execution

Migrations **must** run in order:

1. `0000_reset.sql` - No-op placeholder
2. `0001_init.sql` - Create base tables
3. `0002_property_units.sql` - Restructure properties → units hierarchy
4. `0003_default_admin.sql` - Create default admin user
5. `0004_test_data.sql` - Add test properties and units
6. `0005_add_site_id.sql` - Add multi-tenancy support
7. `0006_user_access.sql` - Add user access control
8. `0007_site_configuration.sql` - Add site configs
9. `0008_api_tokens.sql` - Add API token table
10. `0009_canadian_format.sql` - Rename columns to Canadian format
11. `0010_test_rental_applications.sql` - Add test leads
12. `0011_canadian_test_properties.sql` - Update test data to Canadian
13. `0012_add_updated_at_to_users.sql` - Add updated_at to users
14. `0013_lead_notes_history.sql` - Add landlord notes and history

## Troubleshooting

### Migration Stuck/Failed

If a migration fails and won't re-run:

```bash
# Check what migrations have been applied
wrangler d1 execute DB --local --command="SELECT * FROM d1_migrations;"

# Manually mark a migration as applied (use with caution!)
wrangler d1 execute DB --local --command="INSERT INTO d1_migrations (name) VALUES ('0005_add_site_id.sql');"
```

### Reset Local Database

```bash
rm -rf .wrangler
wrangler d1 migrations apply DB --local
```

### Check Table Schema

```bash
wrangler d1 execute DB --local --command="SELECT sql FROM sqlite_master WHERE type='table' AND name='properties';"
```

## Notes

- Migrations are **append-only** - never modify existing migration files
- Always create a new migration for schema changes
- Test migrations locally before deploying to production
- Wrangler D1 uses SQLite, which has some limitations compared to PostgreSQL/MySQL
- Some operations (like column renames) aren't idempotent in SQLite
