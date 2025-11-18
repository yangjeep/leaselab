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
 * Global provider registry
 */
const registry: ProviderRegistry = {
  databases: new Map(),
  caches: new Map(),
  objectStores: new Map(),
};

/**
 * Register a database provider implementation
 * @param name - Provider name (e.g., 'cloudflare-d1', 'postgresql')
 * @param factory - Factory function to create the database instance
 */
export function registerDatabaseProvider(name: string, factory: DatabaseFactory): void {
  registry.databases.set(name, factory);
}

/**
 * Register a cache provider implementation
 * @param name - Provider name (e.g., 'cloudflare-kv', 'redis')
 * @param factory - Factory function to create the cache instance
 */
export function registerCacheProvider(name: string, factory: CacheFactory): void {
  registry.caches.set(name, factory);
}

/**
 * Register an object store provider implementation
 * @param name - Provider name (e.g., 'cloudflare-r2', 's3')
 * @param factory - Factory function to create the object store instance
 */
export function registerObjectStoreProvider(name: string, factory: ObjectStoreFactory): void {
  registry.objectStores.set(name, factory);
}

/**
 * Create a database instance from configuration
 * @param config - Database configuration
 * @returns Database instance
 * @throws Error if provider is not registered
 */
export function createDatabase(config: DatabaseConfig): IDatabase {
  const factory = registry.databases.get(config.provider);
  if (!factory) {
    throw new Error(
      `Database provider '${config.provider}' not registered. ` +
        `Available providers: ${Array.from(registry.databases.keys()).join(', ') || 'none'}`
    );
  }
  return factory(config);
}

/**
 * Create a cache instance from configuration
 * @param config - Cache configuration
 * @returns Cache instance
 * @throws Error if provider is not registered
 */
export function createCache(config: CacheConfig): ICache {
  const factory = registry.caches.get(config.provider);
  if (!factory) {
    throw new Error(
      `Cache provider '${config.provider}' not registered. ` +
        `Available providers: ${Array.from(registry.caches.keys()).join(', ') || 'none'}`
    );
  }
  return factory(config);
}

/**
 * Create an object store instance from configuration
 * @param config - Object store configuration
 * @returns Object store instance
 * @throws Error if provider is not registered
 */
export function createObjectStore(config: ObjectStoreConfig): IObjectStore {
  const factory = registry.objectStores.get(config.provider);
  if (!factory) {
    throw new Error(
      `Object store provider '${config.provider}' not registered. ` +
        `Available providers: ${Array.from(registry.objectStores.keys()).join(', ') || 'none'}`
    );
  }
  return factory(config);
}

/**
 * Create all storage providers from a complete configuration
 * @param config - Complete storage configuration
 * @returns Storage provider instances
 */
export function createStorageProvider(config: StorageConfig): StorageProvider {
  const provider: StorageProvider = {};

  if (config.database) {
    provider.database = createDatabase(config.database);
  }

  if (config.cache) {
    provider.cache = createCache(config.cache);
  }

  if (config.objectStore) {
    provider.objectStore = createObjectStore(config.objectStore);
  }

  return provider;
}

/**
 * Get the current provider registry (for debugging/testing)
 */
export function getRegistry(): Readonly<ProviderRegistry> {
  return registry;
}

/**
 * Clear all registered providers (for testing)
 */
export function clearRegistry(): void {
  registry.databases.clear();
  registry.caches.clear();
  registry.objectStores.clear();
}
