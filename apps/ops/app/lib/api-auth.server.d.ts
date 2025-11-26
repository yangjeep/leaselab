import type { DatabaseInput } from './db.server';
/**
 * Validates an API token and returns the associated site_id
 * @param token - The Bearer token from the Authorization header
 * @param db - Database connection
 * @returns site_id if valid, null if invalid
 */
export declare function validateApiToken(token: string, db: DatabaseInput): Promise<string | null>;
/**
 * Extracts the Bearer token from the Authorization header
 */
export declare function extractBearerToken(request: Request): string | null;
/**
 * Hash a token using SHA-256
 */
export declare function hashToken(token: string): string;
/**
 * Generate a random API token
 */
export declare function generateApiToken(): string;
//# sourceMappingURL=api-auth.server.d.ts.map