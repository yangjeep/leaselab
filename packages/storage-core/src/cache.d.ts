/**
 * Options for cache put operations
 */
export interface CachePutOptions {
    /**
     * Time-to-live in seconds
     */
    expirationTtl?: number;
    /**
     * Absolute expiration timestamp (Unix epoch seconds)
     */
    expiration?: number;
    /**
     * Custom metadata to store with the value
     */
    metadata?: Record<string, string>;
}
/**
 * Result of a cache get operation with metadata
 */
export interface CacheGetResult<T> {
    value: T;
    metadata?: Record<string, string>;
}
/**
 * Information about a cached key
 */
export interface CacheKeyInfo {
    name: string;
    expiration?: number;
    metadata?: Record<string, string>;
}
/**
 * Options for listing cache keys
 */
export interface CacheListOptions {
    prefix?: string;
    limit?: number;
    cursor?: string;
}
/**
 * Result of listing cache keys
 */
export interface CacheListResult {
    keys: CacheKeyInfo[];
    cursor?: string;
    complete: boolean;
}
/**
 * Abstract cache interface for key-value storage operations.
 * Implementations: KVCache, RedisCache, MemoryCache
 */
export interface ICache {
    /**
     * Get a value from the cache
     * @param key - Cache key
     * @returns Value or null if not found/expired
     */
    get<T = unknown>(key: string): Promise<T | null>;
    /**
     * Get a value with its metadata
     * @param key - Cache key
     * @returns Value with metadata or null if not found
     */
    getWithMetadata<T = unknown>(key: string): Promise<CacheGetResult<T> | null>;
    /**
     * Store a value in the cache
     * @param key - Cache key
     * @param value - Value to store (will be JSON serialized)
     * @param options - Optional TTL and metadata
     */
    put(key: string, value: unknown, options?: CachePutOptions): Promise<void>;
    /**
     * Delete a key from the cache
     * @param key - Cache key to delete
     */
    delete(key: string): Promise<void>;
    /**
     * List keys in the cache
     * @param options - Filtering and pagination options
     * @returns List of keys with pagination info
     */
    list(options?: CacheListOptions): Promise<CacheListResult>;
    /**
     * Check if a key exists in the cache
     * @param key - Cache key
     * @returns True if key exists and is not expired
     */
    has(key: string): Promise<boolean>;
    /**
     * Close the cache connection (if applicable)
     */
    close(): Promise<void>;
}
/**
 * Configuration for cache providers
 */
export interface CacheConfig {
    provider: 'cloudflare-kv' | 'redis' | 'memory';
    kvBinding?: unknown;
    redisUrl?: string;
    defaultTtl?: number;
}
//# sourceMappingURL=cache.d.ts.map