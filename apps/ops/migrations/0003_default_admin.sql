-- Migration: Create default admin user
-- Default credentials: admin@leaselab.io / admin123
-- ⚠️ IMPORTANT: Change this password immediately after first login!

-- Password hash for 'admin123' (SHA-256)
-- Generated with: echo -n 'admin123' | sha256sum
INSERT INTO users (id, email, password_hash, name, role, created_at)
VALUES (
  'user_admin',
  'admin@leaselab.io',
  '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
  'Admin User',
  'admin',
  datetime('now')
)
ON CONFLICT(email) DO NOTHING;

-- Create index on role for faster admin lookups
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
