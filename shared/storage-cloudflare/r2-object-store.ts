import type {
  IObjectStore,
  ObjectMetadata,
  ObjectPutOptions,
  ObjectGetResult,
  ObjectListOptions,
  ObjectListResult,
  SignedUrlOptions,
  ObjectStoreConfig,
} from '../storage-core';
import { registerObjectStoreProvider } from '../storage-core';

/**
 * R2 Object Store adapter implementing IObjectStore interface
 */
export class R2ObjectStoreAdapter implements IObjectStore {
  private bucket: R2Bucket;
  private publicUrlBase?: string;

  constructor(bucket: R2Bucket, publicUrlBase?: string) {
    this.bucket = bucket;
    this.publicUrlBase = publicUrlBase;
  }

  async put(
    key: string,
    data: ArrayBuffer | ReadableStream<Uint8Array> | Uint8Array | string,
    options?: ObjectPutOptions
  ): Promise<void> {
    const r2Options: R2PutOptions = {};

    if (options?.contentType) {
      r2Options.httpMetadata = {
        ...r2Options.httpMetadata,
        contentType: options.contentType,
      };
    }
    if (options?.cacheControl) {
      r2Options.httpMetadata = {
        ...r2Options.httpMetadata,
        cacheControl: options.cacheControl,
      };
    }
    if (options?.contentDisposition) {
      r2Options.httpMetadata = {
        ...r2Options.httpMetadata,
        contentDisposition: options.contentDisposition,
      };
    }
    if (options?.contentEncoding) {
      r2Options.httpMetadata = {
        ...r2Options.httpMetadata,
        contentEncoding: options.contentEncoding,
      };
    }
    if (options?.customMetadata) {
      r2Options.customMetadata = options.customMetadata;
    }

    await this.bucket.put(key, data, r2Options);
  }

  async get(key: string): Promise<ObjectGetResult | null> {
    const object = await this.bucket.get(key);
    if (!object) {
      return null;
    }

    return {
      data: object.body,
      metadata: this.mapR2ObjectToMetadata(object),
    };
  }

  async head(key: string): Promise<ObjectMetadata | null> {
    const object = await this.bucket.head(key);
    if (!object) {
      return null;
    }

    return this.mapR2ObjectToMetadata(object);
  }

  async delete(key: string): Promise<void> {
    await this.bucket.delete(key);
  }

  async deleteMany(keys: string[]): Promise<void> {
    await this.bucket.delete(keys);
  }

  async list(options?: ObjectListOptions): Promise<ObjectListResult> {
    const r2Options: R2ListOptions = {};

    if (options?.prefix) {
      r2Options.prefix = options.prefix;
    }
    if (options?.limit) {
      r2Options.limit = options.limit;
    }
    if (options?.cursor) {
      r2Options.cursor = options.cursor;
    }
    if (options?.delimiter) {
      r2Options.delimiter = options.delimiter;
    }
    // Note: 'include' option may not be available in all Cloudflare workers-types versions

    const result = await this.bucket.list(r2Options);

    return {
      objects: result.objects.map((obj) => ({
        key: obj.key,
        size: obj.size,
        etag: obj.etag,
        lastModified: obj.uploaded,
        customMetadata: obj.customMetadata,
      })),
      cursor: 'cursor' in result ? (result as { cursor?: string }).cursor : undefined,
      truncated: result.truncated,
      delimitedPrefixes: result.delimitedPrefixes,
    };
  }

  async exists(key: string): Promise<boolean> {
    const object = await this.bucket.head(key);
    return object !== null;
  }

  async getSignedUrl(key: string, options?: SignedUrlOptions): Promise<string> {
    // R2 doesn't have native presigned URL support in Workers
    // We need to use the S3 API compatibility or return a public URL
    // For now, return a public URL if configured, otherwise throw
    if (this.publicUrlBase) {
      return `${this.publicUrlBase}/${key}`;
    }

    // In a real implementation, you would use the S3 API with credentials
    // to generate presigned URLs. This requires R2 API tokens.
    throw new Error(
      'Signed URL generation requires publicUrlBase configuration or R2 S3 API credentials. ' +
        'Set publicUrlBase in ObjectStoreConfig or implement S3-compatible signing.'
    );
  }

  async copy(sourceKey: string, destinationKey: string): Promise<void> {
    const source = await this.bucket.get(sourceKey);
    if (!source) {
      throw new Error(`Source object not found: ${sourceKey}`);
    }

    await this.bucket.put(destinationKey, source.body, {
      httpMetadata: source.httpMetadata,
      customMetadata: source.customMetadata,
    });
  }

  async close(): Promise<void> {
    // R2 connections are managed by the runtime, no explicit close needed
  }

  private mapR2ObjectToMetadata(object: R2Object | R2ObjectBody): ObjectMetadata {
    return {
      contentType: object.httpMetadata?.contentType,
      contentLength: object.size,
      etag: object.etag,
      lastModified: object.uploaded,
      customMetadata: object.customMetadata,
      cacheControl: object.httpMetadata?.cacheControl,
      contentDisposition: object.httpMetadata?.contentDisposition,
      contentEncoding: object.httpMetadata?.contentEncoding,
    };
  }
}

/**
 * Create an R2 object store adapter from configuration
 */
export function createR2ObjectStore(config: ObjectStoreConfig): IObjectStore {
  if (!config.r2Binding) {
    throw new Error('R2 binding is required for cloudflare-r2 provider');
  }
  return new R2ObjectStoreAdapter(config.r2Binding as R2Bucket, config.publicUrlBase);
}

// Register the provider
registerObjectStoreProvider('cloudflare-r2', createR2ObjectStore);

export { R2ObjectStoreAdapter as R2ObjectStore };
