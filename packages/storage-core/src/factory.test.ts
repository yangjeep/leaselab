import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  registerDatabaseProvider,
  registerCacheProvider,
  registerObjectStoreProvider,
  createDatabase,
  createCache,
  createObjectStore,
  createStorageProvider,
  clearRegistry,
  getRegistry,
} from './factory';
import type { IDatabase, ICache, IObjectStore, DatabaseConfig, CacheConfig, ObjectStoreConfig } from './index';

// Mock implementations
const mockDatabase: IDatabase = {
  query: vi.fn().mockResolvedValue([]),
  queryOne: vi.fn().mockResolvedValue(null),
  execute: vi.fn().mockResolvedValue({ success: true, changes: 0 }),
  transaction: vi.fn().mockImplementation(async (fn) => fn(mockDatabase)),
  batch: vi.fn().mockResolvedValue([]),
  close: vi.fn().mockResolvedValue(undefined),
};

const mockCache: ICache = {
  get: vi.fn().mockResolvedValue(null),
  getWithMetadata: vi.fn().mockResolvedValue(null),
  put: vi.fn().mockResolvedValue(undefined),
  delete: vi.fn().mockResolvedValue(undefined),
  list: vi.fn().mockResolvedValue({ keys: [], complete: true }),
  has: vi.fn().mockResolvedValue(false),
  close: vi.fn().mockResolvedValue(undefined),
};

const mockObjectStore: IObjectStore = {
  put: vi.fn().mockResolvedValue(undefined),
  get: vi.fn().mockResolvedValue(null),
  head: vi.fn().mockResolvedValue(null),
  delete: vi.fn().mockResolvedValue(undefined),
  deleteMany: vi.fn().mockResolvedValue(undefined),
  list: vi.fn().mockResolvedValue({ objects: [], truncated: false }),
  exists: vi.fn().mockResolvedValue(false),
  getSignedUrl: vi.fn().mockResolvedValue('https://example.com/signed'),
  copy: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
};

describe('Storage Factory', () => {
  beforeEach(() => {
    clearRegistry();
  });

  describe('Provider Registration', () => {
    it('should register a database provider', () => {
      const factory = vi.fn().mockReturnValue(mockDatabase);
      registerDatabaseProvider('test-db', factory);

      const registry = getRegistry();
      expect(registry.databases.has('test-db')).toBe(true);
    });

    it('should register a cache provider', () => {
      const factory = vi.fn().mockReturnValue(mockCache);
      registerCacheProvider('test-cache', factory);

      const registry = getRegistry();
      expect(registry.caches.has('test-cache')).toBe(true);
    });

    it('should register an object store provider', () => {
      const factory = vi.fn().mockReturnValue(mockObjectStore);
      registerObjectStoreProvider('test-store', factory);

      const registry = getRegistry();
      expect(registry.objectStores.has('test-store')).toBe(true);
    });
  });

  describe('createDatabase', () => {
    it('should create a database using registered provider', () => {
      const factory = vi.fn().mockReturnValue(mockDatabase);
      registerDatabaseProvider('test-db', factory);

      const config: DatabaseConfig = { provider: 'test-db' as any };
      const db = createDatabase(config);

      expect(factory).toHaveBeenCalledWith(config);
      expect(db).toBe(mockDatabase);
    });

    it('should throw error for unregistered provider', () => {
      const config: DatabaseConfig = { provider: 'unknown' as any };

      expect(() => createDatabase(config)).toThrow("Database provider 'unknown' not registered");
    });
  });

  describe('createCache', () => {
    it('should create a cache using registered provider', () => {
      const factory = vi.fn().mockReturnValue(mockCache);
      registerCacheProvider('test-cache', factory);

      const config: CacheConfig = { provider: 'test-cache' as any };
      const cache = createCache(config);

      expect(factory).toHaveBeenCalledWith(config);
      expect(cache).toBe(mockCache);
    });

    it('should throw error for unregistered provider', () => {
      const config: CacheConfig = { provider: 'unknown' as any };

      expect(() => createCache(config)).toThrow("Cache provider 'unknown' not registered");
    });
  });

  describe('createObjectStore', () => {
    it('should create an object store using registered provider', () => {
      const factory = vi.fn().mockReturnValue(mockObjectStore);
      registerObjectStoreProvider('test-store', factory);

      const config: ObjectStoreConfig = { provider: 'test-store' as any };
      const store = createObjectStore(config);

      expect(factory).toHaveBeenCalledWith(config);
      expect(store).toBe(mockObjectStore);
    });

    it('should throw error for unregistered provider', () => {
      const config: ObjectStoreConfig = { provider: 'unknown' as any };

      expect(() => createObjectStore(config)).toThrow("Object store provider 'unknown' not registered");
    });
  });

  describe('createStorageProvider', () => {
    beforeEach(() => {
      registerDatabaseProvider('test-db', vi.fn().mockReturnValue(mockDatabase));
      registerCacheProvider('test-cache', vi.fn().mockReturnValue(mockCache));
      registerObjectStoreProvider('test-store', vi.fn().mockReturnValue(mockObjectStore));
    });

    it('should create all storage providers', () => {
      const provider = createStorageProvider({
        database: { provider: 'test-db' as any },
        cache: { provider: 'test-cache' as any },
        objectStore: { provider: 'test-store' as any },
      });

      expect(provider.database).toBe(mockDatabase);
      expect(provider.cache).toBe(mockCache);
      expect(provider.objectStore).toBe(mockObjectStore);
    });

    it('should handle partial configuration', () => {
      const provider = createStorageProvider({
        database: { provider: 'test-db' as any },
      });

      expect(provider.database).toBe(mockDatabase);
      expect(provider.cache).toBeUndefined();
      expect(provider.objectStore).toBeUndefined();
    });

    it('should handle empty configuration', () => {
      const provider = createStorageProvider({});

      expect(provider.database).toBeUndefined();
      expect(provider.cache).toBeUndefined();
      expect(provider.objectStore).toBeUndefined();
    });
  });

  describe('clearRegistry', () => {
    it('should clear all registered providers', () => {
      registerDatabaseProvider('test-db', vi.fn());
      registerCacheProvider('test-cache', vi.fn());
      registerObjectStoreProvider('test-store', vi.fn());

      clearRegistry();

      const registry = getRegistry();
      expect(registry.databases.size).toBe(0);
      expect(registry.caches.size).toBe(0);
      expect(registry.objectStores.size).toBe(0);
    });
  });
});
