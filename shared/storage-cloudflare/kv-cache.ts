import type {
  ICache,
  CachePutOptions,
  CacheGetResult,
  CacheListOptions,
  CacheListResult,
  CacheConfig,
} from '../storage-core';
import { registerCacheProvider } from '../storage-core';

/**
 * KV Cache adapter implementing ICache interface
 */
export class KVCacheAdapter implements ICache {
  private kv: KVNamespace;
  private defaultTtl?: number;

  constructor(kv: KVNamespace, defaultTtl?: number) {
    this.kv = kv;
    this.defaultTtl = defaultTtl;
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    const value = await this.kv.get(key, 'json');
    return value as T | null;
  }

  async getWithMetadata<T = unknown>(key: string): Promise<CacheGetResult<T> | null> {
    const result = await this.kv.getWithMetadata<T>(key, 'json');
    if (result.value === null) {
      return null;
    }
    return {
      value: result.value,
      metadata: result.metadata as Record<string, string> | undefined,
    };
  }

  async put(key: string, value: unknown, options?: CachePutOptions): Promise<void> {
    const kvOptions: KVNamespacePutOptions = {};

    if (options?.expirationTtl) {
      kvOptions.expirationTtl = options.expirationTtl;
    } else if (options?.expiration) {
      kvOptions.expiration = options.expiration;
    } else if (this.defaultTtl) {
      kvOptions.expirationTtl = this.defaultTtl;
    }

    if (options?.metadata) {
      kvOptions.metadata = options.metadata;
    }

    await this.kv.put(key, JSON.stringify(value), kvOptions);
  }

  async delete(key: string): Promise<void> {
    await this.kv.delete(key);
  }

  async list(options?: CacheListOptions): Promise<CacheListResult> {
    const kvOptions: KVNamespaceListOptions = {};

    if (options?.prefix) {
      kvOptions.prefix = options.prefix;
    }
    if (options?.limit) {
      kvOptions.limit = options.limit;
    }
    if (options?.cursor) {
      kvOptions.cursor = options.cursor;
    }

    const result = await this.kv.list(kvOptions);

    return {
      keys: result.keys.map((key) => ({
        name: key.name,
        expiration: key.expiration,
        metadata: key.metadata as Record<string, string> | undefined,
      })),
      cursor: 'cursor' in result ? (result as { cursor?: string }).cursor : undefined,
      complete: result.list_complete,
    };
  }

  async has(key: string): Promise<boolean> {
    const value = await this.kv.get(key);
    return value !== null;
  }

  async close(): Promise<void> {
    // KV connections are managed by the runtime, no explicit close needed
  }
}

/**
 * Create a KV cache adapter from configuration
 */
export function createKVCache(config: CacheConfig): ICache {
  if (!config.kvBinding) {
    throw new Error('KV binding is required for cloudflare-kv provider');
  }
  return new KVCacheAdapter(config.kvBinding as KVNamespace, config.defaultTtl);
}

// Register the provider
registerCacheProvider('cloudflare-kv', createKVCache);

export { KVCacheAdapter as KVCache };
