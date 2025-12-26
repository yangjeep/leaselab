/**
 * Database operations for bulk actions and audit trail
 * Supports multi-select operations on applications
 */
import type { DatabaseInput } from '~/shared/storage-core';
export interface BulkAction {
    id: string;
    performedBy: string;
    actionType: 'reject' | 'move_to_stage' | 'archive' | 'send_email';
    applicationCount: number;
    successCount: number;
    failureCount: number;
    params: Record<string, any>;
    createdAt: string;
}
/**
 * Create a new bulk action record
 * Returns the bulk action ID for linking audit entries
 */
export declare function createBulkAction(dbInput: DatabaseInput, performedBy: string, actionType: string, applicationCount: number, params: Record<string, any>): Promise<string>;
/**
 * Update bulk action with success/failure counts
 */
export declare function updateBulkActionResults(dbInput: DatabaseInput, bulkActionId: string, successCount: number, failureCount: number): Promise<void>;
/**
 * Get bulk action by ID
 */
export declare function getBulkActionById(dbInput: DatabaseInput, bulkActionId: string): Promise<BulkAction | null>;
/**
 * Get recent bulk actions for a user
 */
export declare function getBulkActionsByUser(dbInput: DatabaseInput, userId: string, limit?: number): Promise<BulkAction[]>;
/**
 * Log an audit entry with optional bulk action ID
 */
export declare function logAuditEntry(dbInput: DatabaseInput, entry: {
    entityType: string;
    entityId: string;
    action: string;
    performedBy: string;
    bulkActionId?: string;
    changes?: Record<string, any>;
}): Promise<void>;
//# sourceMappingURL=bulk-actions.d.ts.map