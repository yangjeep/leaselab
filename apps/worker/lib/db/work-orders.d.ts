import type { WorkOrder } from '../../../../shared/types';
import type { DatabaseInput } from './helpers';
export type WorkOrderWithDetails = WorkOrder & {
    propertyName?: string;
    unitNumber?: string;
};
export declare function getWorkOrders(dbInput: DatabaseInput, siteId: string, options?: {
    status?: string;
    propertyId?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}): Promise<WorkOrderWithDetails[]>;
export declare function getWorkOrderById(dbInput: DatabaseInput, siteId: string, id: string): Promise<WorkOrder | null>;
export declare function createWorkOrder(dbInput: DatabaseInput, siteId: string, data: Omit<WorkOrder, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<WorkOrder>;
export declare function updateWorkOrder(dbInput: DatabaseInput, siteId: string, id: string, data: Partial<WorkOrder>): Promise<void>;
export declare function deleteWorkOrder(dbInput: DatabaseInput, siteId: string, id: string): Promise<void>;
//# sourceMappingURL=work-orders.d.ts.map