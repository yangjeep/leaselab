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
//# sourceMappingURL=images.d.ts.map