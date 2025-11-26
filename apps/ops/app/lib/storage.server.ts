import type { IDatabase, ICache, IObjectStore } from '@leaselab/storage-core';
import '@leaselab/storage-cloudflare'; // Register Cloudflare providers
import { createDatabase, createCache, createObjectStore } from '@leaselab/storage-core';

/**
 * Environment bindings from Cloudflare
 */
export interface CloudflareEnv {
  DB: D1Database;
  SESSION_KV?: KVNamespace;
  FILE_BUCKET?: R2Bucket;
  R2_PUBLIC_URL?: string;
  OPENAI_API_KEY?: string;
  SESSION_SECRET?: string;
  ENVIRONMENT?: string;
}

/**
 * Storage providers initialized from Cloudflare environment
 */
export interface Storage {
  database: IDatabase;
  cache?: ICache;
  objectStore?: IObjectStore;
}

/**
 * Create storage providers from Cloudflare environment bindings
 */
export function createStorage(env: CloudflareEnv): Storage {
  const database = createDatabase({
    provider: 'cloudflare-d1',
    d1Binding: env.DB,
  });

  const cache = env.SESSION_KV
    ? createCache({
      provider: 'cloudflare-kv',
      kvBinding: env.SESSION_KV,
    })
    : undefined;

  const objectStore = env.FILE_BUCKET
    ? createObjectStore({
      provider: 'cloudflare-r2',
      r2Binding: env.FILE_BUCKET,
      publicUrlBase: env.R2_PUBLIC_URL,
    })
    : undefined;

  return { database, cache, objectStore };
}

/**
 * Get database from Cloudflare environment
 * Convenience function for routes that only need database access
 */
export function getDatabase(env: CloudflareEnv): IDatabase {
  return createDatabase({
    provider: 'cloudflare-d1',
    d1Binding: env.DB,
  });
}

/**
 * Get cache from Cloudflare environment
 * Convenience function for routes that only need cache access
 */
export function getCache(env: CloudflareEnv): ICache | undefined {
  if (!env.SESSION_KV) return undefined;
  return createCache({
    provider: 'cloudflare-kv',
    kvBinding: env.SESSION_KV,
  });
}

/**
 * Get object store from Cloudflare environment
 * Convenience function for routes that only need file storage access
 */
export function getObjectStore(env: CloudflareEnv): IObjectStore | undefined {
  if (!env.FILE_BUCKET) return undefined;
  return createObjectStore({
    provider: 'cloudflare-r2',
    r2Binding: env.FILE_BUCKET,
    publicUrlBase: env.R2_PUBLIC_URL,
  });
}
