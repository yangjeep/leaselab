import type { Lead, LeadFile, LeadAIResult, LeadHistory, Property, Tenant, WorkOrder, User, Unit, UnitHistory, PropertyImage, UnitStatus, UnitEventType } from '~/shared/types';
import type { IDatabase } from '~/shared/storage-core';
export type DatabaseInput = D1Database | IDatabase;
export declare function getLeads(dbInput: DatabaseInput, siteId: string, options?: {
    status?: string;
    propertyId?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
}): Promise<Lead[]>;
export declare function getLeadById(dbInput: DatabaseInput, siteId: string, id: string): Promise<Lead | null>;
export declare function createLead(dbInput: DatabaseInput, siteId: string, data: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'aiScore' | 'aiLabel' | 'status'>): Promise<Lead>;
export declare function updateLead(dbInput: DatabaseInput, siteId: string, id: string, data: Partial<Lead>): Promise<void>;
export declare function getLeadFiles(dbInput: DatabaseInput, siteId: string, leadId: string): Promise<LeadFile[]>;
export declare function createLeadFile(dbInput: DatabaseInput, siteId: string, data: Omit<LeadFile, 'id' | 'uploadedAt'>): Promise<LeadFile>;
export declare function getAIEvaluation(dbInput: DatabaseInput, siteId: string, leadId: string): Promise<LeadAIResult | null>;
export declare function createAIEvaluation(dbInput: DatabaseInput, siteId: string, data: Omit<LeadAIResult, 'id' | 'evaluatedAt'>): Promise<LeadAIResult>;
export declare function getProperties(dbInput: DatabaseInput, siteId: string, options?: {
    isActive?: boolean;
    propertyType?: string;
    city?: string;
}): Promise<Property[]>;
export declare function getPropertyById(dbInput: DatabaseInput, siteId: string, id: string): Promise<Property | null>;
export declare function getPropertyBySlug(dbInput: DatabaseInput, siteId: string, slug: string): Promise<Property | null>;
export declare function getPropertyWithUnits(dbInput: DatabaseInput, siteId: string, id: string): Promise<Property | null>;
export declare function createProperty(dbInput: DatabaseInput, siteId: string, data: {
    name: string;
    address: string;
    city: string;
    province: string;
    postalCode: string;
    propertyType: string;
    description?: string;
    yearBuilt?: number;
    lotSize?: number;
    amenities?: string[];
    latitude?: number;
    longitude?: number;
}): Promise<Property>;
export declare function updateProperty(dbInput: DatabaseInput, siteId: string, id: string, data: Partial<{
    name: string;
    address: string;
    city: string;
    province: string;
    postalCode: string;
    propertyType: string;
    description: string;
    yearBuilt: number;
    lotSize: number;
    amenities: string[];
    latitude: number;
    longitude: number;
    isActive: boolean;
}>): Promise<void>;
export declare function deleteProperty(dbInput: DatabaseInput, siteId: string, id: string): Promise<void>;
export declare function getPublicListings(dbInput: DatabaseInput, siteId: string, filters?: {
    city?: string;
    status?: string;
}, r2PublicUrl?: string): Promise<any[]>;
export declare function getUnits(dbInput: DatabaseInput, siteId: string, options?: {
    propertyId?: string;
    status?: UnitStatus;
    isActive?: boolean;
}): Promise<Unit[]>;
export declare function getUnitsByPropertyId(dbInput: DatabaseInput, siteId: string, propertyId: string): Promise<Unit[]>;
export declare function getUnitById(dbInput: DatabaseInput, siteId: string, id: string): Promise<Unit | null>;
export declare function getUnitWithDetails(dbInput: DatabaseInput, siteId: string, id: string): Promise<Unit | null>;
export declare function createUnit(dbInput: DatabaseInput, siteId: string, data: {
    propertyId: string;
    unitNumber: string;
    name?: string;
    bedrooms: number;
    bathrooms: number;
    sqft?: number;
    rentAmount: number;
    depositAmount?: number;
    status?: UnitStatus;
    floor?: number;
    features?: string[];
    availableDate?: string;
}): Promise<Unit>;
export declare function updateUnit(dbInput: DatabaseInput, siteId: string, id: string, data: Partial<{
    unitNumber: string;
    name: string;
    bedrooms: number;
    bathrooms: number;
    sqft: number;
    rentAmount: number;
    depositAmount: number;
    status: UnitStatus;
    floor: number;
    features: string[];
    availableDate: string;
    currentTenantId: string | null;
    isActive: boolean;
}>): Promise<void>;
export declare function deleteUnit(dbInput: DatabaseInput, siteId: string, id: string): Promise<void>;
export declare function getUnitHistory(dbInput: DatabaseInput, siteId: string, unitId: string): Promise<UnitHistory[]>;
export declare function createUnitHistory(dbInput: DatabaseInput, siteId: string, data: {
    unitId: string;
    eventType: UnitEventType;
    eventData: Record<string, unknown>;
}): Promise<UnitHistory>;
export declare function getImagesByEntity(dbInput: DatabaseInput, siteId: string, entityType: 'property' | 'unit', entityId: string): Promise<PropertyImage[]>;
export declare function getImageById(dbInput: DatabaseInput, siteId: string, id: string): Promise<PropertyImage | null>;
export declare function createImage(dbInput: DatabaseInput, siteId: string, data: {
    entityType: 'property' | 'unit';
    entityId: string;
    r2Key: string;
    filename: string;
    contentType: string;
    sizeBytes: number;
    width?: number;
    height?: number;
    sortOrder?: number;
    isCover?: boolean;
    altText?: string;
}): Promise<PropertyImage>;
export declare function updateImage(dbInput: DatabaseInput, siteId: string, id: string, data: Partial<{
    sortOrder: number;
    isCover: boolean;
    altText: string;
}>): Promise<void>;
export declare function deleteImage(dbInput: DatabaseInput, siteId: string, id: string): Promise<void>;
export declare function setCoverImage(dbInput: DatabaseInput, siteId: string, entityType: 'property' | 'unit', entityId: string, imageId: string): Promise<void>;
export declare function getWorkOrders(dbInput: DatabaseInput, siteId: string, options?: {
    status?: string;
    propertyId?: string;
}): Promise<WorkOrder[]>;
export declare function getWorkOrderById(dbInput: DatabaseInput, siteId: string, id: string): Promise<WorkOrder | null>;
export declare function createWorkOrder(dbInput: DatabaseInput, siteId: string, data: Omit<WorkOrder, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<WorkOrder>;
export declare function updateWorkOrder(dbInput: DatabaseInput, siteId: string, id: string, data: Partial<WorkOrder>): Promise<void>;
export declare function deleteWorkOrder(dbInput: DatabaseInput, siteId: string, id: string): Promise<void>;
export declare function getTenants(dbInput: DatabaseInput, siteId: string, options?: {
    status?: string;
    propertyId?: string;
    unitId?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}): Promise<Tenant[]>;
export declare function getTenantById(dbInput: DatabaseInput, siteId: string, id: string): Promise<Tenant | null>;
export declare function getUserByEmail(dbInput: DatabaseInput, siteId: string, email: string): Promise<User | null>;
export declare function getUserById(dbInput: DatabaseInput, siteId: string, id: string): Promise<User | null>;
export declare function getUsers(dbInput: DatabaseInput): Promise<User[]>;
export declare function updateUserPassword(dbInput: DatabaseInput, siteId: string, userId: string, passwordHash: string): Promise<void>;
export declare function updateUserProfile(dbInput: DatabaseInput, siteId: string, userId: string, data: {
    name?: string;
    email?: string;
}): Promise<void>;
export declare function getLeadHistory(dbInput: DatabaseInput, siteId: string, leadId: string): Promise<LeadHistory[]>;
export declare function recordLeadHistory(dbInput: DatabaseInput, siteId: string, leadId: string, eventType: string, eventData: Record<string, unknown>): Promise<void>;
export interface UserAccess {
    id: string;
    userId: string;
    siteId: string;
    grantedAt: string;
    grantedBy: string | null;
}
export interface AccessibleSite {
    siteId: string;
    grantedAt: string;
}
/**
 * Get all site access records for a specific user
 */
export declare function getUserSiteAccess(dbInput: DatabaseInput, userId: string): Promise<UserAccess[]>;
/**
 * Get all accessible sites for a user (returns site_id list)
 */
export declare function getUserAccessibleSites(dbInput: DatabaseInput, userId: string): Promise<AccessibleSite[]>;
/**
 * Check if a user has access to a specific site
 */
export declare function userHasAccessToSite(dbInput: DatabaseInput, userId: string, siteId: string): Promise<boolean>;
/**
 * Grant site access to a user
 */
export declare function grantSiteAccess(dbInput: DatabaseInput, userId: string, siteId: string, grantedBy: string): Promise<UserAccess>;
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
//# sourceMappingURL=db.server.d.ts.map