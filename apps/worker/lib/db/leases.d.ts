import type { Lease, LeaseFile } from '../../../../shared/types';
import type { DatabaseInput } from './helpers';
export declare function getLeases(dbInput: DatabaseInput, siteId: string, options?: {
    status?: string;
    propertyId?: string;
    unitId?: string;
    tenantId?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}): Promise<Lease[]>;
export declare function getLeaseById(dbInput: DatabaseInput, siteId: string, id: string): Promise<Lease | null>;
export declare function createLease(dbInput: DatabaseInput, siteId: string, data: Omit<Lease, 'id' | 'createdAt' | 'updatedAt' | 'property' | 'unit' | 'tenant'>): Promise<Lease>;
export declare function updateLease(dbInput: DatabaseInput, siteId: string, id: string, data: Partial<Omit<Lease, 'id' | 'createdAt' | 'updatedAt' | 'property' | 'unit' | 'tenant'>>): Promise<void>;
export declare function deleteLease(dbInput: DatabaseInput, siteId: string, id: string): Promise<void>;
export declare function getLeaseFiles(dbInput: DatabaseInput, siteId: string, leaseId: string): Promise<LeaseFile[]>;
export declare function getLeaseFileById(dbInput: DatabaseInput, siteId: string, id: string): Promise<LeaseFile | null>;
export declare function createLeaseFile(dbInput: DatabaseInput, siteId: string, data: Omit<LeaseFile, 'id' | 'uploadedAt' | 'signedUrl' | 'expiresAt'>): Promise<LeaseFile>;
export declare function deleteLeaseFile(dbInput: DatabaseInput, siteId: string, id: string): Promise<void>;
//# sourceMappingURL=leases.d.ts.map