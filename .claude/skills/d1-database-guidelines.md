# D1 Database Guidelines

**Type:** Domain Skill
**Priority:** High - Follow these patterns for D1 database operations and migrations

## D1 Overview

Cloudflare D1 is SQLite at the edge:
- **Globally distributed** - Low-latency reads from edge locations
- **SQLite compatible** - Standard SQL syntax
- **Schema migrations** - Version-controlled SQL files
- **Local development** - Test migrations locally before deploy

## Migration System

### 1. Migration Files

```
apps/worker/migrations/
├─ 0000_init_from_production.sql    # Full schema
├─ 0001_test_data.sql               # Sample data
├─ 0002_reset_hashes.sql            # Password hash upgrade
└─ 0003_add_new_feature.sql         # Next migration
```

**Naming Convention:**
- `NNNN_description.sql` (4-digit prefix)
- Sequential numbering (0000, 0001, 0002, ...)
- Descriptive names (snake_case)

### 2. Migration Template

```sql
-- Migration: 0003_add_work_order_assignee
-- Description: Add assignee tracking to work orders
-- Date: 2024-11-28

-- Add new column
ALTER TABLE work_orders ADD COLUMN assigned_to TEXT;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_work_orders_assigned_to
ON work_orders(site_id, assigned_to);

-- Update existing records (optional)
-- UPDATE work_orders SET assigned_to = 'unassigned' WHERE assigned_to IS NULL;
```

### 3. Applying Migrations

```bash
# Local development
npx wrangler d1 execute leaselab-db --local --file=apps/worker/migrations/0003_add_work_order_assignee.sql

# Production
npx wrangler d1 execute leaselab-db --file=apps/worker/migrations/0003_add_work_order_assignee.sql
```

## Schema Design

### 1. Multi-Tenant Tables

**EVERY table MUST include:**
- `site_id TEXT NOT NULL` - Tenant isolation
- `created_at TEXT NOT NULL` - Timestamp (ISO 8601)
- `updated_at TEXT NOT NULL` - Timestamp (ISO 8601)

```sql
CREATE TABLE IF NOT EXISTS properties (
    id TEXT PRIMARY KEY,
    site_id TEXT NOT NULL,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    -- ... other columns
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (site_id) REFERENCES sites(id)
);

CREATE INDEX idx_properties_site_id ON properties(site_id);
```

### 2. Primary Keys

**Use TEXT UUIDs (not INTEGER autoincrement)**

```sql
-- ✅ CORRECT - TEXT UUID
CREATE TABLE properties (
    id TEXT PRIMARY KEY,  -- UUID generated in app code
    ...
);

-- ❌ WRONG - Integer autoincrement
CREATE TABLE properties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,  -- Don't use this
    ...
);
```

**Why?**
- UUIDs prevent ID conflicts across sites
- Works with distributed systems
- No race conditions in concurrent inserts

### 3. Foreign Keys

```sql
CREATE TABLE units (
    id TEXT PRIMARY KEY,
    site_id TEXT NOT NULL,
    property_id TEXT NOT NULL,
    -- ... other columns
    FOREIGN KEY (site_id) REFERENCES sites(id),
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);
```

### 4. Indexes

**Create indexes for:**
- `site_id` on multi-tenant tables (MANDATORY)
- Foreign keys
- Frequently queried columns
- Sort/filter columns

```sql
-- Multi-tenancy (required)
CREATE INDEX idx_properties_site_id ON properties(site_id);

-- Foreign keys
CREATE INDEX idx_units_property_id ON units(property_id);

-- Query optimization
CREATE INDEX idx_leads_ai_score ON leads(site_id, ai_score DESC);
CREATE INDEX idx_leads_status ON leads(site_id, status);

-- Unique constraints
CREATE UNIQUE INDEX idx_users_email ON users(site_id, email);
```

## Data Types

### 1. Common SQLite Types

```sql
TEXT      -- Strings, UUIDs, ISO 8601 dates
INTEGER   -- Numbers, booleans (0/1), timestamps
REAL      -- Floating point numbers
BLOB      -- Binary data (avoid if possible)
```

### 2. Recommended Patterns

```sql
-- Dates/timestamps (ISO 8601 TEXT)
created_at TEXT NOT NULL DEFAULT (datetime('now'))

-- Booleans (INTEGER 0/1)
is_active INTEGER NOT NULL DEFAULT 1

-- Money (INTEGER cents)
rent INTEGER NOT NULL  -- Store in cents: $1,234.56 = 123456

-- Enums (TEXT with CHECK constraint)
status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'pending'))

-- JSON (TEXT)
metadata TEXT  -- Store JSON.stringify() output
```

### 3. Timestamps

**Always use ISO 8601 format (TEXT)**

```sql
-- ✅ CORRECT - ISO 8601 TEXT
created_at TEXT NOT NULL DEFAULT (datetime('now'))
-- Stores: "2024-11-28T13:30:00Z"

-- ❌ WRONG - Unix timestamp (harder to query)
created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
-- Stores: 1701181800
```

## Query Patterns

### 1. Inserting Data

```sql
-- Single insert
INSERT INTO properties (
    id, site_id, name, address, created_at, updated_at
) VALUES (
    ?, ?, ?, ?, datetime('now'), datetime('now')
);

-- Bulk insert
INSERT INTO properties (id, site_id, name, address, created_at, updated_at)
VALUES
    (?, ?, ?, ?, datetime('now'), datetime('now')),
    (?, ?, ?, ?, datetime('now'), datetime('now')),
    (?, ?, ?, ?, datetime('now'), datetime('now'));
```

### 2. Updating Data

```sql
-- Always filter by site_id
UPDATE properties
SET
    name = ?,
    address = ?,
    updated_at = datetime('now')
WHERE id = ? AND site_id = ?;
```

### 3. Soft Deletes

```sql
-- Prefer soft deletes over hard deletes
UPDATE properties
SET
    is_active = 0,
    updated_at = datetime('now')
WHERE id = ? AND site_id = ?;

-- Query only active records
SELECT * FROM properties
WHERE site_id = ? AND is_active = 1;
```

### 4. Joins

```sql
-- Always filter joined tables by site_id
SELECT
    l.id,
    l.first_name,
    l.last_name,
    p.name AS property_name,
    u.unit_number
FROM leads l
JOIN properties p ON l.property_id = p.id AND p.site_id = ?
JOIN units u ON l.unit_id = u.id AND u.site_id = ?
WHERE l.site_id = ?
ORDER BY l.created_at DESC;
```

### 5. Aggregations

```sql
-- Count with multi-tenancy
SELECT COUNT(*) as total
FROM properties
WHERE site_id = ? AND is_active = 1;

-- Group by
SELECT
    status,
    COUNT(*) as count
FROM leads
WHERE site_id = ?
GROUP BY status
ORDER BY count DESC;
```

## Performance Tips

### 1. Query Optimization

```sql
-- ✅ GOOD - Index on site_id + status
SELECT * FROM leads
WHERE site_id = ? AND status = 'pending'
ORDER BY created_at DESC
LIMIT 10;

-- ❌ SLOW - Full table scan
SELECT * FROM leads
WHERE LOWER(first_name) LIKE '%john%';

-- ✅ BETTER - Use exact match or prefix
SELECT * FROM leads
WHERE site_id = ? AND first_name = 'John';
```

### 2. Batch Operations

```typescript
// Use D1 batch API for multiple operations
const results = await env.DB.batch([
  env.DB.prepare('INSERT INTO properties ...').bind(...),
  env.DB.prepare('INSERT INTO units ...').bind(...),
  env.DB.prepare('UPDATE site_stats ...').bind(...),
]);
```

### 3. EXPLAIN QUERY PLAN

```sql
-- Check query performance
EXPLAIN QUERY PLAN
SELECT * FROM properties
WHERE site_id = ? AND is_active = 1;

-- Look for "USING INDEX" (good) vs "SCAN TABLE" (bad)
```

## Data Integrity

### 1. Constraints

```sql
-- NOT NULL constraints
name TEXT NOT NULL,
email TEXT NOT NULL,

-- CHECK constraints
status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'pending')),
rent INTEGER NOT NULL CHECK (rent > 0),

-- UNIQUE constraints
UNIQUE(site_id, slug),
UNIQUE(site_id, email),

-- DEFAULT values
is_active INTEGER NOT NULL DEFAULT 1,
created_at TEXT NOT NULL DEFAULT (datetime('now')),
```

### 2. Foreign Key Constraints

```sql
-- Enable foreign keys (add to migration header)
PRAGMA foreign_keys = ON;

-- Define foreign key with cascade
FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
```

## Migration Best Practices

### 1. Adding Columns

```sql
-- Safe: Add nullable column
ALTER TABLE properties ADD COLUMN description TEXT;

-- Safe: Add column with default
ALTER TABLE properties ADD COLUMN is_featured INTEGER NOT NULL DEFAULT 0;

-- Risky: Add non-null column without default (requires data migration)
ALTER TABLE properties ADD COLUMN required_field TEXT NOT NULL;
UPDATE properties SET required_field = 'default_value';
```

### 2. Modifying Columns

```sql
-- SQLite doesn't support ALTER COLUMN directly
-- Use table recreation pattern:

-- 1. Create new table with desired schema
CREATE TABLE properties_new (
    id TEXT PRIMARY KEY,
    site_id TEXT NOT NULL,
    name TEXT NOT NULL,
    new_column TEXT,  -- Added/modified column
    -- ... other columns
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 2. Copy data
INSERT INTO properties_new
SELECT id, site_id, name, NULL as new_column, ..., created_at, updated_at
FROM properties;

-- 3. Drop old table
DROP TABLE properties;

-- 4. Rename new table
ALTER TABLE properties_new RENAME TO properties;

-- 5. Recreate indexes
CREATE INDEX idx_properties_site_id ON properties(site_id);
```

### 3. Rollback Strategy

**D1 doesn't support automatic rollbacks**
- Test migrations locally first
- Create reverse migration for each change
- Keep backups before major migrations

```sql
-- Forward migration: 0003_add_feature.sql
ALTER TABLE properties ADD COLUMN description TEXT;

-- Reverse migration: 0003_rollback_add_feature.sql
ALTER TABLE properties DROP COLUMN description;
```

## Testing Migrations

### 1. Local Testing

```bash
# 1. Start with clean local database
rm .wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite

# 2. Apply all migrations in order
npx wrangler d1 execute leaselab-db --local --file=apps/worker/migrations/0000_init.sql
npx wrangler d1 execute leaselab-db --local --file=apps/worker/migrations/0001_test_data.sql

# 3. Test the new migration
npx wrangler d1 execute leaselab-db --local --file=apps/worker/migrations/0003_new.sql

# 4. Verify schema
npx wrangler d1 execute leaselab-db --local --command="SELECT sql FROM sqlite_master WHERE type='table'"
```

### 2. Data Validation

```sql
-- After migration, verify data integrity
SELECT COUNT(*) FROM properties WHERE site_id IS NULL;  -- Should be 0
SELECT COUNT(*) FROM properties WHERE created_at IS NULL;  -- Should be 0

-- Check foreign key violations
PRAGMA foreign_key_check;
```

## Common Mistakes to Avoid

### ❌ MISTAKE 1: Forgetting site_id index
```sql
CREATE TABLE properties (
    id TEXT PRIMARY KEY,
    site_id TEXT NOT NULL,
    ...
);
-- Missing: CREATE INDEX idx_properties_site_id ON properties(site_id);
```

### ❌ MISTAKE 2: Using INTEGER PRIMARY KEY AUTOINCREMENT
```sql
CREATE TABLE properties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,  -- Don't use
    ...
);
```

### ❌ MISTAKE 3: Not filtering joined tables by site_id
```sql
SELECT * FROM leads l
JOIN properties p ON l.property_id = p.id  -- Missing: AND p.site_id = ?
WHERE l.site_id = ?;
```

### ❌ MISTAKE 4: Storing dates as strings (not ISO 8601)
```sql
created_at TEXT NOT NULL DEFAULT '2024-11-28'  -- Wrong format
-- Use: created_at TEXT NOT NULL DEFAULT (datetime('now'))
```

## References

- D1 documentation: https://developers.cloudflare.com/d1/
- SQLite docs: https://www.sqlite.org/docs.html
- Current schema: [apps/worker/migrations/0000_init_from_production.sql](../apps/worker/migrations/0000_init_from_production.sql)
- Database operations: [apps/worker/lib/db/](../apps/worker/lib/db/)
- Project guide: [CLAUDE.md](../CLAUDE.md)
