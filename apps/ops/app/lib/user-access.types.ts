import type {
    Lead, LeadFile, LeadAIResult, Property, Tenant, Lease, WorkOrder, User,
    Unit, UnitHistory, PropertyImage, UnitStatus, UnitEventType
} from '~/shared/types';
import { generateId } from '~/shared/utils';
import type { IDatabase } from '~/shared/storage-core';

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
