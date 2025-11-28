// import crypto from 'crypto'; // Use globalThis.crypto for Web Crypto API
import { hashToken, generateRandomToken } from '~/shared/utils';
import { API_TOKEN_SALT } from './env';
/**
 * Validates an API token and returns the associated site_id
 * @param token - The Bearer token from the Authorization header
 * @param db - Database connection
 * @returns site_id if valid, null if invalid
 */
export async function validateApiToken(token, db) {
    if (!token)
        return null;
    // Hash the token to compare with stored hash
    // Note: Since we need to query by hash, we can't use a random salt per record easily
    // unless we store the salt separately or iterate.
    // However, for API tokens, we usually want a deterministic hash for lookup.
    // BUT, the requirement is "insufficient computational effort".
    // If we use PBKDF2 with a FIXED salt (site-wide or hardcoded), we get the computational cost
    // but still allow lookup.
    // Ideally, we'd store salt with the token, but then we can't look it up by token efficiently without a secondary index.
    // Given the constraints and the "lookup by hash" pattern:
    // We will use a fixed salt for now to allow lookup, but increase iterations.
    // WARNING: This is a compromise. A better approach is to store a token ID (public) and a secret (private),
    // look up by ID, then verify secret with salted hash.
    // For this refactor, I will use a fixed application-level salt to enable lookup while slowing down brute force.


    const tokenHash = await hashToken(token, API_TOKEN_SALT);
    // Normalize db to IDatabase
    const normalizedDb = 'query' in db && typeof db.query === 'function'
        ? db
        : normalizeD1(db);
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
/**
 * Extracts the Bearer token from the Authorization header
 */
export function extractBearerToken(request) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader)
        return null;
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    return match ? match[1] : null;
}

/**
 * Generate a random API token
 */
export function generateApiToken() {
    return generateRandomToken(32);
}
/**
 * Helper to normalize D1Database to IDatabase interface
 */
function normalizeD1(d1) {
    return {
        async query(sql, params) {
            const stmt = d1.prepare(sql);
            const bound = params && params.length > 0 ? stmt.bind(...params) : stmt;
            const result = await bound.all();
            return result.results;
        },
        async queryOne(sql, params) {
            const stmt = d1.prepare(sql);
            const bound = params && params.length > 0 ? stmt.bind(...params) : stmt;
            const result = await bound.first();
            return result ?? null;
        },
        async execute(sql, params) {
            const stmt = d1.prepare(sql);
            const bound = params && params.length > 0 ? stmt.bind(...params) : stmt;
            const result = await bound.run();
            return {
                success: result.success,
                changes: result.meta.changes,
                lastRowId: result.meta.last_row_id,
            };
        },
        async transaction(fn) {
            return fn(this);
        },
        async batch(statements) {
            const stmts = statements.map(({ sql, params }) => {
                const stmt = d1.prepare(sql);
                return params && params.length > 0 ? stmt.bind(...params) : stmt;
            });
            const results = await d1.batch(stmts);
            return results.map((result) => ({
                success: result.success,
                changes: result.meta.changes,
                lastRowId: result.meta.last_row_id,
            }));
        },
        async close() { },
    };
}
