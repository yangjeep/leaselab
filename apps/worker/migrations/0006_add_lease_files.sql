-- Migration: Add lease_files table for lease document management
-- Created: 2025-12-01
-- Purpose: Store lease documents, addendums, inspection reports, and related files
-- Idempotent: Safe to run multiple times

-- Create lease_files table (similar to lead_files)
CREATE TABLE IF NOT EXISTS lease_files (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL DEFAULT 'default',
  lease_id TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (lease_id) REFERENCES leases(id) ON DELETE CASCADE
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_lease_files_lease ON lease_files(lease_id);
CREATE INDEX IF NOT EXISTS idx_lease_files_site ON lease_files(site_id);
CREATE INDEX IF NOT EXISTS idx_lease_files_type ON lease_files(file_type);
