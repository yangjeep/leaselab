import { describe, it, expect, beforeEach, vi } from 'vitest';
import { KVCacheAdapter, createKVCache } from './kv-cache';

// Mock KV types
interface MockKVNamespace {
  get: (key: string, options?: { type?: string }) => Promise<unknown>;
  getWithMetadata: <T>(key: string, options?: { type?: string }) => Promise<{ value: T | null; metadata: unknown }>;
  put: (key: string, value: string, options?: { expirationTtl?: number; metadata?: unknown }) => Promise<void>;
  delete: (key: string) => Promise<void>;
  list: (options?: { prefix?: string; limit?: number; cursor?: string }) => Promise<{
    keys: Array<{ name: string; expiration?: number; metadata?: unknown }>;
    list_complete: boolean;
    cursor?: string;
  }>;
}

describe('KVCacheAdapter', () => {
  let mockKV: MockKVNamespace;

  beforeEach(() => {
    mockKV = {
      get: vi.fn().mockResolvedValue(null),
      getWithMetadata: vi.fn().mockResolvedValue({ value: null, metadata: null }),
      put: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      list: vi.fn().mockResolvedValue({ keys: [], list_complete: true }),
    };
  });

  describe('get', () => {
    it('should retrieve value by key', async () => {
      const expectedValue = { name: 'test' };
      mockKV.get = vi.fn().mockResolvedValue(expectedValue);

      const adapter = new KVCacheAdapter(mockKV as unknown as KVNamespace);
      const result = await adapter.get('test-key');

      expect(mockKV.get).toHaveBeenCalledWith('test-key', 'json');
      expect(result).toEqual(expectedValue);
    });

    it('should return null for missing key', async () => {
      mockKV.get = vi.fn().mockResolvedValue(null);

      const adapter = new KVCacheAdapter(mockKV as unknown as KVNamespace);
      const result = await adapter.get('missing-key');

      expect(result).toBeNull();
    });
  });

  describe('getWithMetadata', () => {
    it('should retrieve value with metadata', async () => {
      const expectedValue = { name: 'test' };
      const expectedMetadata = { created: '2024-01-01' };
      mockKV.getWithMetadata = vi.fn().mockResolvedValue({
        value: expectedValue,
        metadata: expectedMetadata,
      });

      const adapter = new KVCacheAdapter(mockKV as unknown as KVNamespace);
      const result = await adapter.getWithMetadata('test-key');

      expect(result).toEqual({
        value: expectedValue,
        metadata: expectedMetadata,
      });
    });

    it('should return null for missing key', async () => {
      mockKV.getWithMetadata = vi.fn().mockResolvedValue({ value: null, metadata: null });

      const adapter = new KVCacheAdapter(mockKV as unknown as KVNamespace);
      const result = await adapter.getWithMetadata('missing-key');

      expect(result).toBeNull();
    });
  });

  describe('put', () => {
    it('should store value', async () => {
      const adapter = new KVCacheAdapter(mockKV as unknown as KVNamespace);
      await adapter.put('test-key', { name: 'test' });

      expect(mockKV.put).toHaveBeenCalledWith(
        'test-key',
        JSON.stringify({ name: 'test' }),
        {}
      );
    });

    it('should store value with TTL', async () => {
      const adapter = new KVCacheAdapter(mockKV as unknown as KVNamespace);
      await adapter.put('test-key', { name: 'test' }, { expirationTtl: 3600 });

      expect(mockKV.put).toHaveBeenCalledWith(
        'test-key',
        JSON.stringify({ name: 'test' }),
        { expirationTtl: 3600 }
      );
    });

    it('should store value with metadata', async () => {
      const adapter = new KVCacheAdapter(mockKV as unknown as KVNamespace);
      await adapter.put('test-key', 'value', { metadata: { type: 'session' } });

      expect(mockKV.put).toHaveBeenCalledWith(
        'test-key',
        JSON.stringify('value'),
        { metadata: { type: 'session' } }
      );
    });
  });

  describe('delete', () => {
    it('should delete key', async () => {
      const adapter = new KVCacheAdapter(mockKV as unknown as KVNamespace);
      await adapter.delete('test-key');

      expect(mockKV.delete).toHaveBeenCalledWith('test-key');
    });
  });

  describe('list', () => {
    it('should list keys', async () => {
      mockKV.list = vi.fn().mockResolvedValue({
        keys: [
          { name: 'key1', expiration: 1234567890 },
          { name: 'key2' },
        ],
        list_complete: true,
      });

      const adapter = new KVCacheAdapter(mockKV as unknown as KVNamespace);
      const result = await adapter.list();

      expect(result.keys).toHaveLength(2);
      expect(result.complete).toBe(true);
    });

    it('should list keys with prefix', async () => {
      const adapter = new KVCacheAdapter(mockKV as unknown as KVNamespace);
      await adapter.list({ prefix: 'session:' });

      expect(mockKV.list).toHaveBeenCalledWith({
        prefix: 'session:',
        limit: undefined,
        cursor: undefined,
      });
    });

    it('should handle pagination', async () => {
      mockKV.list = vi.fn().mockResolvedValue({
        keys: [{ name: 'key1' }],
        list_complete: false,
        cursor: 'next-cursor',
      });

      const adapter = new KVCacheAdapter(mockKV as unknown as KVNamespace);
      const result = await adapter.list({ limit: 1 });

      expect(result.complete).toBe(false);
      expect(result.cursor).toBe('next-cursor');
    });
  });

  describe('has', () => {
    it('should return true when key exists', async () => {
      mockKV.get = vi.fn().mockResolvedValue('value');

      const adapter = new KVCacheAdapter(mockKV as unknown as KVNamespace);
      const result = await adapter.has('test-key');

      expect(result).toBe(true);
    });

    it('should return false when key does not exist', async () => {
      mockKV.get = vi.fn().mockResolvedValue(null);

      const adapter = new KVCacheAdapter(mockKV as unknown as KVNamespace);
      const result = await adapter.has('missing-key');

      expect(result).toBe(false);
    });
  });

  describe('close', () => {
    it('should resolve without error', async () => {
      const adapter = new KVCacheAdapter(mockKV as unknown as KVNamespace);
      await expect(adapter.close()).resolves.toBeUndefined();
    });
  });
});

describe('createKVCache', () => {
  it('should create adapter from config', () => {
    const mockKV = { get: vi.fn() };
    const adapter = createKVCache({
      provider: 'cloudflare-kv',
      kvBinding: mockKV,
    });

    expect(adapter).toBeInstanceOf(KVCacheAdapter);
  });

  it('should throw error when kvBinding is missing', () => {
    expect(() => createKVCache({ provider: 'cloudflare-kv' })).toThrow(
      'KV binding is required for cloudflare-kv provider'
    );
  });
});
