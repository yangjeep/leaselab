-- Migration: Add site_id for multi-tenancy support

-- Properties
ALTER TABLE properties ADD COLUMN site_id TEXT NOT NULL DEFAULT 'default';
CREATE INDEX idx_properties_site ON properties(site_id);

-- Units
ALTER TABLE units ADD COLUMN site_id TEXT NOT NULL DEFAULT 'default';
CREATE INDEX idx_units_site ON units(site_id);

-- Unit History
ALTER TABLE unit_history ADD COLUMN site_id TEXT NOT NULL DEFAULT 'default';
CREATE INDEX idx_unit_history_site ON unit_history(site_id);

-- Leads
ALTER TABLE leads ADD COLUMN site_id TEXT NOT NULL DEFAULT 'default';
CREATE INDEX idx_leads_site ON leads(site_id);

-- Lead Files
ALTER TABLE lead_files ADD COLUMN site_id TEXT NOT NULL DEFAULT 'default';
CREATE INDEX idx_lead_files_site ON lead_files(site_id);

-- Lead AI Evaluations
ALTER TABLE lead_ai_evaluations ADD COLUMN site_id TEXT NOT NULL DEFAULT 'default';
CREATE INDEX idx_lead_ai_evaluations_site ON lead_ai_evaluations(site_id);

-- Tenants
ALTER TABLE tenants ADD COLUMN site_id TEXT NOT NULL DEFAULT 'default';
CREATE INDEX idx_tenants_site ON tenants(site_id);

-- Leases
ALTER TABLE leases ADD COLUMN site_id TEXT NOT NULL DEFAULT 'default';
CREATE INDEX idx_leases_site ON leases(site_id);

-- Work Orders
ALTER TABLE work_orders ADD COLUMN site_id TEXT NOT NULL DEFAULT 'default';
CREATE INDEX idx_work_orders_site ON work_orders(site_id);

-- Images
ALTER TABLE images ADD COLUMN site_id TEXT NOT NULL DEFAULT 'default';
CREATE INDEX idx_images_site ON images(site_id);

-- Users (Users are global but can be associated with a site, or we might want to scope them? 
-- For now, let's add site_id to users too, so we can have site-specific staff if needed. 
-- Admin users might have access to all sites, handled by application logic or a special site_id/role)
ALTER TABLE users ADD COLUMN site_id TEXT NOT NULL DEFAULT 'default';
CREATE INDEX idx_users_site ON users(site_id);

-- Sessions (Sessions are usually global or tied to user, but adding site_id might help with scoping)
-- Skipping sessions for now as they are tied to users.
