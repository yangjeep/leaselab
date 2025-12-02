-- Migration: Add is_active column to leads table for soft delete
-- Date: 2025-12-02

-- Add is_active column to leads table for archiving (soft delete)
ALTER TABLE leads ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;

-- Create index for filtering active leads
CREATE INDEX IF NOT EXISTS idx_leads_active ON leads(site_id, is_active);
