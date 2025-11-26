import type { IObjectStore, ObjectGetResult, ObjectListResult } from '~/shared/storage-core';

/**
 * File upload options
 */
export interface FileUploadOptions {
  contentType: string;
  customMetadata?: Record<string, string>;
}

/**
 * File info returned from operations
 */
export interface FileInfo {
  key: string;
  size: number;
  contentType?: string;
  lastModified?: Date;
}

/**
 * Centralized file service for managing file storage operations
 */
export class FileService {
  private objectStore: IObjectStore;
  private publicUrlBase?: string;

  constructor(objectStore: IObjectStore, publicUrlBase?: string) {
    this.objectStore = objectStore;
    this.publicUrlBase = publicUrlBase;
  }

  /**
   * Upload a file to storage
   */
  async uploadFile(
    key: string,
    data: ArrayBuffer | ReadableStream<Uint8Array> | Uint8Array,
    options: FileUploadOptions
  ): Promise<void> {
    await this.objectStore.put(key, data, {
      contentType: options.contentType,
      customMetadata: options.customMetadata,
    });
  }

  /**
   * Get a file from storage
   */
  async getFile(key: string): Promise<ObjectGetResult | null> {
    return this.objectStore.get(key);
  }

  /**
   * Get file as ArrayBuffer (convenience method)
   */
  async getFileAsBuffer(key: string): Promise<ArrayBuffer | null> {
    const result = await this.objectStore.get(key);
    if (!result) return null;

    if (result.data instanceof ArrayBuffer) {
      return result.data;
    }

    // Convert ReadableStream to ArrayBuffer
    const reader = result.data.getReader();
    const chunks: Uint8Array[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const buffer = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      buffer.set(chunk, offset);
      offset += chunk.length;
    }

    return buffer.buffer;
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(key: string): Promise<void> {
    await this.objectStore.delete(key);
  }

  /**
   * Delete multiple files from storage
   */
  async deleteFiles(keys: string[]): Promise<void> {
    await this.objectStore.deleteMany(keys);
  }

  /**
   * Check if a file exists
   */
  async fileExists(key: string): Promise<boolean> {
    return this.objectStore.exists(key);
  }

  /**
   * List files with a prefix
   */
  async listFiles(prefix?: string, limit?: number): Promise<ObjectListResult> {
    return this.objectStore.list({ prefix, limit });
  }

  /**
   * Get a public URL for a file
   * Returns the public URL if configured, otherwise generates a signed URL
   */
  async getFileUrl(key: string, expiresIn?: number): Promise<string> {
    if (this.publicUrlBase) {
      return `${this.publicUrlBase}/${key}`;
    }
    return this.objectStore.getSignedUrl(key, { expiresIn });
  }

  /**
   * Get a signed URL for upload (PUT)
   */
  async getUploadUrl(key: string, expiresIn?: number): Promise<string> {
    return this.objectStore.getSignedUrl(key, {
      method: 'PUT',
      expiresIn: expiresIn || 3600,
    });
  }

  /**
   * Copy a file to a new location
   */
  async copyFile(sourceKey: string, destinationKey: string): Promise<void> {
    await this.objectStore.copy(sourceKey, destinationKey);
  }

  /**
   * Get file metadata without downloading the file
   */
  async getFileMetadata(key: string): Promise<FileInfo | null> {
    const metadata = await this.objectStore.head(key);
    if (!metadata) return null;

    return {
      key,
      size: metadata.contentLength || 0,
      contentType: metadata.contentType,
      lastModified: metadata.lastModified,
    };
  }
}

/**
 * Generate a unique file key for storage
 */
export function generateFileKey(
  entityType: string,
  entityId: string,
  filename: string,
  uniqueId?: string
): string {
  const id = uniqueId || Date.now().toString();
  const ext = filename.split('.').pop() || '';
  const safeFilename = filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .toLowerCase();

  return `${entityType}/${entityId}/${id}-${safeFilename}`;
}

/**
 * Generate a key for property/unit images
 */
export function generateImageKey(
  entityType: 'property' | 'unit',
  entityId: string,
  filename: string
): string {
  return generateFileKey(entityType, entityId, filename, Date.now().toString());
}

/**
 * Generate a key for lead files
 */
export function generateLeadFileKey(
  leadId: string,
  fileType: string,
  filename: string
): string {
  return generateFileKey('leads', leadId, `${fileType}-${filename}`);
}

/**
 * Convert base64 to ArrayBuffer
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Convert ArrayBuffer to base64
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
