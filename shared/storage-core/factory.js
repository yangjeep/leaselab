/**
 * Global provider registry
 */
const registry = {
    databases: new Map(),
    caches: new Map(),
    objectStores: new Map(),
};
/**
 * Register a database provider implementation
 * @param name - Provider name (e.g., 'cloudflare-d1', 'postgresql')
 * @param factory - Factory function to create the database instance
 */
export function registerDatabaseProvider(name, factory) {
    registry.databases.set(name, factory);
}
/**
 * Register a cache provider implementation
 * @param name - Provider name (e.g., 'cloudflare-kv', 'redis')
 * @param factory - Factory function to create the cache instance
 */
export function registerCacheProvider(name, factory) {
    registry.caches.set(name, factory);
}
/**
 * Register an object store provider implementation
 * @param name - Provider name (e.g., 'cloudflare-r2', 's3')
 * @param factory - Factory function to create the object store instance
 */
export function registerObjectStoreProvider(name, factory) {
    registry.objectStores.set(name, factory);
}
/**
 * Create a database instance from configuration
 * @param config - Database configuration
 * @returns Database instance
 * @throws Error if provider is not registered
 */
export function createDatabase(config) {
    const factory = registry.databases.get(config.provider);
    if (!factory) {
        throw new Error(`Database provider '${config.provider}' not registered. ` +
            `Available providers: ${Array.from(registry.databases.keys()).join(', ') || 'none'}`);
    }
    return factory(config);
}
/**
 * Create a cache instance from configuration
 * @param config - Cache configuration
 * @returns Cache instance
 * @throws Error if provider is not registered
 */
export function createCache(config) {
    const factory = registry.caches.get(config.provider);
    if (!factory) {
        throw new Error(`Cache provider '${config.provider}' not registered. ` +
            `Available providers: ${Array.from(registry.caches.keys()).join(', ') || 'none'}`);
    }
    return factory(config);
}
/**
 * Create an object store instance from configuration
 * @param config - Object store configuration
 * @returns Object store instance
 * @throws Error if provider is not registered
 */
export function createObjectStore(config) {
    const factory = registry.objectStores.get(config.provider);
    if (!factory) {
        throw new Error(`Object store provider '${config.provider}' not registered. ` +
            `Available providers: ${Array.from(registry.objectStores.keys()).join(', ') || 'none'}`);
    }
    return factory(config);
}
/**
 * Create all storage providers from a complete configuration
 * @param config - Complete storage configuration
 * @returns Storage provider instances
 */
export function createStorageProvider(config) {
    const provider = {};
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
export function getRegistry() {
    return registry;
}
/**
 * Clear all registered providers (for testing)
 */
export function clearRegistry() {
    registry.databases.clear();
    registry.caches.clear();
    registry.objectStores.clear();
}
