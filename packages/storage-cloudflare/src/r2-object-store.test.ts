import { describe, it, expect, beforeEach, vi } from 'vitest';
import { R2ObjectStoreAdapter, createR2ObjectStore } from './r2-object-store';

// Mock R2 types
interface MockR2Object {
  key: string;
  size: number;
  etag: string;
  uploaded: Date;
  httpMetadata?: {
    contentType?: string;
    cacheControl?: string;
    contentDisposition?: string;
    contentEncoding?: string;
  };
  customMetadata?: Record<string, string>;
}

interface MockR2ObjectBody extends MockR2Object {
  body: ReadableStream;
  arrayBuffer: () => Promise<ArrayBuffer>;
  text: () => Promise<string>;
}

interface MockR2Bucket {
  put: (key: string, data: unknown, options?: unknown) => Promise<MockR2Object>;
  get: (key: string) => Promise<MockR2ObjectBody | null>;
  head: (key: string) => Promise<MockR2Object | null>;
  delete: (key: string | string[]) => Promise<void>;
  list: (options?: unknown) => Promise<{
    objects: MockR2Object[];
    truncated: boolean;
    cursor?: string;
    delimitedPrefixes?: string[];
  }>;
}

describe('R2ObjectStoreAdapter', () => {
  let mockR2: MockR2Bucket;
  let mockStream: ReadableStream;

  beforeEach(() => {
    mockStream = new ReadableStream();

    mockR2 = {
      put: vi.fn().mockResolvedValue({
        key: 'test-key',
        size: 100,
        etag: 'abc123',
        uploaded: new Date(),
      }),
      get: vi.fn().mockResolvedValue(null),
      head: vi.fn().mockResolvedValue(null),
      delete: vi.fn().mockResolvedValue(undefined),
      list: vi.fn().mockResolvedValue({
        objects: [],
        truncated: false,
      }),
    };
  });

  describe('put', () => {
    it('should store object', async () => {
      const adapter = new R2ObjectStoreAdapter(mockR2 as unknown as R2Bucket);
      const data = new Uint8Array([1, 2, 3]);
      await adapter.put('test-key', data);

      expect(mockR2.put).toHaveBeenCalledWith('test-key', data, {});
    });

    it('should store object with content type', async () => {
      const adapter = new R2ObjectStoreAdapter(mockR2 as unknown as R2Bucket);
      await adapter.put('test.jpg', 'data', { contentType: 'image/jpeg' });

      expect(mockR2.put).toHaveBeenCalledWith('test.jpg', 'data', {
        httpMetadata: { contentType: 'image/jpeg' },
      });
    });

    it('should store object with custom metadata', async () => {
      const adapter = new R2ObjectStoreAdapter(mockR2 as unknown as R2Bucket);
      await adapter.put('test-key', 'data', { customMetadata: { userId: '123' } });

      expect(mockR2.put).toHaveBeenCalledWith('test-key', 'data', {
        customMetadata: { userId: '123' },
      });
    });

    it('should store object with all options', async () => {
      const adapter = new R2ObjectStoreAdapter(mockR2 as unknown as R2Bucket);
      await adapter.put('test-key', 'data', {
        contentType: 'text/plain',
        cacheControl: 'max-age=3600',
        contentDisposition: 'attachment',
        contentEncoding: 'gzip',
        customMetadata: { foo: 'bar' },
      });

      expect(mockR2.put).toHaveBeenCalledWith('test-key', 'data', {
        httpMetadata: {
          contentType: 'text/plain',
          cacheControl: 'max-age=3600',
          contentDisposition: 'attachment',
          contentEncoding: 'gzip',
        },
        customMetadata: { foo: 'bar' },
      });
    });
  });

  describe('get', () => {
    it('should retrieve object', async () => {
      const mockObject: MockR2ObjectBody = {
        key: 'test-key',
        size: 100,
        etag: 'abc123',
        uploaded: new Date('2024-01-01'),
        httpMetadata: { contentType: 'text/plain' },
        body: mockStream,
        arrayBuffer: vi.fn(),
        text: vi.fn(),
      };
      mockR2.get = vi.fn().mockResolvedValue(mockObject);

      const adapter = new R2ObjectStoreAdapter(mockR2 as unknown as R2Bucket);
      const result = await adapter.get('test-key');

      expect(result).not.toBeNull();
      expect(result!.data).toBe(mockStream);
      expect(result!.metadata.contentType).toBe('text/plain');
      expect(result!.metadata.contentLength).toBe(100);
    });

    it('should return null for missing object', async () => {
      mockR2.get = vi.fn().mockResolvedValue(null);

      const adapter = new R2ObjectStoreAdapter(mockR2 as unknown as R2Bucket);
      const result = await adapter.get('missing-key');

      expect(result).toBeNull();
    });
  });

  describe('head', () => {
    it('should retrieve object metadata', async () => {
      const mockObject: MockR2Object = {
        key: 'test-key',
        size: 100,
        etag: 'abc123',
        uploaded: new Date('2024-01-01'),
        httpMetadata: { contentType: 'image/png' },
        customMetadata: { userId: '123' },
      };
      mockR2.head = vi.fn().mockResolvedValue(mockObject);

      const adapter = new R2ObjectStoreAdapter(mockR2 as unknown as R2Bucket);
      const result = await adapter.head('test-key');

      expect(result).not.toBeNull();
      expect(result!.contentType).toBe('image/png');
      expect(result!.contentLength).toBe(100);
      expect(result!.customMetadata).toEqual({ userId: '123' });
    });

    it('should return null for missing object', async () => {
      mockR2.head = vi.fn().mockResolvedValue(null);

      const adapter = new R2ObjectStoreAdapter(mockR2 as unknown as R2Bucket);
      const result = await adapter.head('missing-key');

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete object', async () => {
      const adapter = new R2ObjectStoreAdapter(mockR2 as unknown as R2Bucket);
      await adapter.delete('test-key');

      expect(mockR2.delete).toHaveBeenCalledWith('test-key');
    });
  });

  describe('deleteMany', () => {
    it('should delete multiple objects', async () => {
      const adapter = new R2ObjectStoreAdapter(mockR2 as unknown as R2Bucket);
      await adapter.deleteMany(['key1', 'key2', 'key3']);

      expect(mockR2.delete).toHaveBeenCalledWith(['key1', 'key2', 'key3']);
    });
  });

  describe('list', () => {
    it('should list objects', async () => {
      mockR2.list = vi.fn().mockResolvedValue({
        objects: [
          { key: 'file1.txt', size: 100, etag: 'a', uploaded: new Date() },
          { key: 'file2.txt', size: 200, etag: 'b', uploaded: new Date() },
        ],
        truncated: false,
      });

      const adapter = new R2ObjectStoreAdapter(mockR2 as unknown as R2Bucket);
      const result = await adapter.list();

      expect(result.objects).toHaveLength(2);
      expect(result.truncated).toBe(false);
    });

    it('should list with prefix', async () => {
      const adapter = new R2ObjectStoreAdapter(mockR2 as unknown as R2Bucket);
      await adapter.list({ prefix: 'images/' });

      expect(mockR2.list).toHaveBeenCalledWith({ prefix: 'images/' });
    });

    it('should handle pagination', async () => {
      mockR2.list = vi.fn().mockResolvedValue({
        objects: [{ key: 'file1.txt', size: 100, etag: 'a', uploaded: new Date() }],
        truncated: true,
        cursor: 'next-cursor',
      });

      const adapter = new R2ObjectStoreAdapter(mockR2 as unknown as R2Bucket);
      const result = await adapter.list({ limit: 1 });

      expect(result.truncated).toBe(true);
      expect(result.cursor).toBe('next-cursor');
    });
  });

  describe('exists', () => {
    it('should return true when object exists', async () => {
      mockR2.head = vi.fn().mockResolvedValue({ key: 'test-key' });

      const adapter = new R2ObjectStoreAdapter(mockR2 as unknown as R2Bucket);
      const result = await adapter.exists('test-key');

      expect(result).toBe(true);
    });

    it('should return false when object does not exist', async () => {
      mockR2.head = vi.fn().mockResolvedValue(null);

      const adapter = new R2ObjectStoreAdapter(mockR2 as unknown as R2Bucket);
      const result = await adapter.exists('missing-key');

      expect(result).toBe(false);
    });
  });

  describe('getSignedUrl', () => {
    it('should return public URL when configured', async () => {
      const adapter = new R2ObjectStoreAdapter(
        mockR2 as unknown as R2Bucket,
        'https://cdn.example.com'
      );
      const url = await adapter.getSignedUrl('images/photo.jpg');

      expect(url).toBe('https://cdn.example.com/images/photo.jpg');
    });

    it('should throw error when public URL not configured', async () => {
      const adapter = new R2ObjectStoreAdapter(mockR2 as unknown as R2Bucket);

      await expect(adapter.getSignedUrl('test-key')).rejects.toThrow(
        'Signed URL generation requires publicUrlBase configuration'
      );
    });
  });

  describe('copy', () => {
    it('should copy object to new key', async () => {
      const mockObject: MockR2ObjectBody = {
        key: 'source-key',
        size: 100,
        etag: 'abc123',
        uploaded: new Date(),
        httpMetadata: { contentType: 'text/plain' },
        customMetadata: { foo: 'bar' },
        body: mockStream,
        arrayBuffer: vi.fn(),
        text: vi.fn(),
      };
      mockR2.get = vi.fn().mockResolvedValue(mockObject);

      const adapter = new R2ObjectStoreAdapter(mockR2 as unknown as R2Bucket);
      await adapter.copy('source-key', 'dest-key');

      expect(mockR2.get).toHaveBeenCalledWith('source-key');
      expect(mockR2.put).toHaveBeenCalledWith('dest-key', mockStream, {
        httpMetadata: { contentType: 'text/plain' },
        customMetadata: { foo: 'bar' },
      });
    });

    it('should throw error when source not found', async () => {
      mockR2.get = vi.fn().mockResolvedValue(null);

      const adapter = new R2ObjectStoreAdapter(mockR2 as unknown as R2Bucket);

      await expect(adapter.copy('missing', 'dest')).rejects.toThrow(
        'Source object not found: missing'
      );
    });
  });

  describe('close', () => {
    it('should resolve without error', async () => {
      const adapter = new R2ObjectStoreAdapter(mockR2 as unknown as R2Bucket);
      await expect(adapter.close()).resolves.toBeUndefined();
    });
  });
});

describe('createR2ObjectStore', () => {
  it('should create adapter from config', () => {
    const mockR2 = { get: vi.fn() };
    const adapter = createR2ObjectStore({
      provider: 'cloudflare-r2',
      r2Binding: mockR2,
    });

    expect(adapter).toBeInstanceOf(R2ObjectStoreAdapter);
  });

  it('should create adapter with public URL', () => {
    const mockR2 = { get: vi.fn() };
    const adapter = createR2ObjectStore({
      provider: 'cloudflare-r2',
      r2Binding: mockR2,
      publicUrlBase: 'https://cdn.example.com',
    });

    expect(adapter).toBeInstanceOf(R2ObjectStoreAdapter);
  });

  it('should throw error when r2Binding is missing', () => {
    expect(() => createR2ObjectStore({ provider: 'cloudflare-r2' })).toThrow(
      'R2 binding is required for cloudflare-r2 provider'
    );
  });
});
