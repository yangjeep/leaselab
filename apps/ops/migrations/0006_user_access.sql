-- Migration: Add user access control for multi-tenant super admin support
-- This migration creates the user_access table and adds super admin capability

-- Create user_access table to manage which users can access which sites
CREATE TABLE IF NOT EXISTS user_access (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  site_id TEXT NOT NULL,
  granted_at TEXT NOT NULL DEFAULT (datetime('now')),
  granted_by TEXT, -- user_id of who granted access (NULL for system-granted)
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, site_id)
);

-- Create indexes for user_access
CREATE INDEX IF NOT EXISTS idx_user_access_user ON user_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_access_site ON user_access(site_id);

-- Add super admin flag to users table
ALTER TABLE users ADD COLUMN is_super_admin INTEGER NOT NULL DEFAULT 0;

-- Populate user_access with existing user→site mappings
-- Every user gets access to their current site_id
INSERT INTO user_access (id, user_id, site_id, granted_by)
SELECT 
  lower(hex(randomblob(16))),
  id,
  site_id,
  NULL
FROM users;

-- Mark the default admin as a super admin
UPDATE users 
SET is_super_admin = 1 
WHERE email = 'admin@leaselab.io';

-- Grant the super admin access to the default site if not already present
INSERT OR IGNORE INTO user_access (id, user_id, site_id, granted_by)
SELECT 
  lower(hex(randomblob(16))),
  id,
  'default',
  NULL
FROM users 
WHERE email = 'admin@leaselab.io';
