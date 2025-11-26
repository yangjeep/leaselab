-- Migration 0008: Add API Tokens table
-- This enables token-based authentication for the CRUD worker

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

CREATE INDEX idx_site_api_tokens_site_id ON site_api_tokens(site_id);
CREATE INDEX idx_site_api_tokens_token_hash ON site_api_tokens(token_hash);

-- Generate a secure token for the default site
-- Token will be generated via script and inserted separately
-- Format: sk_default_<64_hex_chars>
