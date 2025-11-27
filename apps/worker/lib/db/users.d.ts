import type { User } from '../../../../shared/types';
import type { DatabaseInput } from './helpers';
export interface AccessibleSite {
    siteId: string;
    role: string;
}
export declare function getUserByEmail(dbInput: DatabaseInput, siteId: string, email: string): Promise<User | null>;
export declare function getUserById(dbInput: DatabaseInput, siteId: string, id: string): Promise<User | null>;
export declare function getUsers(dbInput: DatabaseInput): Promise<User[]>;
export declare function updateUserPassword(dbInput: DatabaseInput, siteId: string, userId: string, passwordHash: string): Promise<void>;
export declare function updateUserProfile(dbInput: DatabaseInput, siteId: string, userId: string, data: {
    name?: string;
    email?: string;
}): Promise<void>;
/**
 * Get site access records for a user
 */
export declare function getUserSiteAccess(dbInput: DatabaseInput, userId: string): Promise<AccessibleSite[]>;
/**
 * Get all accessible sites for a user (including via super admin status or direct access)
 */
export declare function getUserAccessibleSites(dbInput: DatabaseInput, userId: string): Promise<AccessibleSite[]>;
/**
 * Check if a user has access to a specific site
 */
export declare function userHasAccessToSite(dbInput: DatabaseInput, userId: string, siteId: string): Promise<boolean>;
/**
 * Grant site access to a user
 */
export declare function grantSiteAccess(dbInput: DatabaseInput, userId: string, siteId: string, role?: string): Promise<void>;
/**
 * Revoke site access from a user
 */
export declare function revokeSiteAccess(dbInput: DatabaseInput, userId: string, siteId: string): Promise<void>;
/**
 * Check if a user is a super admin
 */
export declare function isUserSuperAdmin(dbInput: DatabaseInput, userId: string): Promise<boolean>;
/**
 * Set/unset super admin status for a user
 */
export declare function setSuperAdminStatus(dbInput: DatabaseInput, userId: string, isSuperAdmin: boolean): Promise<void>;
//# sourceMappingURL=users.d.ts.map