-- Migration: Reset hashes to PBKDF2
-- Date: 2025-11-27
-- Description: Updates admin password to PBKDF2 hash and clears invalid API tokens
-- Idempotent: Safe to run multiple times

-- Update admin password (4*X9j3DUizzAB_j8)
UPDATE users 
SET password_hash = '42dfaf4fe4c6f4f9f8c4b72607bc7b4f:75116691ac7025c229a4165bfd5f0073e4e3fa80b7014677f6f16ab1231f8aeb' 
WHERE email = 'admin@leaselab.io';

-- Update dwx.realty@gmail.com password (LeaseLab2024!Admin)
UPDATE users 
SET password_hash = 'ed641eef97a1fda7239fb4b229aa33bb:0be4ab840a74da6edf2b5ac307eb61fc3003b8974e20be23b2702288b9cd0d6c' 
WHERE email = 'dwx.realty@gmail.com';

-- Clear all API tokens as they are now invalid (SHA-256 vs PBKDF2)
DELETE FROM site_api_tokens;
