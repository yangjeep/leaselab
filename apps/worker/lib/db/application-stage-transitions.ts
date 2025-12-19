import type { ApplicationStageTransition } from '~/shared/types';
import { generateId } from '~/shared/utils';
import type { DatabaseInput } from './helpers';
import { normalizeDb } from './helpers';

// Mapper function to convert database row to ApplicationStageTransition type
function mapTransitionFromDb(row: unknown): ApplicationStageTransition {
  const r = row as Record<string, unknown>;
  return {
    id: r.id as string,
    applicationId: r.application_id as string,

    // Stage change
    fromStage: r.from_stage as ApplicationStageTransition['fromStage'],
    toStage: r.to_stage as ApplicationStageTransition['toStage'],
    transitionType: r.transition_type as ApplicationStageTransition['transitionType'],

    // Confirmation metadata
    confirmationAcknowledged: Boolean(r.confirmation_acknowledged),
    bypassReason: r.bypass_reason as string | null,
    bypassCategory: r.bypass_category as ApplicationStageTransition['bypassCategory'],

    // Checklist state
    checklistSnapshot: r.checklist_snapshot ? JSON.parse(r.checklist_snapshot as string) : null,

    // Notes
    internalNotes: r.internal_notes as string | null,

    // Metadata
    transitionedAt: r.transitioned_at as string,
    transitionedBy: r.transitioned_by as string,
  };
}

/**
 * Get all stage transitions for an application
 */
export async function getTransitionsByApplicationId(
  dbInput: DatabaseInput,
  applicationId: string
): Promise<ApplicationStageTransition[]> {
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
export async function getTransitionById(
  dbInput: DatabaseInput,
  transitionId: string
): Promise<ApplicationStageTransition | null> {
  const db = normalizeDb(dbInput);

  const query = 'SELECT * FROM application_stage_transitions WHERE id = ? LIMIT 1';
  const result = await db.queryOne(query, [transitionId]);

  return result ? mapTransitionFromDb(result) : null;
}

/**
 * Get the most recent transition for an application
 */
export async function getLatestTransition(
  dbInput: DatabaseInput,
  applicationId: string
): Promise<ApplicationStageTransition | null> {
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
export async function createTransition(
  dbInput: DatabaseInput,
  data: Omit<ApplicationStageTransition, 'id' | 'transitionedAt'>
): Promise<ApplicationStageTransition> {
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
  if (!created) throw new Error('Failed to create stage transition');
  return created;
}

/**
 * Get transitions by stage range
 */
export async function getTransitionsByStageRange(
  dbInput: DatabaseInput,
  applicationId: string,
  fromStage: string,
  toStage: string
): Promise<ApplicationStageTransition[]> {
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
export async function getBypassTransitions(
  dbInput: DatabaseInput,
  applicationId: string
): Promise<ApplicationStageTransition[]> {
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
export async function getTransitionStats(
  dbInput: DatabaseInput,
  applicationId: string
): Promise<{
  totalTransitions: number;
  manualTransitions: number;
  automaticTransitions: number;
  bypassedTransitions: number;
  averageTimeInStage?: Record<string, number>;
}> {
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
  const r = result as any;

  return {
    totalTransitions: r?.total || 0,
    manualTransitions: r?.manual || 0,
    automaticTransitions: r?.automatic || 0,
    bypassedTransitions: r?.bypassed || 0,
  };
}
