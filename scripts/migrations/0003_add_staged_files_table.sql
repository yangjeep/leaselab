-- Migration: Add staged_files table for temporary file uploads
-- Purpose: Stage files before lead creation (two-step upload process)
-- Date: 2025-11-29
-- Related: PRD-File-Upload-Download.md
-- Idempotent: Safe to run multiple times

-- Create staging table for temporary file uploads
-- Files stay here until associated with a lead, then moved to lead_files
CREATE TABLE IF NOT EXISTS staged_files (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL DEFAULT 'default',
  file_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL DEFAULT (datetime('now', '+24 hours'))
);

-- Index for cleanup queries (find expired files)
CREATE INDEX IF NOT EXISTS idx_staged_files_expires_at ON staged_files(expires_at);
CREATE INDEX IF NOT EXISTS idx_staged_files_site_id ON staged_files(site_id);

-- Note: Background job should periodically clean up expired staged files:
-- DELETE FROM staged_files WHERE expires_at < datetime('now');
