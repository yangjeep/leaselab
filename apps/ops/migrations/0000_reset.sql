-- Reset script placeholder; not used for migrations
-- WARNING: This will delete all data! Use only for full reset in production.

PRAGMA foreign_keys = OFF;

-- Drop all tables if they exist
DROP TABLE IF EXISTS work_orders;
DROP TABLE IF EXISTS images;
DROP TABLE IF EXISTS lead_ai_evaluations;
DROP TABLE IF EXISTS lead_files;
DROP TABLE IF EXISTS leads;
DROP TABLE IF EXISTS tenants;
DROP TABLE IF EXISTS leases;
DROP TABLE IF EXISTS units;
DROP TABLE IF EXISTS unit_history;
DROP TABLE IF EXISTS properties;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS sessions;

PRAGMA foreign_keys = ON;

-- Recreate tables (using the schema from 0001_init.sql and subsequent migrations)
-- For brevity, we will re-run the existing migrations by invoking them sequentially.
-- This script assumes that the migrations 0001_init.sql through 0006_user_access.sql are present.

-- Run init migration
.read apps/ops/migrations/0001_init.sql

-- Run property_units migration
.read apps/ops/migrations/0002_property_units.sql

-- Run default admin migration (will be overridden with new hash later)
.read apps/ops/migrations/0003_default_admin.sql

-- Run test data migration (optional, can be removed if not needed)
.read apps/ops/migrations/0004_test_data.sql

-- Run add_site_id migration
.read apps/ops/migrations/0005_add_site_id.sql
.read apps/ops/migrations/0012_add_updated_at_to_users.sql

-- Run user_access migration
.read apps/ops/migrations/0006_user_access.sql

-- Update admin password to a new secure hash
UPDATE users SET password_hash = 'a96f73d5496928869fee28f6e6e8a67310519901bdf854ad8fe69451534193d2' WHERE email = 'admin@leaselab.io';

-- Ensure admin role is set correctly
UPDATE users SET role = 'admin' WHERE email = 'admin@leaselab.io';

-- Set created_at for admin if missing
UPDATE users SET created_at = datetime('now') WHERE email = 'admin@leaselab.io' AND created_at IS NULL;

-- End of reset script
