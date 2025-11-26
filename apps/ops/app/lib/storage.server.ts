import type { IDatabase, ICache, IObjectStore } from '~/shared/storage-core';
import '~/shared/storage-cloudflare'; // Register Cloudflare providers
import { createDatabase, createCache, createObjectStore } from '~/shared/storage-core';

/**
 * Environment bindings from Cloudflare
 */
export interface CloudflareEnv {
  DB: D1Database;
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

  const cache = undefined; // Unified on cookie-based approach

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
  return undefined; // Unified on cookie-based approach
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
