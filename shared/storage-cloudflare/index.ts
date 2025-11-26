// Import adapters to register them with the provider factory
import './d1-database';
import './kv-cache';
import './r2-object-store';

// Import createStorageProvider for use in initCloudflareStorage
import { createStorageProvider } from '../storage-core';

// Re-export adapter classes
export { D1Database, D1DatabaseAdapter, createD1Database } from './d1-database';
export { KVCache, KVCacheAdapter, createKVCache } from './kv-cache';
export { R2ObjectStore, R2ObjectStoreAdapter, createR2ObjectStore } from './r2-object-store';

// Re-export core types for convenience
export type {
  IDatabase,
  ICache,
  IObjectStore,
  DatabaseConfig,
  CacheConfig,
  ObjectStoreConfig,
  StorageConfig,
  StorageProvider,
} from '../storage-core';

export {
  createDatabase,
  createCache,
  createObjectStore,
  createStorageProvider,
} from '../storage-core';

/**
 * Initialize all Cloudflare storage providers from environment bindings
 * @deprecated Use initCloudflareStorageV2 for multi-bucket support
 */
export function initCloudflareStorage(env: {
  DB?: D1Database;
  FILE_BUCKET?: R2Bucket;
  R2_PUBLIC_URL?: string;
}) {
  return createStorageProvider({
    database: env.DB
      ? {
          provider: 'cloudflare-d1' as const,
          d1Binding: env.DB,
        }
      : undefined,
    cache: undefined,
    objectStore: env.FILE_BUCKET
      ? {
          provider: 'cloudflare-r2' as const,
          r2Binding: env.FILE_BUCKET,
          publicUrlBase: env.R2_PUBLIC_URL,
        }
      : undefined,
  });
}

/**
 * Initialize Cloudflare storage with separate public and private buckets
 */
export function initCloudflareStorageV2(env: {
  DB?: D1Database;
  PUBLIC_BUCKET?: R2Bucket;
  PRIVATE_BUCKET?: R2Bucket;
  R2_PUBLIC_URL?: string;
}) {
  return {
    database: env.DB
      ? createStorageProvider({
          database: {
            provider: 'cloudflare-d1' as const,
            d1Binding: env.DB,
          },
        })
      : undefined,
    publicBucket: env.PUBLIC_BUCKET
      ? createStorageProvider({
          objectStore: {
            provider: 'cloudflare-r2' as const,
            r2Binding: env.PUBLIC_BUCKET,
            publicUrlBase: env.R2_PUBLIC_URL,
          },
        })
      : undefined,
    privateBucket: env.PRIVATE_BUCKET
      ? createStorageProvider({
          objectStore: {
            provider: 'cloudflare-r2' as const,
            r2Binding: env.PRIVATE_BUCKET,
          },
        })
      : undefined,
  };
}
