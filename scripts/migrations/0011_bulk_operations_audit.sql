-- Migration: Add support for bulk operations and audit trail
-- Created: 2025-12-23
-- Feature: 202601-ops-ux-workflow-improvements/02-multiselect-applications

-- Add bulk_action_id to audit_log for linking related bulk operations
ALTER TABLE audit_log ADD COLUMN bulk_action_id TEXT;

-- Index for efficient bulk action queries
CREATE INDEX IF NOT EXISTS idx_audit_log_bulk_action
  ON audit_log(bulk_action_id, created_at DESC);

-- Create bulk_actions table to track bulk operation metadata
CREATE TABLE IF NOT EXISTS bulk_actions (
  id TEXT PRIMARY KEY,
  performed_by TEXT NOT NULL,
  action_type TEXT NOT NULL, -- 'reject', 'move_to_stage', 'archive', 'send_email'
  application_count INTEGER NOT NULL,
  success_count INTEGER NOT NULL DEFAULT 0,
  failure_count INTEGER NOT NULL DEFAULT 0,
  params TEXT, -- JSON parameters
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (performed_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_bulk_actions_user
  ON bulk_actions(performed_by, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bulk_actions_created
  ON bulk_actions(created_at DESC);
