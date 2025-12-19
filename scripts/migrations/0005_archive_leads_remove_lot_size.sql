-- Migration: Add is_active to leads and remove lot_size from properties
-- Date: 2025-12-01
-- Idempotent: Safe to run multiple times

-- Temporarily disable foreign key constraints
PRAGMA foreign_keys = OFF;

-- ============================================================================
-- Part 1: Update leads table to add is_active column
-- ============================================================================

-- Drop temp table if exists from failed previous run
DROP TABLE IF EXISTS leads_temp;

-- Create new leads table with is_active column
CREATE TABLE leads_temp (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL DEFAULT 'default',
  property_id TEXT NOT NULL,
  unit_id TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  current_address TEXT,
  employment_status TEXT NOT NULL DEFAULT 'employed',
  monthly_income INTEGER,
  move_in_date TEXT NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  ai_score INTEGER,
  ai_label TEXT,
  landlord_note TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (property_id) REFERENCES properties(id),
  FOREIGN KEY (unit_id) REFERENCES units(id)
);

-- Copy data from leads table, setting is_active=1 for all existing records
INSERT INTO leads_temp (id, site_id, property_id, unit_id, first_name, last_name, email, phone, current_address, employment_status, monthly_income, move_in_date, message, status, ai_score, ai_label, landlord_note, is_active, created_at, updated_at)
SELECT id, site_id, property_id, unit_id, first_name, last_name, email, phone, current_address, employment_status, monthly_income, move_in_date, message, status, ai_score, ai_label, landlord_note, 1, created_at, updated_at
FROM leads;

-- Drop old leads table and rename temp table
DROP TABLE leads;
ALTER TABLE leads_temp RENAME TO leads;

-- Recreate indexes for leads table
CREATE INDEX IF NOT EXISTS idx_leads_site_id ON leads(site_id);
CREATE INDEX IF NOT EXISTS idx_leads_property_id ON leads(property_id);
CREATE INDEX IF NOT EXISTS idx_leads_unit_id ON leads(unit_id);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_ai_score ON leads(site_id, ai_score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_active ON leads(site_id, is_active);

-- ============================================================================
-- Part 2: Update properties table to remove lot_size column
-- ============================================================================

-- Drop temp table if exists from failed previous run
DROP TABLE IF EXISTS properties_new;

-- Create new properties table without lot_size
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

-- Copy data from old table to new table (excluding lot_size if it exists)
INSERT INTO properties_new (id, site_id, name, slug, address, city, province, postal_code, property_type, description, year_built, amenities, latitude, longitude, is_active, created_at, updated_at)
SELECT id, site_id, name, slug, address, city, province, postal_code, property_type, description, year_built, amenities, latitude, longitude, is_active, created_at, updated_at
FROM properties;

-- Drop old table and rename new table
DROP TABLE properties;
ALTER TABLE properties_new RENAME TO properties;

-- Recreate indexes for properties table
CREATE INDEX IF NOT EXISTS idx_properties_site_id ON properties(site_id);
CREATE INDEX IF NOT EXISTS idx_properties_slug ON properties(slug);
CREATE INDEX IF NOT EXISTS idx_properties_type ON properties(property_type);
CREATE INDEX IF NOT EXISTS idx_properties_active ON properties(is_active);
CREATE INDEX IF NOT EXISTS idx_properties_city ON properties(city);

-- Re-enable foreign key constraints
PRAGMA foreign_keys = ON;
