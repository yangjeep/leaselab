#!/usr/bin/env node

/**
 * Script to generate API tokens for site authentication
 * Usage: node generate-token.js <site-id> [token-name]
 */

import crypto from 'crypto';

// Fixed salt matching shared/constants.ts
const API_TOKEN_SALT = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);

function hashToken(token) {
    // Use PBKDF2-SHA256 with 100,000 iterations to match application logic
    // Key length 32 bytes (256 bits)
    const derivedKey = crypto.pbkdf2Sync(token, API_TOKEN_SALT, 100000, 32, 'sha256');
    return derivedKey.toString('hex');
}

function generateApiToken() {
    return crypto.randomBytes(32).toString('hex');
}

const siteId = process.argv[2];
const tokenName = process.argv[3] || 'Default Token';

if (!siteId) {
    console.error('Usage: node generate-token.js <site-id> [token-name]');
    console.error('Example: node generate-token.js default "Production Site Token"');
    process.exit(1);
}

const token = generateApiToken();
const tokenHash = hashToken(token);
const tokenId = crypto.randomBytes(8).toString('hex');

console.log('\n=== API Token Generated ===\n');
console.log('Site ID:', siteId);
console.log('Token Name:', tokenName);
console.log('Token ID:', tokenId);
console.log('\n--- IMPORTANT: Save this token NOW ---');
console.log('API Token:', token);
console.log('This token will NOT be shown again!\n');

console.log('=== SQL to insert into database ===\n');
console.log(`INSERT INTO site_api_tokens (id, site_id, token_hash, token_name, is_active, created_at)
VALUES (
  '${tokenId}',
  '${siteId}',
  '${tokenHash}',
  '${tokenName}',
  1,
  datetime('now')
);`);

console.log('\n=== To insert this token locally ===\n');
console.log(`cd apps/ops`);
console.log(`npx wrangler d1 execute DB --local --command "INSERT INTO site_api_tokens (id, site_id, token_hash, token_name, is_active, created_at) VALUES ('${tokenId}', '${siteId}', '${tokenHash}', '${tokenName}', 1, datetime('now'));"`);

console.log('\n=== Environment variable for apps/site ===\n');
console.log(`SITE_API_TOKEN=${token}`);
console.log('\nAdd this to apps/site/.env.local or your environment configuration.\n');
