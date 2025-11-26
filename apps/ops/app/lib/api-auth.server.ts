import type { IDatabase } from '~/shared/storage-core';
import type { DatabaseInput } from './db.server';
import crypto from 'crypto';

/**
 * Validates an API token and returns the associated site_id
 * @param token - The Bearer token from the Authorization header
 * @param db - Database connection
 * @returns site_id if valid, null if invalid
 */
export async function validateApiToken(token: string, db: DatabaseInput): Promise<string | null> {
    if (!token) return null;

    // Hash the token to compare with stored hash
    const tokenHash = hashToken(token);

    // Normalize db to IDatabase
    const normalizedDb = 'query' in db && typeof db.query === 'function'
        ? db as IDatabase
        : normalizeD1(db as D1Database);

    try {
        const result = await normalizedDb.queryOne<{
            site_id: string;
            is_active: number;
            expires_at: string | null;
        }>(
            `SELECT site_id, is_active, expires_at 
       FROM site_api_tokens 
       WHERE token_hash = ? AND is_active = 1`,
            [tokenHash]
        );

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
        await normalizedDb.execute(
            'UPDATE site_api_tokens SET last_used_at = ? WHERE token_hash = ?',
            [new Date().toISOString(), tokenHash]
        );

        return result.site_id;
    } catch (error) {
        console.error('Error validating API token:', error);
        return null;
    }
}

/**
 * Extracts the Bearer token from the Authorization header
 */
export function extractBearerToken(request: Request): string | null {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return null;

    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    return match ? match[1] : null;
}

/**
 * Hash a token using SHA-256
 */
export function hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generate a random API token
 */
export function generateApiToken(): string {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Helper to normalize D1Database to IDatabase interface
 */
function normalizeD1(d1: D1Database): IDatabase {
    return {
        async query<T = unknown>(sql: string, params?: unknown[]): Promise<T[]> {
            const stmt = d1.prepare(sql);
            const bound = params && params.length > 0 ? stmt.bind(...params) : stmt;
            const result = await bound.all<T>();
            return result.results;
        },
        async queryOne<T = unknown>(sql: string, params?: unknown[]): Promise<T | null> {
            const stmt = d1.prepare(sql);
            const bound = params && params.length > 0 ? stmt.bind(...params) : stmt;
            const result = await bound.first<T>();
            return result ?? null;
        },
        async execute(sql: string, params?: unknown[]) {
            const stmt = d1.prepare(sql);
            const bound = params && params.length > 0 ? stmt.bind(...params) : stmt;
            const result = await bound.run();
            return {
                success: result.success,
                changes: result.meta.changes,
                lastRowId: result.meta.last_row_id,
            };
        },
        async transaction<T>(fn: (tx: IDatabase) => Promise<T>): Promise<T> {
            return fn(this);
        },
        async batch(statements: Array<{ sql: string; params?: unknown[] }>) {
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
