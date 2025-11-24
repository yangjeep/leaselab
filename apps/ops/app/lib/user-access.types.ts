import type {
    Lead, LeadFile, LeadAIResult, Property, Tenant, Lease, WorkOrder, User,
    Unit, UnitHistory, PropertyImage, UnitStatus, UnitEventType
} from '@leaselab/shared-types';
import { generateId } from '@leaselab/shared-utils';
import type { IDatabase } from '@leaselab/storage-core';

// User Access type for multi-tenant management
export interface UserAccess {
    id: string;
    userId: string;
    siteId: string;
    grantedAt: string;
    grantedBy: string | null;
}

// Accessible Site info for UI
export interface AccessibleSite {
    siteId: string;
    grantedAt: string;
}
