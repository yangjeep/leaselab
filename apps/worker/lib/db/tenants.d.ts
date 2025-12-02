import type { Tenant } from '../../../../shared/types';
import type { DatabaseInput } from './helpers';
export declare function getTenants(dbInput: DatabaseInput, siteId: string, options?: {
    status?: string;
    propertyId?: string;
    unitId?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}): Promise<Tenant[]>;
export declare function getTenantById(dbInput: DatabaseInput, siteId: string, id: string): Promise<Tenant | null>;
export declare function createTenant(dbInput: DatabaseInput, siteId: string, data: Omit<Tenant, 'id' | 'createdAt' | 'updatedAt'>): Promise<Tenant>;
export declare function updateTenant(dbInput: DatabaseInput, siteId: string, id: string, data: Partial<Omit<Tenant, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void>;
export declare function deleteTenant(dbInput: DatabaseInput, siteId: string, id: string): Promise<void>;
//# sourceMappingURL=tenants.d.ts.map