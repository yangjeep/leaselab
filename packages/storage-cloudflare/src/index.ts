// Import adapters to register them with the provider factory
import './d1-database';
import './kv-cache';
import './r2-object-store';

// Import createStorageProvider for use in initCloudflareStorage
import { createStorageProvider } from '@leaselab/storage-core';

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
} from '@leaselab/storage-core';

export {
  createDatabase,
  createCache,
  createObjectStore,
  createStorageProvider,
} from '@leaselab/storage-core';

/**
 * Initialize all Cloudflare storage providers from environment bindings
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
