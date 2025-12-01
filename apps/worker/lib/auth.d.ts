/**
 * API Token Validation for Worker
 *
 * Validates API tokens for public endpoints (/api/public/*)
 */
import type { DatabaseInput } from './db/helpers';
/**
 * Validates an API token and returns the associated site_id
 * @param token - The Bearer token from the Authorization header
 * @param db - Database connection
 * @returns site_id if valid, null if invalid
 */
export declare function validateApiToken(token: string | null | undefined, db: DatabaseInput): Promise<string | null>;
//# sourceMappingURL=auth.d.ts.map