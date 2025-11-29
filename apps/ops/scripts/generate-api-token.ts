#!/usr/bin/env node
import crypto from 'crypto';

/**
 * Generate a secure API token
 * Format: sk_{site_id}_{64_hex_chars}
 */
function generateToken(siteId: string = 'default'): string {
    const randomBytes = crypto.randomBytes(32);
    return `sk_${siteId}_${randomBytes.toString('hex')}`;
}

import { hashToken } from '../../../shared/utils/crypto.js';
import { API_TOKEN_SALT } from '../../../shared/constants.js';

/**
 * Hash a token using PBKDF2-SHA256 (via shared utils)
 */
async function hashTokenSecure(token: string): Promise<string> {
    return await hashToken(token, API_TOKEN_SALT);
}

/**
 * Generate a unique ID for the token
 */
function generateId(): string {
    return `token_${crypto.randomBytes(8).toString('hex')}`;
}

// Main execution
const siteId = process.argv[2] || 'default';
const description = process.argv[3] || `API token for ${siteId} site`;

(async () => {
    const token = generateToken(siteId);
    const tokenHash = await hashTokenSecure(token);
    const id = generateId();
    const now = new Date().toISOString();

    console.log('\n========================================');
    console.log('API Token Generated Successfully!');
    console.log('========================================\n');
    console.log('Token ID:', id);
    console.log('Site ID:', siteId);
    console.log('Description:', description);
    console.log('\n⚠️  IMPORTANT: Save this token securely - it will only be shown once!\n');
    console.log('Plain Token:', token);
    console.log('\n========================================\n');
    console.log('To insert into database, run:\n');
    console.log(`wrangler d1 execute leaselab-db --remote --command "INSERT INTO site_api_tokens (id, site_id, token_hash, description, created_at, is_active) VALUES ('${id}', '${siteId}', '${tokenHash}', '${description}', '${now}', 1)"`);
    console.log('\n========================================\n');
    console.log('To add to apps/site configuration:\n');
    console.log('1. Add to wrangler.toml:');
    console.log(`   SITE_API_TOKEN = "${token}"`);
    console.log('\n2. Or set as Cloudflare secret (recommended):');
    console.log(`   wrangler pages secret put SITE_API_TOKEN`);
    console.log('   Then paste:', token);
    console.log('\n========================================\n');
})();
