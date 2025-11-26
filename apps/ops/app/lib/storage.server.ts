import type { IDatabase, ICache, IObjectStore } from '~/shared/storage-core';
import '~/shared/storage-cloudflare'; // Register Cloudflare providers
import { createDatabase, createCache, createObjectStore } from '~/shared/storage-core';

/**
 * Environment bindings from Cloudflare
 */
export interface CloudflareEnv {
  DB: D1Database;
  PUBLIC_BUCKET?: R2Bucket;
  PRIVATE_BUCKET?: R2Bucket;
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
  publicBucket?: IObjectStore;
  privateBucket?: IObjectStore;
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

  const publicBucket = env.PUBLIC_BUCKET
    ? createObjectStore({
      provider: 'cloudflare-r2',
      r2Binding: env.PUBLIC_BUCKET,
      publicUrlBase: env.R2_PUBLIC_URL,
    })
    : undefined;

  const privateBucket = env.PRIVATE_BUCKET
    ? createObjectStore({
      provider: 'cloudflare-r2',
      r2Binding: env.PRIVATE_BUCKET,
    })
    : undefined;

  return { database, cache, publicBucket, privateBucket };
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
 * Get public bucket from Cloudflare environment
 * For property images and other publicly accessible files
 */
export function getPublicBucket(env: CloudflareEnv): IObjectStore | undefined {
  if (!env.PUBLIC_BUCKET) return undefined;
  return createObjectStore({
    provider: 'cloudflare-r2',
    r2Binding: env.PUBLIC_BUCKET,
    publicUrlBase: env.R2_PUBLIC_URL,
  });
}

/**
 * Get private bucket from Cloudflare environment
 * For applications, leases, N11s, and other private documents
 */
export function getPrivateBucket(env: CloudflareEnv): IObjectStore | undefined {
  if (!env.PRIVATE_BUCKET) return undefined;
  return createObjectStore({
    provider: 'cloudflare-r2',
    r2Binding: env.PRIVATE_BUCKET,
  });
}
