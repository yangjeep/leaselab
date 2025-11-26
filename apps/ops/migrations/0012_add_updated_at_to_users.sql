-- Migration: Add updated_at column to users table

-- Users
ALTER TABLE users ADD COLUMN updated_at TEXT;
UPDATE users SET updated_at = datetime('now');
CREATE INDEX idx_users_updated_at ON users(updated_at);
