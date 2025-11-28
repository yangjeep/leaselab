import type { Property } from '../../../../shared/types';
import type { DatabaseInput } from './helpers';
export declare function getProperties(dbInput: DatabaseInput, siteId: string, options?: {
    isActive?: boolean;
    propertyType?: string;
    city?: string;
}): Promise<Property[]>;
export declare function getPropertyById(dbInput: DatabaseInput, siteId: string, id: string): Promise<Property | null>;
export declare function getPropertyBySlug(dbInput: DatabaseInput, siteId: string, slug: string): Promise<Property | null>;
export declare function getPropertyWithUnits(dbInput: DatabaseInput, siteId: string, id: string): Promise<Property | null>;
export declare function createProperty(dbInput: DatabaseInput, siteId: string, data: {
    name: string;
    address: string;
    city: string;
    province: string;
    postalCode: string;
    propertyType: string;
    description?: string;
    yearBuilt?: number;
    lotSize?: number;
    amenities?: string[];
    latitude?: number;
    longitude?: number;
}): Promise<Property>;
export declare function updateProperty(dbInput: DatabaseInput, siteId: string, id: string, data: Partial<{
    name: string;
    address: string;
    city: string;
    province: string;
    postalCode: string;
    propertyType: string;
    description: string;
    yearBuilt: number;
    lotSize: number;
    amenities: string[];
    latitude: number;
    longitude: number;
    isActive: boolean;
}>): Promise<void>;
export declare function deleteProperty(dbInput: DatabaseInput, siteId: string, id: string): Promise<void>;
export declare function getPublicListings(dbInput: DatabaseInput, siteId: string, filters?: {
    city?: string;
    status?: string;
}, r2PublicUrl?: string): Promise<any[]>;
//# sourceMappingURL=properties.d.ts.map