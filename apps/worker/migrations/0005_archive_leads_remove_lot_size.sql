-- Migration: Add is_active to leads and remove lot_size from properties
-- Date: 2025-12-01

-- Add is_active column to leads table for archiving (soft delete)
ALTER TABLE leads ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;

-- Create index for filtering active leads
CREATE INDEX IF NOT EXISTS idx_leads_active ON leads(site_id, is_active);

-- Remove lot_size from properties (SQLite doesn't support DROP COLUMN, so we recreate the table)
-- Temporarily disable foreign key constraints
PRAGMA foreign_keys = OFF;

-- Create new properties table without lot_size
-- Note: D1 automatically wraps each migration in a transaction, so no explicit BEGIN/COMMIT needed
CREATE TABLE properties_new (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL DEFAULT 'default',
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  province TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  property_type TEXT NOT NULL DEFAULT 'single_family',
  description TEXT,
  year_built INTEGER,
  amenities TEXT DEFAULT '[]',
  latitude REAL,
  longitude REAL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Copy data from old table to new table (excluding lot_size)
INSERT INTO properties_new (id, site_id, name, slug, address, city, province, postal_code, property_type, description, year_built, amenities, latitude, longitude, is_active, created_at, updated_at)
SELECT id, site_id, name, slug, address, city, province, postal_code, property_type, description, year_built, amenities, latitude, longitude, is_active, created_at, updated_at
FROM properties;

-- Drop old table and rename new table
DROP TABLE properties;
ALTER TABLE properties_new RENAME TO properties;

-- Recreate indexes for properties table
CREATE INDEX idx_properties_site_id ON properties(site_id);
CREATE INDEX idx_properties_slug ON properties(slug);

-- Re-enable foreign key constraints
PRAGMA foreign_keys = ON;
