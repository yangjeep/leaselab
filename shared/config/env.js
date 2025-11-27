/**
 * Shared Environment Bindings Configuration
 *
 * This file contains the centralized type definitions for Cloudflare bindings.
 * Use this single source of truth across all apps (worker, ops, site).
 */
/**
 * Bucket configuration helper
 */
export const BUCKET_CONFIG = {
    /**
     * Public bucket configuration
     */
    public: {
        binding: 'PUBLIC_BUCKET',
        name: 'leaselab-pub',
        description: 'Public bucket for property images',
        access: 'public-read',
        usedFor: ['property images', 'unit photos', 'gallery images'],
    },
    /**
     * Private bucket configuration
     */
    private: {
        binding: 'PRIVATE_BUCKET',
        name: 'leaselab-pri',
        description: 'Private bucket for confidential documents',
        access: 'signed-urls-only',
        usedFor: ['rental applications', 'lease agreements', 'N11 forms', 'tenant documents'],
    },
};
/**
 * Database configuration helper
 */
export const DATABASE_CONFIG = {
    binding: 'DB',
    name: 'leaselab-db',
    description: 'Main application database',
};
/**
 * Type guard to check if environment has required bindings
 */
export function hasRequiredBindings(env) {
    return !!(env.DB &&
        env.PUBLIC_BUCKET &&
        env.PRIVATE_BUCKET &&
        env.OPENAI_API_KEY &&
        env.SESSION_SECRET);
}
/**
 * Type guard to check if environment has R2 bindings
 */
export function hasR2Bindings(env) {
    return !!(env.PUBLIC_BUCKET && env.PRIVATE_BUCKET);
}
/**
 * Type guard to check if environment has D1 binding
 */
export function hasD1Binding(env) {
    return !!env.DB;
}
