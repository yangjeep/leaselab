-- Migration: Add site configuration and API token tables
-- This migration adds support for site-specific branding, about pages,
-- and token-based API authentication for the public site application.

-- Site configurations table
-- Stores site-specific branding and content configuration
CREATE TABLE IF NOT EXISTS site_configs (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL UNIQUE,
  site_name TEXT NOT NULL,
  about_title TEXT,
  about_description TEXT,
  about_stats TEXT DEFAULT '[]', -- JSON array of {label, value} objects
  branding_logo_url TEXT,
  branding_primary_color TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_site_configs_site_id ON site_configs(site_id);

-- Site API tokens table
-- Stores API tokens for authenticating public site API requests
CREATE TABLE IF NOT EXISTS site_api_tokens (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE, -- SHA-256 hash of the actual token
  token_name TEXT NOT NULL, -- Descriptive name for the token
  is_active INTEGER NOT NULL DEFAULT 1, -- 1 = active, 0 = inactive
  last_used_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT, -- NULL means no expiration
  FOREIGN KEY (site_id) REFERENCES site_configs(site_id)
);

CREATE INDEX IF NOT EXISTS idx_site_api_tokens_site_id ON site_api_tokens(site_id);
CREATE INDEX IF NOT EXISTS idx_site_api_tokens_token_hash ON site_api_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_site_api_tokens_active ON site_api_tokens(is_active);

-- Insert default site configuration
INSERT INTO site_configs (id, site_id, site_name, about_title, about_description, about_stats)
VALUES (
  'cfg_default',
  'default',
  'LeaseLab Property Management',
  'About Us',
  'We are a professional property management company dedicated to providing quality rental homes for families and individuals. Our properties are well-maintained and located in desirable neighborhoods.',
  '[{"label":"Properties Managed","value":"100+"},{"label":"Happy Tenants","value":"500+"},{"label":"Years Experience","value":"10+"}]'
);

-- Note: API tokens should be generated via admin UI or CLI script
-- Example token generation (to be done separately):
-- The actual token should be a random string (e.g., UUID or crypto.randomBytes)
-- Only the hash is stored in the database for security
