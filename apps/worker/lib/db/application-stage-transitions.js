import { generateId } from '~/shared/utils';
import { normalizeDb } from './helpers';
// Mapper function to convert database row to ApplicationStageTransition type
function mapTransitionFromDb(row) {
    const r = row;
    return {
        id: r.id,
        applicationId: r.application_id,
        // Stage change
        fromStage: r.from_stage,
        toStage: r.to_stage,
        transitionType: r.transition_type,
        // Confirmation metadata
        confirmationAcknowledged: Boolean(r.confirmation_acknowledged),
        bypassReason: r.bypass_reason,
        bypassCategory: r.bypass_category,
        // Checklist state
        checklistSnapshot: r.checklist_snapshot ? JSON.parse(r.checklist_snapshot) : null,
        // Notes
        internalNotes: r.internal_notes,
        // Metadata
        transitionedAt: r.transitioned_at,
        transitionedBy: r.transitioned_by,
    };
}
/**
 * Get all stage transitions for an application
 */
export async function getTransitionsByApplicationId(dbInput, applicationId) {
    const db = normalizeDb(dbInput);
    const query = `
    SELECT * FROM application_stage_transitions
    WHERE application_id = ?
    ORDER BY transitioned_at DESC
  `;
    const results = await db.query(query, [applicationId]);
    return results.map(mapTransitionFromDb);
}
/**
 * Get a single transition by ID
 */
export async function getTransitionById(dbInput, transitionId) {
    const db = normalizeDb(dbInput);
    const query = 'SELECT * FROM application_stage_transitions WHERE id = ? LIMIT 1';
    const result = await db.queryOne(query, [transitionId]);
    return result ? mapTransitionFromDb(result) : null;
}
/**
 * Get the most recent transition for an application
 */
export async function getLatestTransition(dbInput, applicationId) {
    const db = normalizeDb(dbInput);
    const query = `
    SELECT * FROM application_stage_transitions
    WHERE application_id = ?
    ORDER BY transitioned_at DESC
    LIMIT 1
  `;
    const result = await db.queryOne(query, [applicationId]);
    return result ? mapTransitionFromDb(result) : null;
}
/**
 * Create a new stage transition record
 */
export async function createTransition(dbInput, data) {
    const db = normalizeDb(dbInput);
    const id = generateId('trans');
    const now = new Date().toISOString();
    const query = `
    INSERT INTO application_stage_transitions (
      id, application_id, from_stage, to_stage, transition_type,
      confirmation_acknowledged, bypass_reason, bypass_category,
      checklist_snapshot, internal_notes, transitioned_at, transitioned_by
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?, ?
    )
  `;
    await db.execute(query, [
        id,
        data.applicationId,
        data.fromStage,
        data.toStage,
        data.transitionType,
        data.confirmationAcknowledged ? 1 : 0,
        data.bypassReason,
        data.bypassCategory,
        data.checklistSnapshot ? JSON.stringify(data.checklistSnapshot) : null,
        data.internalNotes,
        now,
        data.transitionedBy,
    ]);
    const created = await getTransitionById(db, id);
    if (!created)
        throw new Error('Failed to create stage transition');
    return created;
}
/**
 * Get transitions by stage range
 */
export async function getTransitionsByStageRange(dbInput, applicationId, fromStage, toStage) {
    const db = normalizeDb(dbInput);
    const query = `
    SELECT * FROM application_stage_transitions
    WHERE application_id = ?
      AND from_stage = ?
      AND to_stage = ?
    ORDER BY transitioned_at DESC
  `;
    const results = await db.query(query, [applicationId, fromStage, toStage]);
    return results.map(mapTransitionFromDb);
}
/**
 * Get transitions that required bypass
 */
export async function getBypassTransitions(dbInput, applicationId) {
    const db = normalizeDb(dbInput);
    const query = `
    SELECT * FROM application_stage_transitions
    WHERE application_id = ?
      AND bypass_reason IS NOT NULL
    ORDER BY transitioned_at DESC
  `;
    const results = await db.query(query, [applicationId]);
    return results.map(mapTransitionFromDb);
}
/**
 * Get transition statistics for an application
 */
export async function getTransitionStats(dbInput, applicationId) {
    const db = normalizeDb(dbInput);
    const query = `
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN transition_type = 'manual' THEN 1 ELSE 0 END) as manual,
      SUM(CASE WHEN transition_type = 'automatic' THEN 1 ELSE 0 END) as automatic,
      SUM(CASE WHEN bypass_reason IS NOT NULL THEN 1 ELSE 0 END) as bypassed
    FROM application_stage_transitions
    WHERE application_id = ?
  `;
    const result = await db.queryOne(query, [applicationId]);
    const r = result;
    return {
        totalTransitions: r?.total || 0,
        manualTransitions: r?.manual || 0,
        automaticTransitions: r?.automatic || 0,
        bypassedTransitions: r?.bypassed || 0,
    };
}
