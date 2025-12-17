-- Migration: Initialize database from production schema
-- This migration creates all tables based on the production schema export
-- ⚠️ EMERGENCY RECOVERY ONLY - Should only run on completely empty databases
-- Safe to re-run (uses IF NOT EXISTS and INSERT OR IGNORE)

-- =============================================================================
-- SAFETY CHECK: Ensure database is empty (emergency recovery only)
-- =============================================================================
-- ⚠️  This migration should ONLY run on completely empty databases
-- ⚠️  If you need to run this on an existing database, you're doing emergency recovery
-- ⚠️  and should verify this is intentional before proceeding

-- Count existing user tables (excluding SQLite and D1 internal tables)
-- This will cause the migration to FAIL if any tables already exist
SELECT CASE
  WHEN (SELECT COUNT(*) FROM sqlite_master
        WHERE type='table'
        AND name NOT LIKE 'sqlite_%'
        AND name NOT LIKE 'd1_%') > 0
  THEN RAISE(ABORT, '🛑 SAFETY: Database not empty! This migration is for NEW databases only. If you need to run this for emergency recovery, manually remove this check.')
  ELSE 0
END;

-- Defer foreign keys for batch operations
PRAGMA defer_foreign_keys=TRUE;

-- Core Tables
CREATE TABLE IF NOT EXISTS sites (
  site_id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(6)))),
  name TEXT NOT NULL,
  domain TEXT,
  settings TEXT DEFAULT '{}',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_access (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  granted_at TEXT NOT NULL DEFAULT (datetime('now')),
  granted_by TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, site_id)
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL DEFAULT 'default',
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff',
  is_super_admin INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_login_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS properties (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL DEFAULT 'default',
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  province TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  property_type TEXT NOT NULL DEFAULT 'single_family',
  description TEXT,
  year_built INTEGER,
  lot_size REAL,
  amenities TEXT DEFAULT '[]',
  latitude REAL,
  longitude REAL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS units (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL DEFAULT 'default',
  property_id TEXT NOT NULL,
  unit_number TEXT NOT NULL,
  name TEXT,
  bedrooms INTEGER NOT NULL DEFAULT 1,
  bathrooms REAL NOT NULL DEFAULT 1,
  sqft INTEGER,
  rent_amount REAL NOT NULL,
  deposit_amount REAL,
  status TEXT NOT NULL DEFAULT 'available',
  floor INTEGER,
  features TEXT DEFAULT '[]',
  available_date TEXT,
  current_tenant_id TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (current_tenant_id) REFERENCES tenants(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL DEFAULT 'default',
  property_id TEXT NOT NULL,
  unit_id TEXT REFERENCES units(id),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  current_address TEXT,
  employment_status TEXT NOT NULL,
  monthly_income REAL NOT NULL,
  move_in_date TEXT NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  ai_score INTEGER,
  ai_label TEXT,
  landlord_note TEXT,
  application_note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (property_id) REFERENCES properties(id)
);

CREATE TABLE IF NOT EXISTS lead_files (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL DEFAULT 'default',
  lead_id TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (lead_id) REFERENCES leads(id)
);

CREATE TABLE IF NOT EXISTS lead_ai_evaluations (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL DEFAULT 'default',
  lead_id TEXT NOT NULL UNIQUE,
  score INTEGER NOT NULL,
  label TEXT NOT NULL,
  summary TEXT NOT NULL,
  risk_flags TEXT DEFAULT '[]',
  recommendation TEXT NOT NULL,
  fraud_signals TEXT DEFAULT '[]',
  model_version TEXT NOT NULL,
  evaluated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (lead_id) REFERENCES leads(id)
);

CREATE TABLE IF NOT EXISTS lead_history (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  lead_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_data TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL DEFAULT 'default',
  lead_id TEXT UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  emergency_contact TEXT,
  emergency_phone TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (lead_id) REFERENCES leads(id)
);

CREATE TABLE IF NOT EXISTS leases (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL DEFAULT 'default',
  property_id TEXT NOT NULL,
  unit_id TEXT REFERENCES units(id),
  tenant_id TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  monthly_rent REAL NOT NULL,
  security_deposit REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  docusign_envelope_id TEXT,
  signed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (property_id) REFERENCES properties(id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS work_orders (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL DEFAULT 'default',
  property_id TEXT NOT NULL,
  tenant_id TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  assigned_to TEXT,
  scheduled_date TEXT,
  completed_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (property_id) REFERENCES properties(id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS unit_history (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL DEFAULT 'default',
  unit_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_data TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS images (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL DEFAULT 'default',
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  width INTEGER,
  height INTEGER,
  sort_order INTEGER DEFAULT 0,
  is_cover INTEGER DEFAULT 0,
  alt_text TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(entity_type, entity_id, r2_key)
);

CREATE TABLE IF NOT EXISTS site_api_tokens (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TEXT NOT NULL,
  last_used_at TEXT,
  expires_at TEXT,
  is_active INTEGER NOT NULL DEFAULT 1
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sites_domain ON sites(domain);
CREATE INDEX IF NOT EXISTS idx_sites_active ON sites(is_active);
CREATE INDEX IF NOT EXISTS idx_user_access_user ON user_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_access_site ON user_access(site_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_ai_score ON leads(ai_score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_property ON leads(property_id);
CREATE INDEX IF NOT EXISTS idx_leads_unit ON leads(unit_id);
CREATE INDEX IF NOT EXISTS idx_leads_site ON leads(site_id);
CREATE INDEX IF NOT EXISTS idx_lead_files_lead ON lead_files(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_files_site ON lead_files(site_id);
CREATE INDEX IF NOT EXISTS idx_lead_ai_evaluations_site ON lead_ai_evaluations(site_id);
CREATE INDEX IF NOT EXISTS idx_lead_history_lead_id ON lead_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_history_site_id ON lead_history(site_id);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_site ON tenants(site_id);
CREATE INDEX IF NOT EXISTS idx_leases_status ON leases(status);
CREATE INDEX IF NOT EXISTS idx_leases_property ON leases(property_id);
CREATE INDEX IF NOT EXISTS idx_leases_tenant ON leases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leases_unit ON leases(unit_id);
CREATE INDEX IF NOT EXISTS idx_leases_site ON leases(site_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_property ON work_orders(property_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_priority ON work_orders(priority);
CREATE INDEX IF NOT EXISTS idx_work_orders_site ON work_orders(site_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_site ON users(site_id);
CREATE INDEX IF NOT EXISTS idx_users_updated_at ON users(updated_at);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_properties_slug ON properties(slug);
CREATE INDEX IF NOT EXISTS idx_properties_type ON properties(property_type);
CREATE INDEX IF NOT EXISTS idx_properties_active ON properties(is_active);
CREATE INDEX IF NOT EXISTS idx_properties_city ON properties(city);
CREATE INDEX IF NOT EXISTS idx_properties_site ON properties(site_id);
CREATE INDEX IF NOT EXISTS idx_units_property ON units(property_id);
CREATE INDEX IF NOT EXISTS idx_units_status ON units(status);
CREATE INDEX IF NOT EXISTS idx_units_tenant ON units(current_tenant_id);
CREATE INDEX IF NOT EXISTS idx_units_active ON units(is_active);
CREATE INDEX IF NOT EXISTS idx_units_site ON units(site_id);
CREATE INDEX IF NOT EXISTS idx_unit_history_unit ON unit_history(unit_id);
CREATE INDEX IF NOT EXISTS idx_unit_history_type ON unit_history(event_type);
CREATE INDEX IF NOT EXISTS idx_unit_history_site ON unit_history(site_id);
CREATE INDEX IF NOT EXISTS idx_images_entity ON images(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_images_cover ON images(entity_type, entity_id, is_cover);
CREATE INDEX IF NOT EXISTS idx_images_site ON images(site_id);
CREATE INDEX IF NOT EXISTS idx_site_api_tokens_site_id ON site_api_tokens(site_id);
CREATE INDEX IF NOT EXISTS idx_site_api_tokens_token_hash ON site_api_tokens(token_hash);

-- Initialize default site
INSERT OR IGNORE INTO sites (
  site_id,
  name,
  is_active,
  created_at,
  updated_at
) VALUES (
  'default',
  'Default Site',
  1,
  datetime('now'),
  datetime('now')
);

-- Super Admin User for Preview Environment
-- Email: admin@leaselab.io
-- Password: (same as production)
INSERT OR IGNORE INTO users (
  id,
  email,
  name,
  password_hash,
  role,
  site_id,
  is_super_admin,
  created_at,
  updated_at
) VALUES (
  'user_admin',
  'admin@leaselab.io',
  'Admin User',
  'fc678c353cb774ba554562fdaa4e9afe66ca6c28430c469e6f7bb68b013eff4f',
  'admin',
  'default',
  1,
  datetime('now'),
  datetime('now')
);

-- Grant default site access to super admin
INSERT OR IGNORE INTO user_access (
  id,
  user_id,
  site_id,
  granted_at,
  granted_by
) VALUES (
  'access-admin-default',
  'user_admin',
  'default',
  datetime('now'),
  'system'
);
