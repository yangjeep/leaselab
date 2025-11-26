/**
 * Metadata for stored objects
 */
export interface ObjectMetadata {
    contentType?: string;
    contentLength?: number;
    etag?: string;
    lastModified?: Date;
    customMetadata?: Record<string, string>;
    cacheControl?: string;
    contentDisposition?: string;
    contentEncoding?: string;
}
/**
 * Options for put operations
 */
export interface ObjectPutOptions {
    contentType?: string;
    customMetadata?: Record<string, string>;
    cacheControl?: string;
    contentDisposition?: string;
    contentEncoding?: string;
}
/**
 * Result of a get operation
 */
export interface ObjectGetResult {
    data: ReadableStream<Uint8Array> | ArrayBuffer;
    metadata: ObjectMetadata;
}
/**
 * Information about a stored object
 */
export interface ObjectInfo {
    key: string;
    size: number;
    etag?: string;
    lastModified?: Date;
    customMetadata?: Record<string, string>;
}
/**
 * Options for listing objects
 */
export interface ObjectListOptions {
    prefix?: string;
    limit?: number;
    cursor?: string;
    delimiter?: string;
    include?: ('httpMetadata' | 'customMetadata')[];
}
/**
 * Result of listing objects
 */
export interface ObjectListResult {
    objects: ObjectInfo[];
    cursor?: string;
    truncated: boolean;
    delimitedPrefixes?: string[];
}
/**
 * Options for generating signed URLs
 */
export interface SignedUrlOptions {
    /**
     * Expiration time in seconds (default: 3600)
     */
    expiresIn?: number;
    /**
     * HTTP method the URL is valid for
     */
    method?: 'GET' | 'PUT';
    /**
     * Custom headers to include in the signature
     */
    headers?: Record<string, string>;
}
/**
 * Abstract object store interface for file/blob storage operations.
 * Implementations: R2ObjectStore, S3ObjectStore, LocalFileStore
 */
export interface IObjectStore {
    /**
     * Store an object
     * @param key - Object key/path
     * @param data - Data to store
     * @param options - Content type and metadata options
     */
    put(key: string, data: ArrayBuffer | ReadableStream<Uint8Array> | Uint8Array | string, options?: ObjectPutOptions): Promise<void>;
    /**
     * Retrieve an object
     * @param key - Object key/path
     * @returns Object data and metadata, or null if not found
     */
    get(key: string): Promise<ObjectGetResult | null>;
    /**
     * Get only the object metadata (head request)
     * @param key - Object key/path
     * @returns Metadata or null if not found
     */
    head(key: string): Promise<ObjectMetadata | null>;
    /**
     * Delete an object
     * @param key - Object key/path
     */
    delete(key: string): Promise<void>;
    /**
     * Delete multiple objects
     * @param keys - Array of object keys to delete
     */
    deleteMany(keys: string[]): Promise<void>;
    /**
     * List objects in the store
     * @param options - Filtering and pagination options
     * @returns List of objects with pagination info
     */
    list(options?: ObjectListOptions): Promise<ObjectListResult>;
    /**
     * Check if an object exists
     * @param key - Object key/path
     * @returns True if object exists
     */
    exists(key: string): Promise<boolean>;
    /**
     * Generate a signed URL for direct access
     * @param key - Object key/path
     * @param options - URL expiration and method options
     * @returns Signed URL string
     */
    getSignedUrl(key: string, options?: SignedUrlOptions): Promise<string>;
    /**
     * Copy an object to a new location
     * @param sourceKey - Source object key
     * @param destinationKey - Destination object key
     */
    copy(sourceKey: string, destinationKey: string): Promise<void>;
    /**
     * Close the connection (if applicable)
     */
    close(): Promise<void>;
}
/**
 * Configuration for object store providers
 */
export interface ObjectStoreConfig {
    provider: 'cloudflare-r2' | 's3' | 'local';
    r2Binding?: unknown;
    r2AccountId?: string;
    r2AccessKeyId?: string;
    r2SecretAccessKey?: string;
    s3Bucket?: string;
    s3Region?: string;
    s3AccessKeyId?: string;
    s3SecretAccessKey?: string;
    s3Endpoint?: string;
    localBasePath?: string;
    publicUrlBase?: string;
}
//# sourceMappingURL=object-store.d.ts.map