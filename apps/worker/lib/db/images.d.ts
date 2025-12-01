import type { PropertyImage } from '../../../../shared/types';
import type { DatabaseInput } from './helpers';
export declare function getImagesByEntity(dbInput: DatabaseInput, siteId: string, entityType: 'property' | 'unit', entityId: string): Promise<PropertyImage[]>;
export declare function getImageById(dbInput: DatabaseInput, siteId: string, id: string): Promise<PropertyImage | null>;
export declare function createImage(dbInput: DatabaseInput, siteId: string, data: {
    entityType: 'property' | 'unit';
    entityId: string;
    r2Key: string;
    filename: string;
    contentType: string;
    sizeBytes: number;
    width?: number;
    height?: number;
    sortOrder?: number;
    isCover?: boolean;
    altText?: string;
}): Promise<PropertyImage>;
export declare function updateImage(dbInput: DatabaseInput, siteId: string, id: string, data: Partial<{
    sortOrder: number;
    isCover: boolean;
    altText: string;
}>): Promise<void>;
export declare function deleteImage(dbInput: DatabaseInput, siteId: string, id: string): Promise<void>;
export declare function setCoverImage(dbInput: DatabaseInput, siteId: string, entityType: 'property' | 'unit', entityId: string, imageId: string): Promise<void>;
/**
 * Add public R2 URLs to images
 */
export declare function addImageUrls(images: PropertyImage[], r2PublicUrl?: string): PropertyImage[];
/**
 * Add public R2 URLs to images and verify they exist in R2
 * Filters out images that don't exist in the bucket
 */
export declare function addImageUrlsWithVerification(images: PropertyImage[], r2PublicUrl: string | undefined, bucket: any): Promise<PropertyImage[]>;
/**
 * Get images by entity with public URLs
 */
export declare function getImagesByEntityWithUrls(dbInput: DatabaseInput, siteId: string, entityType: 'property' | 'unit', entityId: string, r2PublicUrl?: string): Promise<PropertyImage[]>;
/**
 * Get images by entity with public URLs and verify they exist in R2
 */
export declare function getImagesByEntityWithVerification(dbInput: DatabaseInput, siteId: string, entityType: 'property' | 'unit', entityId: string, r2PublicUrl: string | undefined, bucket: any): Promise<PropertyImage[]>;
//# sourceMappingURL=images.d.ts.map