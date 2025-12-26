-- Migration: Make employment_status and move_in_date nullable in leads table
-- Purpose: Support General Inquiries which don't require employment or move-in information
-- Date: 2025-12-19
-- Idempotent: Safe to run multiple times

-- SQLite doesn't support ALTER COLUMN directly, so we need to recreate the table

-- Disable foreign key constraints temporarily
PRAGMA foreign_keys = OFF;

-- Step 1: Drop temp table if it exists from a failed previous run
DROP TABLE IF EXISTS leads_new;

-- Step 2: Create new table with nullable employment_status and move_in_date
CREATE TABLE leads_new (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL DEFAULT 'default',
  property_id TEXT NOT NULL,
  unit_id TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  current_address TEXT,
  employment_status TEXT,  -- Changed from NOT NULL to nullable
  monthly_income INTEGER,
  move_in_date TEXT,  -- Changed from NOT NULL to nullable
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

-- Step 3: Copy existing data
INSERT INTO leads_new (id, site_id, property_id, unit_id, first_name, last_name, email, phone, current_address, employment_status, monthly_income, move_in_date, message, status, ai_score, ai_label, landlord_note, is_active, created_at, updated_at)
SELECT id, site_id, property_id, unit_id, first_name, last_name, email, phone, current_address, employment_status, monthly_income, move_in_date, message, status, ai_score, ai_label, landlord_note, is_active, created_at, updated_at
FROM leads;

-- Step 4: Drop old table
DROP TABLE leads;

-- Step 5: Rename new table to original name
ALTER TABLE leads_new RENAME TO leads;

-- Step 6: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_leads_site_id ON leads(site_id);
CREATE INDEX IF NOT EXISTS idx_leads_property_id ON leads(property_id);
CREATE INDEX IF NOT EXISTS idx_leads_unit_id ON leads(unit_id);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_ai_score ON leads(site_id, ai_score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_active ON leads(site_id, is_active);

-- Re-enable foreign key constraints
PRAGMA foreign_keys = ON;
