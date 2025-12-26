import type { ApplicationInternalNote } from '~/shared/types';
import { generateId } from '~/shared/utils';
import type { DatabaseInput } from './helpers';
import { normalizeDb } from './helpers';

// Mapper function to convert database row to ApplicationInternalNote type
function mapNoteFromDb(row: unknown): ApplicationInternalNote {
  const r = row as Record<string, unknown>;
  return {
    id: r.id as string,
    applicationId: r.application_id as string,
    applicantId: r.applicant_id as string | null,

    // Note content
    noteText: r.note_text as string,
    noteCategory: r.note_category as ApplicationInternalNote['noteCategory'],

    // Tags
    taggedApplicants: r.tagged_applicants ? JSON.parse(r.tagged_applicants as string) : null,
    priority: r.priority as ApplicationInternalNote['priority'],

    // Visibility
    isSensitive: Boolean(r.is_sensitive),
    visibleToRoles: r.visible_to_roles ? JSON.parse(r.visible_to_roles as string) : null,

    // Metadata
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
    createdBy: r.created_by as string,
  };
}

/**
 * Get all notes for an application
 */
export async function getNotesByApplicationId(
  dbInput: DatabaseInput,
  applicationId: string,
  options?: {
    category?: string;
    includeArchived?: boolean;
  }
): Promise<ApplicationInternalNote[]> {
  const db = normalizeDb(dbInput);
  const { category } = options || {};

  let query = `
    SELECT * FROM application_internal_notes
    WHERE application_id = ?
  `;
  const params: any[] = [applicationId];

  if (category) {
    query += ' AND note_category = ?';
    params.push(category);
  }

  query += ' ORDER BY created_at DESC';

  const results = await db.query(query, params);
  return results.map(mapNoteFromDb);
}

/**
 * Get notes for a specific applicant
 */
export async function getNotesByApplicantId(
  dbInput: DatabaseInput,
  applicantId: string
): Promise<ApplicationInternalNote[]> {
  const db = normalizeDb(dbInput);

  const query = `
    SELECT * FROM application_internal_notes
    WHERE applicant_id = ?
    ORDER BY created_at DESC
  `;

  const results = await db.query(query, [applicantId]);
  return results.map(mapNoteFromDb);
}

/**
 * Get a single note by ID
 */
export async function getNoteById(
  dbInput: DatabaseInput,
  noteId: string
): Promise<ApplicationInternalNote | null> {
  const db = normalizeDb(dbInput);

  const query = 'SELECT * FROM application_internal_notes WHERE id = ? LIMIT 1';
  const result = await db.queryOne(query, [noteId]);

  return result ? mapNoteFromDb(result) : null;
}

/**
 * Create a new internal note
 */
export async function createNote(
  dbInput: DatabaseInput,
  data: Omit<ApplicationInternalNote, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ApplicationInternalNote> {
  const db = normalizeDb(dbInput);
  const id = generateId('note');
  const now = new Date().toISOString();

  const query = `
    INSERT INTO application_internal_notes (
      id, application_id, applicant_id, note_text, note_category,
      tagged_applicants, priority, is_sensitive, visible_to_roles,
      created_at, updated_at, created_by
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?
    )
  `;

  await db.execute(query, [
    id,
    data.applicationId,
    data.applicantId,
    data.noteText,
    data.noteCategory,
    data.taggedApplicants ? JSON.stringify(data.taggedApplicants) : null,
    data.priority,
    data.isSensitive ? 1 : 0,
    data.visibleToRoles ? JSON.stringify(data.visibleToRoles) : null,
    now,
    now,
    data.createdBy,
  ]);

  const created = await getNoteById(db, id);
  if (!created) throw new Error('Failed to create note');
  return created;
}

/**
 * Update an existing note
 */
export async function updateNote(
  dbInput: DatabaseInput,
  noteId: string,
  updates: Partial<Pick<ApplicationInternalNote, 'noteText' | 'noteCategory' | 'taggedApplicants' | 'priority' | 'isSensitive' | 'visibleToRoles'>>
): Promise<ApplicationInternalNote> {
  const db = normalizeDb(dbInput);
  const now = new Date().toISOString();

  const setClauses: string[] = ['updated_at = ?'];
  const values: any[] = [now];

  // Build dynamic SET clause based on provided fields
  for (const [key, value] of Object.entries(updates)) {
    // Convert camelCase to snake_case
    const snakeKey = key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);

    // Handle JSON fields
    if (key === 'taggedApplicants' || key === 'visibleToRoles') {
      setClauses.push(`${snakeKey} = ?`);
      values.push(value ? JSON.stringify(value) : null);
    } else if (key === 'isSensitive') {
      setClauses.push(`${snakeKey} = ?`);
      values.push(value ? 1 : 0);
    } else {
      setClauses.push(`${snakeKey} = ?`);
      values.push(value);
    }
  }

  values.push(noteId);

  const query = `
    UPDATE application_internal_notes
    SET ${setClauses.join(', ')}
    WHERE id = ?
  `;

  await db.execute(query, values);

  const updated = await getNoteById(db, noteId);
  if (!updated) throw new Error('Failed to update note');
  return updated;
}

/**
 * Delete a note
 */
export async function deleteNote(
  dbInput: DatabaseInput,
  noteId: string
): Promise<void> {
  const db = normalizeDb(dbInput);
  const query = 'DELETE FROM application_internal_notes WHERE id = ?';
  await db.execute(query, [noteId]);
}

/**
 * Get notes by category for an application
 */
export async function getNotesByCategory(
  dbInput: DatabaseInput,
  applicationId: string,
  category: ApplicationInternalNote['noteCategory']
): Promise<ApplicationInternalNote[]> {
  const db = normalizeDb(dbInput);

  const query = `
    SELECT * FROM application_internal_notes
    WHERE application_id = ? AND note_category = ?
    ORDER BY created_at DESC
  `;

  const results = await db.query(query, [applicationId, category]);
  return results.map(mapNoteFromDb);
}

/**
 * Get high-priority notes for an application
 */
export async function getHighPriorityNotes(
  dbInput: DatabaseInput,
  applicationId: string
): Promise<ApplicationInternalNote[]> {
  const db = normalizeDb(dbInput);

  const query = `
    SELECT * FROM application_internal_notes
    WHERE application_id = ?
      AND priority IN ('high', 'urgent')
    ORDER BY
      CASE priority
        WHEN 'urgent' THEN 1
        WHEN 'high' THEN 2
      END,
      created_at DESC
  `;

  const results = await db.query(query, [applicationId]);
  return results.map(mapNoteFromDb);
}

/**
 * Get note statistics for an application
 */
export async function getNoteStats(
  dbInput: DatabaseInput,
  applicationId: string
): Promise<{
  total: number;
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
  sensitiveCount: number;
}> {
  const db = normalizeDb(dbInput);

  const query = `
    SELECT
      COUNT(*) as total,
      note_category,
      priority,
      SUM(CASE WHEN is_sensitive = 1 THEN 1 ELSE 0 END) as sensitive_count
    FROM application_internal_notes
    WHERE application_id = ?
    GROUP BY note_category, priority
  `;

  const results = await db.query(query, [applicationId]);

  const byCategory: Record<string, number> = {};
  const byPriority: Record<string, number> = {};
  let total = 0;
  let sensitiveCount = 0;

  results.forEach((r: any) => {
    const category = r.note_category || 'general';
    const priority = r.priority || 'low';

    byCategory[category] = (byCategory[category] || 0) + 1;
    byPriority[priority] = (byPriority[priority] || 0) + 1;
    total += 1;
    sensitiveCount += r.sensitive_count || 0;
  });

  return {
    total,
    byCategory,
    byPriority,
    sensitiveCount,
  };
}
