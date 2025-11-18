-- Migration: Property & Unit Management
-- This migration restructures properties to support units hierarchy

-- Step 1: Create new properties table with updated schema
CREATE TABLE IF NOT EXISTS properties_new (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  property_type TEXT NOT NULL DEFAULT 'single_family', -- single_family, multi_family, condo, townhouse, commercial
  description TEXT,
  year_built INTEGER,
  lot_size REAL,
  amenities TEXT DEFAULT '[]', -- JSON array
  latitude REAL,
  longitude REAL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Step 2: Migrate existing properties data
INSERT INTO properties_new (
  id, name, slug, address, city, state, zip_code, property_type,
  description, amenities, is_active, created_at, updated_at
)
SELECT
  id,
  name,
  lower(replace(replace(replace(name, ' ', '-'), '''', ''), ',', '')) || '-' || substr(id, 1, 8) as slug,
  address,
  city,
  state,
  zip_code,
  'single_family',
  description,
  amenities,
  CASE WHEN status = 'available' THEN 1 ELSE 1 END,
  created_at,
  updated_at
FROM properties;

-- Step 3: Create units table
CREATE TABLE IF NOT EXISTS units (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL,
  unit_number TEXT NOT NULL, -- e.g., "101", "A", "Main" for whole house
  name TEXT, -- optional friendly name
  bedrooms INTEGER NOT NULL DEFAULT 1,
  bathrooms REAL NOT NULL DEFAULT 1,
  sqft INTEGER,
  rent_amount REAL NOT NULL,
  deposit_amount REAL,
  status TEXT NOT NULL DEFAULT 'available', -- available, occupied, maintenance, pending
  floor INTEGER,
  features TEXT DEFAULT '[]', -- JSON array
  available_date TEXT,
  current_tenant_id TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (property_id) REFERENCES properties_new(id) ON DELETE CASCADE,
  FOREIGN KEY (current_tenant_id) REFERENCES tenants(id) ON DELETE SET NULL
);

-- Step 4: Create default units from existing properties (one unit per property)
INSERT INTO units (
  id, property_id, unit_number, bedrooms, bathrooms, sqft,
  rent_amount, status, available_date, created_at, updated_at
)
SELECT
  'unit_' || id,
  id,
  'Main',
  bedrooms,
  bathrooms,
  sqft,
  rent,
  status,
  available_date,
  created_at,
  updated_at
FROM properties;

-- Step 5: Create unit_history table
CREATE TABLE IF NOT EXISTS unit_history (
  id TEXT PRIMARY KEY,
  unit_id TEXT NOT NULL,
  event_type TEXT NOT NULL, -- tenant_move_in, tenant_move_out, rent_change, status_change
  event_data TEXT, -- JSON with event details
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE
);

-- Step 6: Create images table
CREATE TABLE IF NOT EXISTS images (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL, -- 'property' or 'unit'
  entity_id TEXT NOT NULL,
  r2_key TEXT NOT NULL, -- R2 object key
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  width INTEGER,
  height INTEGER,
  sort_order INTEGER DEFAULT 0,
  is_cover INTEGER DEFAULT 0,
  alt_text TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(entity_type, entity_id, r2_key)
);

-- Step 7: Add unit_id to leads table
ALTER TABLE leads ADD COLUMN unit_id TEXT REFERENCES units(id);

-- Update existing leads to reference their property's default unit
UPDATE leads
SET unit_id = 'unit_' || property_id
WHERE unit_id IS NULL;

-- Step 8: Add unit_id to leases table
ALTER TABLE leases ADD COLUMN unit_id TEXT REFERENCES units(id);

-- Update existing leases to reference their property's default unit
UPDATE leases
SET unit_id = 'unit_' || property_id
WHERE unit_id IS NULL;

-- Step 9: Drop old properties table and rename new one
DROP TABLE properties;
ALTER TABLE properties_new RENAME TO properties;

-- Step 10: Create indexes
CREATE INDEX IF NOT EXISTS idx_properties_slug ON properties(slug);
CREATE INDEX IF NOT EXISTS idx_properties_type ON properties(property_type);
CREATE INDEX IF NOT EXISTS idx_properties_active ON properties(is_active);
CREATE INDEX IF NOT EXISTS idx_properties_city ON properties(city);

CREATE INDEX IF NOT EXISTS idx_units_property ON units(property_id);
CREATE INDEX IF NOT EXISTS idx_units_status ON units(status);
CREATE INDEX IF NOT EXISTS idx_units_tenant ON units(current_tenant_id);
CREATE INDEX IF NOT EXISTS idx_units_active ON units(is_active);

CREATE INDEX IF NOT EXISTS idx_unit_history_unit ON unit_history(unit_id);
CREATE INDEX IF NOT EXISTS idx_unit_history_type ON unit_history(event_type);

CREATE INDEX IF NOT EXISTS idx_images_entity ON images(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_images_cover ON images(entity_type, entity_id, is_cover);

CREATE INDEX IF NOT EXISTS idx_leads_unit ON leads(unit_id);
CREATE INDEX IF NOT EXISTS idx_leases_unit ON leases(unit_id);
