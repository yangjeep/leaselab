import type { DatabaseInput } from './helpers';
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
export declare function getSiteApiTokens(dbInput: DatabaseInput, siteId: string): Promise<SiteApiToken[]>;
/**
 * Get a single API token by ID
 */
export declare function getSiteApiTokenById(dbInput: DatabaseInput, siteId: string, tokenId: string): Promise<SiteApiToken | null>;
/**
 * Create a new API token
 * Returns both the token record and the plain-text token (only time it's visible!)
 */
export declare function createSiteApiToken(dbInput: DatabaseInput, siteId: string, data: {
    description: string;
    expiresAt?: string | null;
}): Promise<{
    token: string;
    record: SiteApiToken;
}>;
/**
 * Update API token (activate/deactivate or change description)
 */
export declare function updateSiteApiToken(dbInput: DatabaseInput, siteId: string, tokenId: string, data: {
    description?: string;
    isActive?: boolean;
}): Promise<void>;
/**
 * Delete (revoke) an API token
 */
export declare function deleteSiteApiToken(dbInput: DatabaseInput, siteId: string, tokenId: string): Promise<void>;
//# sourceMappingURL=site-tokens.d.ts.map