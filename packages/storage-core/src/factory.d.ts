import type { IDatabase, DatabaseConfig } from './database';
import type { ICache, CacheConfig } from './cache';
import type { IObjectStore, ObjectStoreConfig } from './object-store';
/**
 * Complete storage configuration
 */
export interface StorageConfig {
    database?: DatabaseConfig;
    cache?: CacheConfig;
    objectStore?: ObjectStoreConfig;
}
/**
 * Storage provider instances
 */
export interface StorageProvider {
    database?: IDatabase;
    cache?: ICache;
    objectStore?: IObjectStore;
}
/**
 * Registry of provider factory functions
 */
export type DatabaseFactory = (config: DatabaseConfig) => IDatabase;
export type CacheFactory = (config: CacheConfig) => ICache;
export type ObjectStoreFactory = (config: ObjectStoreConfig) => IObjectStore;
/**
 * Provider registry for registering implementations
 */
export interface ProviderRegistry {
    databases: Map<string, DatabaseFactory>;
    caches: Map<string, CacheFactory>;
    objectStores: Map<string, ObjectStoreFactory>;
}
/**
 * Register a database provider implementation
 * @param name - Provider name (e.g., 'cloudflare-d1', 'postgresql')
 * @param factory - Factory function to create the database instance
 */
export declare function registerDatabaseProvider(name: string, factory: DatabaseFactory): void;
/**
 * Register a cache provider implementation
 * @param name - Provider name (e.g., 'cloudflare-kv', 'redis')
 * @param factory - Factory function to create the cache instance
 */
export declare function registerCacheProvider(name: string, factory: CacheFactory): void;
/**
 * Register an object store provider implementation
 * @param name - Provider name (e.g., 'cloudflare-r2', 's3')
 * @param factory - Factory function to create the object store instance
 */
export declare function registerObjectStoreProvider(name: string, factory: ObjectStoreFactory): void;
/**
 * Create a database instance from configuration
 * @param config - Database configuration
 * @returns Database instance
 * @throws Error if provider is not registered
 */
export declare function createDatabase(config: DatabaseConfig): IDatabase;
/**
 * Create a cache instance from configuration
 * @param config - Cache configuration
 * @returns Cache instance
 * @throws Error if provider is not registered
 */
export declare function createCache(config: CacheConfig): ICache;
/**
 * Create an object store instance from configuration
 * @param config - Object store configuration
 * @returns Object store instance
 * @throws Error if provider is not registered
 */
export declare function createObjectStore(config: ObjectStoreConfig): IObjectStore;
/**
 * Create all storage providers from a complete configuration
 * @param config - Complete storage configuration
 * @returns Storage provider instances
 */
export declare function createStorageProvider(config: StorageConfig): StorageProvider;
/**
 * Get the current provider registry (for debugging/testing)
 */
export declare function getRegistry(): Readonly<ProviderRegistry>;
/**
 * Clear all registered providers (for testing)
 */
export declare function clearRegistry(): void;
//# sourceMappingURL=factory.d.ts.map