-- Migration: Add is_active column to leads table for soft delete
-- Date: 2025-12-02
-- Idempotent: Safe to run multiple times
-- Note: This migration may be redundant if 0005 has already run, but it's safe

-- Create index for filtering active leads (column may already exist from migration 0005)
-- This is safe to run even if the index already exists
CREATE INDEX IF NOT EXISTS idx_leads_active ON leads(site_id, is_active);

-- Note: The is_active column is added in migration 0005_archive_leads_remove_lot_size.sql
-- This migration only ensures the index exists, which is idempotent
