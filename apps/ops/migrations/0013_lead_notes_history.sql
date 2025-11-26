-- Migration: Lead Notes & History
-- Date: 2025-11-26
-- Description: Add landlord notes field and history tracking for leads

-- ==================== STEP 1: Add note column to leads table ====================

-- Add landlord_note column (internal notes for landlord/admin)
-- NOTE: If this migration was already run, this will fail (expected in SQLite)
ALTER TABLE leads ADD COLUMN landlord_note TEXT;

-- ==================== STEP 2: Create lead_history table ====================

-- Create lead history table for audit trail
CREATE TABLE IF NOT EXISTS lead_history (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL,
  site_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_data TEXT NOT NULL, -- JSON string
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
);

-- Create index for faster history lookups by lead
CREATE INDEX IF NOT EXISTS idx_lead_history_lead_id ON lead_history(lead_id);

-- Create index for faster history lookups by site
CREATE INDEX IF NOT EXISTS idx_lead_history_site_id ON lead_history(site_id);

-- ==================== STEP 3: Backfill legacy data ====================

-- Migrate existing monthly_income values to landlord_note
-- Format: "Legacy monthly income: $X.XX"
UPDATE leads 
SET landlord_note = 'Legacy monthly income: $' || CAST(monthly_income AS TEXT)
WHERE monthly_income IS NOT NULL 
  AND monthly_income > 0
  AND (landlord_note IS NULL OR landlord_note = '');

-- Create history records for all leads with legacy monthly income
INSERT INTO lead_history (id, lead_id, site_id, event_type, event_data, created_at)
SELECT 
  'hist_' || lower(hex(randomblob(16))),
  id,
  site_id,
  'legacy_income_migrated',
  '{"monthlyIncome":' || CAST(monthly_income AS TEXT) || ',"migratedToNote":true}',
  created_at
FROM leads
WHERE monthly_income IS NOT NULL 
  AND monthly_income > 0
  AND NOT EXISTS (
    SELECT 1 FROM lead_history 
    WHERE lead_history.lead_id = leads.id 
      AND lead_history.event_type = 'legacy_income_migrated'
  );

-- ==================== NOTES ====================
-- 
-- The monthly_income column is NOT dropped in this migration to preserve data.
-- It remains in the database but is no longer exposed in application code.
-- 
-- Future migration can drop the column if desired using:
--   1. CREATE TABLE leads_new (without monthly_income column)
--   2. INSERT INTO leads_new SELECT (all columns except monthly_income)
--   3. DROP TABLE leads
--   4. ALTER TABLE leads_new RENAME TO leads
--
-- This migration is idempotent for the CREATE TABLE and CREATE INDEX statements.
-- The ALTER TABLE ADD COLUMN statements will fail if re-run (expected in SQLite).
