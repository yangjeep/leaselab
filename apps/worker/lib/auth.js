/**
 * API Token Validation for Worker
 *
 * Validates API tokens for public endpoints (/api/public/*)
 */
import { hashToken } from '~/shared/utils';
import { API_TOKEN_SALT } from '~/shared/constants';
import { normalizeDb } from './db/helpers';
/**
 * Validates an API token and returns the associated site_id
 * @param token - The Bearer token from the Authorization header
 * @param db - Database connection
 * @returns site_id if valid, null if invalid
 */
export async function validateApiToken(token, db) {
    if (!token) {
        return null;
    }
    const tokenHash = await hashToken(token, API_TOKEN_SALT);
    const normalizedDb = normalizeDb(db);
    try {
        const result = await normalizedDb.queryOne(`SELECT site_id, is_active, expires_at 
             FROM site_api_tokens 
             WHERE token_hash = ? AND is_active = 1`, [tokenHash]);
        if (!result) {
            return null;
        }
        // Check if token is expired
        if (result.expires_at) {
            const expiresAt = new Date(result.expires_at);
            if (expiresAt < new Date()) {
                return null;
            }
        }
        // Update last_used_at timestamp
        await normalizedDb.execute('UPDATE site_api_tokens SET last_used_at = ? WHERE token_hash = ?', [new Date().toISOString(), tokenHash]);
        return result.site_id;
    }
    catch (error) {
        console.error('Error validating API token:', error);
        return null;
    }
}
