import type { ApplicationApplicant } from '~/shared/types';
import { generateId } from '~/shared/utils';
import type { DatabaseInput } from './helpers';
import { normalizeDb } from './helpers';

// Mapper function to convert database row to ApplicationApplicant type
function mapApplicantFromDb(row: unknown): ApplicationApplicant {
  const r = row as Record<string, unknown>;
  return {
    id: r.id as string,
    applicationId: r.application_id as string,
    applicantType: r.applicant_type as ApplicationApplicant['applicantType'],

    // Personal info
    firstName: r.first_name as string,
    lastName: r.last_name as string,
    email: r.email as string,
    phone: r.phone as string | null,
    dateOfBirth: r.date_of_birth as string | null,

    // Employment
    employmentStatus: r.employment_status as ApplicationApplicant['employmentStatus'],
    employerName: r.employer_name as string | null,
    jobTitle: r.job_title as string | null,
    monthlyIncome: r.monthly_income as number | null,

    // AI Evaluation
    aiScore: r.ai_score as number | null,
    aiLabel: r.ai_label as ApplicationApplicant['aiLabel'],
    aiRiskFlags: r.ai_risk_flags ? JSON.parse(r.ai_risk_flags as string) : null,
    aiEvaluatedAt: r.ai_evaluated_at as string | null,

    // Background check
    backgroundCheckStatus: r.background_check_status as ApplicationApplicant['backgroundCheckStatus'],
    backgroundCheckProvider: r.background_check_provider as string | null,
    backgroundCheckReferenceId: r.background_check_reference_id as string | null,
    backgroundCheckCompletedAt: r.background_check_completed_at as string | null,

    // Invite system
    inviteToken: r.invite_token as string | null,
    inviteSentAt: r.invite_sent_at as string | null,
    inviteAcceptedAt: r.invite_accepted_at as string | null,

    // Metadata
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
    createdBy: r.created_by as string | null,
  };
}

/**
 * Get all applicants for a specific application
 * Returns primary applicant first, then co-applicants, then guarantors
 */
export async function getApplicantsByApplicationId(
  dbInput: DatabaseInput,
  applicationId: string
): Promise<ApplicationApplicant[]> {
  const db = normalizeDb(dbInput);

  const query = `
    SELECT * FROM application_applicants
    WHERE application_id = ?
    ORDER BY
      CASE applicant_type
        WHEN 'primary' THEN 1
        WHEN 'co_applicant' THEN 2
        WHEN 'guarantor' THEN 3
      END,
      created_at ASC
  `;

  const results = await db.query(query, [applicationId]);
  return results.map(mapApplicantFromDb);
}

/**
 * Get a single applicant by ID
 */
export async function getApplicantById(
  dbInput: DatabaseInput,
  applicantId: string
): Promise<ApplicationApplicant | null> {
  const db = normalizeDb(dbInput);

  const query = 'SELECT * FROM application_applicants WHERE id = ? LIMIT 1';
  const result = await db.queryOne(query, [applicantId]);

  return result ? mapApplicantFromDb(result) : null;
}

/**
 * Get the primary applicant for an application
 */
export async function getPrimaryApplicant(
  dbInput: DatabaseInput,
  applicationId: string
): Promise<ApplicationApplicant | null> {
  const db = normalizeDb(dbInput);

  const query = `
    SELECT * FROM application_applicants
    WHERE application_id = ? AND applicant_type = 'primary'
    LIMIT 1
  `;
  const result = await db.queryOne(query, [applicationId]);

  return result ? mapApplicantFromDb(result) : null;
}

/**
 * Create a new applicant
 */
export async function createApplicant(
  dbInput: DatabaseInput,
  data: Omit<ApplicationApplicant, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ApplicationApplicant> {
  const db = normalizeDb(dbInput);
  const id = generateId('app');
  const now = new Date().toISOString();

  const query = `
    INSERT INTO application_applicants (
      id, application_id, applicant_type, first_name, last_name, email, phone,
      date_of_birth, employment_status, employer_name, job_title, monthly_income,
      ai_score, ai_label, ai_risk_flags, ai_evaluated_at,
      background_check_status, background_check_provider,
      background_check_reference_id, background_check_completed_at,
      invite_token, invite_sent_at, invite_accepted_at,
      created_at, updated_at, created_by
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?,
      ?, ?,
      ?, ?, ?,
      ?, ?, ?
    )
  `;

  await db.execute(query, [
    id,
    data.applicationId,
    data.applicantType,
    data.firstName,
    data.lastName,
    data.email,
    data.phone,
    data.dateOfBirth,
    data.employmentStatus,
    data.employerName,
    data.jobTitle,
    data.monthlyIncome,
    data.aiScore,
    data.aiLabel,
    data.aiRiskFlags ? JSON.stringify(data.aiRiskFlags) : null,
    data.aiEvaluatedAt,
    data.backgroundCheckStatus,
    data.backgroundCheckProvider,
    data.backgroundCheckReferenceId,
    data.backgroundCheckCompletedAt,
    data.inviteToken,
    data.inviteSentAt,
    data.inviteAcceptedAt,
    now,
    now,
    data.createdBy,
  ]);

  const created = await getApplicantById(db, id);
  if (!created) throw new Error('Failed to create applicant');
  return created;
}

/**
 * Update an existing applicant
 */
export async function updateApplicant(
  dbInput: DatabaseInput,
  applicantId: string,
  updates: Partial<Omit<ApplicationApplicant, 'id' | 'applicationId' | 'applicantType' | 'createdAt' | 'updatedAt' | 'createdBy'>>
): Promise<ApplicationApplicant> {
  const db = normalizeDb(dbInput);
  const now = new Date().toISOString();

  const setClauses: string[] = ['updated_at = ?'];
  const values: any[] = [now];

  // Build dynamic SET clause based on provided fields
  for (const [key, value] of Object.entries(updates)) {
    // Convert camelCase to snake_case
    const snakeKey = key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);

    // Handle JSON fields
    if (key === 'aiRiskFlags') {
      setClauses.push(`${snakeKey} = ?`);
      values.push(value ? JSON.stringify(value) : null);
    } else {
      setClauses.push(`${snakeKey} = ?`);
      values.push(value);
    }
  }

  values.push(applicantId);

  const query = `
    UPDATE application_applicants
    SET ${setClauses.join(', ')}
    WHERE id = ?
  `;

  await db.execute(query, values);

  const updated = await getApplicantById(db, applicantId);
  if (!updated) throw new Error('Failed to update applicant');
  return updated;
}

/**
 * Delete an applicant (cascade will handle related records)
 */
export async function deleteApplicant(
  dbInput: DatabaseInput,
  applicantId: string
): Promise<void> {
  const db = normalizeDb(dbInput);
  const query = 'DELETE FROM application_applicants WHERE id = ?';
  await db.execute(query, [applicantId]);
}

/**
 * Get applicant count for an application
 */
export async function getApplicantCount(
  dbInput: DatabaseInput,
  applicationId: string
): Promise<number> {
  const db = normalizeDb(dbInput);

  const query = `
    SELECT COUNT(*) as count
    FROM application_applicants
    WHERE application_id = ?
  `;

  const result = await db.queryOne(query, [applicationId]);
  return (result as any)?.count || 0;
}

/**
 * Find applicant by invite token
 */
export async function getApplicantByInviteToken(
  dbInput: DatabaseInput,
  inviteToken: string
): Promise<ApplicationApplicant | null> {
  const db = normalizeDb(dbInput);

  const query = `
    SELECT * FROM application_applicants
    WHERE invite_token = ?
    LIMIT 1
  `;

  const result = await db.queryOne(query, [inviteToken]);
  return result ? mapApplicantFromDb(result) : null;
}
