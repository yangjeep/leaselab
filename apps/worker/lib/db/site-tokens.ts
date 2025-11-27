import { generateId } from '../../../../shared/utils';
import type { DatabaseInput } from './helpers';
import { normalizeDb } from './helpers';

export interface SiteApiToken {
    id: string;
    siteId: string;
    tokenHash: string;
    description: string | null;
    createdAt: string;
    lastUsedAt: string | null;
    expiresAt: string | null;
    isActive: number;
}

/**
 * Get all API tokens for a site
 */
export async function getSiteApiTokens(
    dbInput: DatabaseInput,
    siteId: string
): Promise<SiteApiToken[]> {
    const db = normalizeDb(dbInput);
    const results = await db.query<SiteApiToken>(
        `SELECT id, site_id as siteId, token_hash as tokenHash, description,
            created_at as createdAt, last_used_at as lastUsedAt,
            expires_at as expiresAt, is_active as isActive
     FROM site_api_tokens
     WHERE site_id = ?
     ORDER BY created_at DESC`,
        [siteId]
    );
    return results;
}

/**
 * Get a single API token by ID
 */
export async function getSiteApiTokenById(
    dbInput: DatabaseInput,
    siteId: string,
    tokenId: string
): Promise<SiteApiToken | null> {
    const db = normalizeDb(dbInput);
    const result = await db.queryOne<SiteApiToken>(
        `SELECT id, site_id as siteId, token_hash as tokenHash, description,
            created_at as createdAt, last_used_at as lastUsedAt,
            expires_at as expiresAt, is_active as isActive
     FROM site_api_tokens
     WHERE id = ? AND site_id = ?`,
        [tokenId, siteId]
    );
    return result;
}

/**
 * Create a new API token
 * Returns both the token record and the plain-text token (only time it's visible!)
 */
export async function createSiteApiToken(
    dbInput: DatabaseInput,
    siteId: string,
    data: {
        description: string;
        expiresAt?: string | null;
    }
): Promise<{ token: string; record: SiteApiToken }> {
    const db = normalizeDb(dbInput);

    // Import crypto functions
    const { generateApiToken, hashToken } = await import('../../../ops/app/lib/api-auth.server.js');

    const tokenId = generateId('tok');
    const plainToken = generateApiToken();
    const tokenHash = hashToken(plainToken);
    const now = new Date().toISOString();

    await db.execute(
        `INSERT INTO site_api_tokens (id, site_id, token_hash, description, is_active, created_at, expires_at)
     VALUES (?, ?, ?, ?, 1, ?, ?)`,
        [tokenId, siteId, tokenHash, data.description, now, data.expiresAt || null]
    );

    const record: SiteApiToken = {
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
export async function updateSiteApiToken(
    dbInput: DatabaseInput,
    siteId: string,
    tokenId: string,
    data: {
        description?: string;
        isActive?: boolean;
    }
): Promise<void> {
    const db = normalizeDb(dbInput);
    const updates: string[] = [];
    const params: (string | number)[] = [];

    if (data.description !== undefined) {
        updates.push('description = ?');
        params.push(data.description);
    }

    if (data.isActive !== undefined) {
        updates.push('is_active = ?');
        params.push(data.isActive ? 1 : 0);
    }

    if (updates.length === 0) return;

    params.push(tokenId, siteId);

    await db.execute(
        `UPDATE site_api_tokens SET ${updates.join(', ')} WHERE id = ? AND site_id = ?`,
        params
    );
}

/**
 * Delete (revoke) an API token
 */
export async function deleteSiteApiToken(
    dbInput: DatabaseInput,
    siteId: string,
    tokenId: string
): Promise<void> {
    const db = normalizeDb(dbInput);
    await db.execute(
        'DELETE FROM site_api_tokens WHERE id = ? AND site_id = ?',
        [tokenId, siteId]
    );
}
