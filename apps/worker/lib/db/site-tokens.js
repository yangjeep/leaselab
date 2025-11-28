import { generateId } from '../../../../shared/utils';
import { normalizeDb } from './helpers';
/**
 * Get all API tokens for a site
 */
export async function getSiteApiTokens(dbInput, siteId) {
    const db = normalizeDb(dbInput);
    const results = await db.query(`SELECT id, site_id as siteId, token_hash as tokenHash, description,
            created_at as createdAt, last_used_at as lastUsedAt,
            expires_at as expiresAt, is_active as isActive
     FROM site_api_tokens
     WHERE site_id = ?
     ORDER BY created_at DESC`, [siteId]);
    return results;
}
/**
 * Get a single API token by ID
 */
export async function getSiteApiTokenById(dbInput, siteId, tokenId) {
    const db = normalizeDb(dbInput);
    const result = await db.queryOne(`SELECT id, site_id as siteId, token_hash as tokenHash, description,
            created_at as createdAt, last_used_at as lastUsedAt,
            expires_at as expiresAt, is_active as isActive
     FROM site_api_tokens
     WHERE id = ? AND site_id = ?`, [tokenId, siteId]);
    return result;
}
/**
 * Create a new API token
 * Returns both the token record and the plain-text token (only time it's visible!)
 */
export async function createSiteApiToken(dbInput, siteId, data) {
    const db = normalizeDb(dbInput);
    // Import crypto functions
    const { hashToken, generateRandomToken } = await import('../../../../shared/utils');
    const { API_TOKEN_SALT } = await import('../../../../shared/constants');
    const tokenId = generateId('tok');
    const plainToken = generateRandomToken(32);
    const tokenHash = await hashToken(plainToken, API_TOKEN_SALT);
    const now = new Date().toISOString();
    await db.execute(`INSERT INTO site_api_tokens (id, site_id, token_hash, description, is_active, created_at, expires_at)
     VALUES (?, ?, ?, ?, 1, ?, ?)`, [tokenId, siteId, tokenHash, data.description, now, data.expiresAt || null]);
    const record = {
        id: tokenId,
        siteId,
        tokenHash,
        description: data.description,
        createdAt: now,
        lastUsedAt: null,
        expiresAt: data.expiresAt || null,
        isActive: 1,
    };
    return { token: plainToken, record };
}
/**
 * Update API token (activate/deactivate or change description)
 */
export async function updateSiteApiToken(dbInput, siteId, tokenId, data) {
    const db = normalizeDb(dbInput);
    const updates = [];
    const params = [];
    if (data.description !== undefined) {
        updates.push('description = ?');
        params.push(data.description);
    }
    if (data.isActive !== undefined) {
        updates.push('is_active = ?');
        params.push(data.isActive ? 1 : 0);
    }
    if (updates.length === 0)
        return;
    params.push(tokenId, siteId);
    await db.execute(`UPDATE site_api_tokens SET ${updates.join(', ')} WHERE id = ? AND site_id = ?`, params);
}
/**
 * Delete (revoke) an API token
 */
export async function deleteSiteApiToken(dbInput, siteId, tokenId) {
    const db = normalizeDb(dbInput);
    await db.execute('DELETE FROM site_api_tokens WHERE id = ? AND site_id = ?', [tokenId, siteId]);
}
