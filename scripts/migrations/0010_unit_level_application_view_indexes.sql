-- Migration: Add indexes for unit-level application view performance
-- Created: 2025-12-23
-- Feature: 202601-ops-ux-workflow-improvements/01-unit-level-application-view

-- Index for efficient unit-level filtering and sorting
-- Supports queries filtering by unit_id, status, and sorted by various columns
CREATE INDEX IF NOT EXISTS idx_leads_unit_status_created
  ON leads(unit_id, status, created_at DESC);

-- Index for property-level queries with unit grouping
-- Supports property-level views that need to group by unit
CREATE INDEX IF NOT EXISTS idx_leads_property_unit_created
  ON leads(property_id, unit_id, created_at DESC);

-- Index for AI score sorting (common use case in shortlist view)
CREATE INDEX IF NOT EXISTS idx_leads_unit_ai_score
  ON leads(unit_id, ai_score DESC, created_at DESC);

-- Index for site-level queries with unit filtering
-- Optimizes site-wide searches that filter by unit
CREATE INDEX IF NOT EXISTS idx_leads_site_unit_status
  ON leads(site_id, unit_id, status);

-- Index for active applications only (common filter)
-- Optimizes queries that exclude archived applications
CREATE INDEX IF NOT EXISTS idx_leads_active_unit_created
  ON leads(is_active, unit_id, created_at DESC)
  WHERE is_active = 1;
