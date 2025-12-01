// Central export file for all database operations

// Re-export types and helpers
export type { DatabaseInput } from './helpers';
export { normalizeDb } from './helpers';

// Re-export all property operations
export {
    getProperties,
    getPropertyById,
    getPropertyBySlug,
    getPropertyWithUnits,
    createProperty,
    updateProperty,
    deleteProperty,
    getPublicListings,
} from './properties';

// Re-export all unit operations
export {
    getUnits,
    getUnitsByPropertyId,
    getUnitById,
    getUnitWithDetails,
    createUnit,
    updateUnit,
    deleteUnit,
    getUnitHistory,
    createUnitHistory,
} from './units';

// Re-export all image operations
export {
    getImagesByEntity,
    getImageById,
    createImage,
    updateImage,
    deleteImage,
    setCoverImage,
    addImageUrls,
    getImagesByEntityWithUrls,
    addImageUrlsWithVerification,
    getImagesByEntityWithVerification,
} from './images';

// Re-export all lead operations
export {
    getLeads,
    getLeadById,
    createLead,
    updateLead,
    getLeadFiles,
    createLeadFile,
    createTempLeadFile,
    associateFilesWithLead,
    countLeadFiles,
    getAIEvaluation,
    createAIEvaluation,
    getLeadHistory,
    recordLeadHistory,
} from './leads';

// Re-export all tenant operations
export {
    getTenants,
    getTenantById,
} from './tenants';

// Re-export all work order operations
export {
    getWorkOrders,
    getWorkOrderById,
    createWorkOrder,
    updateWorkOrder,
    deleteWorkOrder,
} from './work-orders';

// Re-export all user operations
export {
    getUserByEmail,
    getUserById,
    getUsers,
    createUser,
    updateUserPassword,
    updateUserProfile,
    updateUserRole,
    getUserSiteAccess,
    getUserAccessibleSites,
    userHasAccessToSite,
    grantSiteAccess,
    revokeSiteAccess,
    isUserSuperAdmin,
    setSuperAdminStatus,
} from './users';

// Re-export user access types
export type { AccessibleSite } from './users';

// Re-export all site token operations
export {
    getSiteApiTokens,
    getSiteApiTokenById,
    createSiteApiToken,
    updateSiteApiToken,
    deleteSiteApiToken,
} from './site-tokens';

// Re-export site token types
export type { SiteApiToken } from './site-tokens';

// Re-export lease module (placeholder)
export { LEASES_MODULE_PLACEHOLDER } from './leases';
