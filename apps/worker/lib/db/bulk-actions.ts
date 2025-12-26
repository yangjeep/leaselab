/**
 * Database operations for bulk actions and audit trail
 * Supports multi-select operations on applications
 */

import type { DatabaseInput } from '~/shared/storage-core';
import { normalizeDb } from '~/shared/storage-core';
import { nanoid } from 'nanoid';

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
export async function createBulkAction(
  dbInput: DatabaseInput,
  performedBy: string,
  actionType: string,
  applicationCount: number,
  params: Record<string, any>
): Promise<string> {
  const db = normalizeDb(dbInput);
  const bulkActionId = nanoid();

  await db.execute(
    `INSERT INTO bulk_actions (id, performed_by, action_type, application_count, params)
     VALUES (?, ?, ?, ?, ?)`,
    [bulkActionId, performedBy, actionType, applicationCount, JSON.stringify(params)]
  );

  return bulkActionId;
}

/**
 * Update bulk action with success/failure counts
 */
export async function updateBulkActionResults(
  dbInput: DatabaseInput,
  bulkActionId: string,
  successCount: number,
  failureCount: number
): Promise<void> {
  const db = normalizeDb(dbInput);

  await db.execute(
    `UPDATE bulk_actions
     SET success_count = ?, failure_count = ?
     WHERE id = ?`,
    [successCount, failureCount, bulkActionId]
  );
}

/**
 * Get bulk action by ID
 */
export async function getBulkActionById(
  dbInput: DatabaseInput,
  bulkActionId: string
): Promise<BulkAction | null> {
  const db = normalizeDb(dbInput);

  const result = await db.queryOne<any>(
    `SELECT * FROM bulk_actions WHERE id = ?`,
    [bulkActionId]
  );

  if (!result) return null;

  return {
    id: result.id,
    performedBy: result.performed_by,
    actionType: result.action_type as BulkAction['actionType'],
    applicationCount: result.application_count,
    successCount: result.success_count,
    failureCount: result.failure_count,
    params: JSON.parse(result.params || '{}'),
    createdAt: result.created_at,
  };
}

/**
 * Get recent bulk actions for a user
 */
export async function getBulkActionsByUser(
  dbInput: DatabaseInput,
  userId: string,
  limit: number = 20
): Promise<BulkAction[]> {
  const db = normalizeDb(dbInput);

  const results = await db.query<any>(
    `SELECT * FROM bulk_actions
     WHERE performed_by = ?
     ORDER BY created_at DESC
     LIMIT ?`,
    [userId, limit]
  );

  return results.map((result) => ({
    id: result.id,
    performedBy: result.performed_by,
    actionType: result.action_type as BulkAction['actionType'],
    applicationCount: result.application_count,
    successCount: result.success_count,
    failureCount: result.failure_count,
    params: JSON.parse(result.params || '{}'),
    createdAt: result.created_at,
  }));
}

/**
 * Log an audit entry with optional bulk action ID
 */
export async function logAuditEntry(
  dbInput: DatabaseInput,
  entry: {
    entityType: string;
    entityId: string;
    action: string;
    performedBy: string;
    bulkActionId?: string;
    changes?: Record<string, any>;
  }
): Promise<void> {
  const db = normalizeDb(dbInput);
  const auditId = nanoid();

  await db.execute(
    `INSERT INTO audit_log (id, entity_type, entity_id, action, performed_by, bulk_action_id, changes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      auditId,
      entry.entityType,
      entry.entityId,
      entry.action,
      entry.performedBy,
      entry.bulkActionId || null,
      JSON.stringify(entry.changes || {}),
    ]
  );
}
