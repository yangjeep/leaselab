-- Migration: Add lease onboarding tracking system
-- Created: 2025-12-25
-- Feature: 202601-ops-ux-workflow-improvements/04-separate-lease-views

-- Add onboarding_status column to leases table
-- Values: null (active/terminated), 'in_progress', 'completed'
-- Nullable to maintain backward compatibility with existing leases
ALTER TABLE leases ADD COLUMN onboarding_status TEXT;

-- Create lease_onboarding_checklists table
-- Stores checklist steps as JSON for new leases being onboarded
CREATE TABLE IF NOT EXISTS lease_onboarding_checklists (
  id TEXT PRIMARY KEY,
  lease_id TEXT NOT NULL UNIQUE,
  steps TEXT NOT NULL,
  total_steps INTEGER NOT NULL DEFAULT 7,
  completed_steps INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (lease_id) REFERENCES leases(id) ON DELETE CASCADE
);

-- Index for efficient lease lookup
CREATE INDEX IF NOT EXISTS idx_lease_onboarding_checklists_lease_id
  ON lease_onboarding_checklists(lease_id);

-- Index for querying leases in progress
CREATE INDEX IF NOT EXISTS idx_leases_onboarding_status
  ON leases(onboarding_status)
  WHERE onboarding_status IS NOT NULL;

-- Migration notes:
-- 1. Existing leases will have onboarding_status = NULL (treated as active/historical)
-- 2. New leases created via "Proceed to Lease" will have onboarding_status = 'in_progress'
-- 3. Once all checklist steps completed, status changes to 'completed' or NULL
