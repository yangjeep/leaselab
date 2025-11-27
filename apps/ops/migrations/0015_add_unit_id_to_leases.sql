-- Add unit_id and site_id columns to leases table
-- Migration: 0015_add_unit_id_to_leases

-- Add unit_id column (nullable since existing leases might not have units)
ALTER TABLE leases ADD COLUMN unit_id TEXT;

-- Add site_id column (required for multi-tenant support)
-- Note: For existing data, you may need to populate this manually or via a data migration
ALTER TABLE leases ADD COLUMN site_id TEXT NOT NULL DEFAULT '';

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_leases_unit ON leases(unit_id);
CREATE INDEX IF NOT EXISTS idx_leases_site ON leases(site_id);
