/**
 * Shared Environment Bindings Configuration
 *
 * This file contains the centralized type definitions for Cloudflare bindings.
 * Use this single source of truth across all apps (worker, ops, site).
 */
/**
 * Cloudflare R2 Bucket Bindings
 * These are the R2 buckets used across the application
 */
export interface R2Bindings {
    /**
     * Public bucket for property images and publicly accessible files
     * Bucket name: leaselab-pub
     * Access: Public read, requires auth for write
     */
    PUBLIC_BUCKET: R2Bucket;
    /**
     * Private bucket for applications, leases, N11s, and confidential documents
     * Bucket name: leaselab-pri
     * Access: Signed URLs only, requires auth for all operations
     */
    PRIVATE_BUCKET: R2Bucket;
}
/**
 * Cloudflare D1 Database Bindings
 */
export interface D1Bindings {
    /**
     * Main application database
     * Database name: leaselab-db
     */
    DB: D1Database;
}
/**
 * Environment Variables
 */
export interface EnvVars {
    /**
     * Public URL for R2 bucket (for direct image access)
     * Example: https://pub-xxxx.r2.dev or https://images.yourdomain.com
     */
    R2_PUBLIC_URL?: string;
    /**
     * OpenAI API key for AI evaluation
     */
    OPENAI_API_KEY: string;
    /**
     * Session secret for cookie signing
     */
    SESSION_SECRET: string;
    /**
     * Environment name (development, preview, production)
     */
    ENVIRONMENT: string;
    /**
     * Internal authentication key for worker-to-ops communication
     */
    WORKER_INTERNAL_KEY?: string;
    /**
     * Site API token for site-to-worker authentication
     */
    SITE_API_TOKEN?: string;
    /**
     * Worker URL for API calls from ops
     */
    WORKER_URL: string;
}
/**
 * Complete Cloudflare Environment
 * This is the full environment available in Cloudflare Workers/Pages
 */
export interface CloudflareEnv extends D1Bindings, R2Bindings, EnvVars {
}
/**
 * Ops App Environment (no D1, only R2 for file uploads)
 * Ops app accesses all data through Worker API, only needs R2 for direct file uploads
 */
export interface OpsEnv extends R2Bindings, EnvVars {
}
/**
 * Optional Cloudflare Environment (for routes that may not need all bindings)
 */
export interface PartialCloudflareEnv extends D1Bindings, Partial<R2Bindings>, Partial<EnvVars> {
}
/**
 * Bucket configuration helper
 */
export declare const BUCKET_CONFIG: {
    /**
     * Public bucket configuration
     */
    readonly public: {
        readonly binding: "PUBLIC_BUCKET";
        readonly name: "leaselab-pub";
        readonly description: "Public bucket for property images";
        readonly access: "public-read";
        readonly usedFor: readonly ["property images", "unit photos", "gallery images"];
    };
    /**
     * Private bucket configuration
     */
    readonly private: {
        readonly binding: "PRIVATE_BUCKET";
        readonly name: "leaselab-pri";
        readonly description: "Private bucket for confidential documents";
        readonly access: "signed-urls-only";
        readonly usedFor: readonly ["rental applications", "lease agreements", "N11 forms", "tenant documents"];
    };
};
/**
 * Database configuration helper
 */
export declare const DATABASE_CONFIG: {
    readonly binding: "DB";
    readonly name: "leaselab-db";
    readonly description: "Main application database";
};
/**
 * Type guard to check if environment has required bindings
 */
export declare function hasRequiredBindings(env: any): env is CloudflareEnv;
/**
 * Type guard to check if environment has R2 bindings
 */
export declare function hasR2Bindings(env: any): env is R2Bindings;
/**
 * Type guard to check if environment has D1 binding
 */
export declare function hasD1Binding(env: any): env is D1Bindings;
//# sourceMappingURL=env.d.ts.map