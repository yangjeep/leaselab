/**
 * Database operations for bulk actions and audit trail
 * Supports multi-select operations on applications
 */
import { normalizeDb } from '~/shared/storage-core';
import { nanoid } from 'nanoid';
/**
 * Create a new bulk action record
 * Returns the bulk action ID for linking audit entries
 */
export async function createBulkAction(dbInput, performedBy, actionType, applicationCount, params) {
    const db = normalizeDb(dbInput);
    const bulkActionId = nanoid();
    await db.execute(`INSERT INTO bulk_actions (id, performed_by, action_type, application_count, params)
     VALUES (?, ?, ?, ?, ?)`, [bulkActionId, performedBy, actionType, applicationCount, JSON.stringify(params)]);
    return bulkActionId;
}
/**
 * Update bulk action with success/failure counts
 */
export async function updateBulkActionResults(dbInput, bulkActionId, successCount, failureCount) {
    const db = normalizeDb(dbInput);
    await db.execute(`UPDATE bulk_actions
     SET success_count = ?, failure_count = ?
     WHERE id = ?`, [successCount, failureCount, bulkActionId]);
}
/**
 * Get bulk action by ID
 */
export async function getBulkActionById(dbInput, bulkActionId) {
    const db = normalizeDb(dbInput);
    const result = await db.queryOne(`SELECT * FROM bulk_actions WHERE id = ?`, [bulkActionId]);
    if (!result)
        return null;
    return {
        id: result.id,
        performedBy: result.performed_by,
        actionType: result.action_type,
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
export async function getBulkActionsByUser(dbInput, userId, limit = 20) {
    const db = normalizeDb(dbInput);
    const results = await db.query(`SELECT * FROM bulk_actions
     WHERE performed_by = ?
     ORDER BY created_at DESC
     LIMIT ?`, [userId, limit]);
    return results.map((result) => ({
        id: result.id,
        performedBy: result.performed_by,
        actionType: result.action_type,
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
export async function logAuditEntry(dbInput, entry) {
    const db = normalizeDb(dbInput);
    const auditId = nanoid();
    await db.execute(`INSERT INTO audit_log (id, entity_type, entity_id, action, performed_by, bulk_action_id, changes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`, [
        auditId,
        entry.entityType,
        entry.entityId,
        entry.action,
        entry.performedBy,
        entry.bulkActionId || null,
        JSON.stringify(entry.changes || {}),
    ]);
}
