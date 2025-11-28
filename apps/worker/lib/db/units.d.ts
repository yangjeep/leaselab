import type { Unit, UnitHistory, UnitStatus, UnitEventType } from '../../../../shared/types';
import type { DatabaseInput } from './helpers';
export declare function getUnits(dbInput: DatabaseInput, siteId: string, options?: {
    propertyId?: string;
    status?: UnitStatus;
    isActive?: boolean;
}): Promise<Unit[]>;
export declare function getUnitsByPropertyId(dbInput: DatabaseInput, siteId: string, propertyId: string): Promise<Unit[]>;
export declare function getUnitById(dbInput: DatabaseInput, siteId: string, id: string): Promise<Unit | null>;
export declare function getUnitWithDetails(dbInput: DatabaseInput, siteId: string, id: string): Promise<Unit | null>;
export declare function createUnit(dbInput: DatabaseInput, siteId: string, data: {
    propertyId: string;
    unitNumber: string;
    name?: string;
    bedrooms: number;
    bathrooms: number;
    sqft?: number;
    rentAmount: number;
    depositAmount?: number;
    status?: UnitStatus;
    floor?: number;
    features?: string[];
    availableDate?: string;
}): Promise<Unit>;
export declare function updateUnit(dbInput: DatabaseInput, siteId: string, id: string, data: Partial<{
    unitNumber: string;
    name: string;
    bedrooms: number;
    bathrooms: number;
    sqft: number;
    rentAmount: number;
    depositAmount: number;
    status: UnitStatus;
    floor: number;
    features: string[];
    availableDate: string;
    currentTenantId: string | null;
    isActive: boolean;
}>): Promise<void>;
export declare function deleteUnit(dbInput: DatabaseInput, siteId: string, id: string): Promise<void>;
export declare function getUnitHistory(dbInput: DatabaseInput, siteId: string, unitId: string): Promise<UnitHistory[]>;
export declare function createUnitHistory(dbInput: DatabaseInput, siteId: string, data: {
    unitId: string;
    eventType: UnitEventType;
    eventData: Record<string, unknown>;
}): Promise<UnitHistory>;
//# sourceMappingURL=units.d.ts.map