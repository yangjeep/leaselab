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
//# sourceMappingURL=tenants.d.ts.map