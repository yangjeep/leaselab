import { generateId } from '~/shared/utils';
import { normalizeDb } from './helpers';
// Mapper function to convert database row to ApplicationApplicant type
function mapApplicantFromDb(row) {
    const r = row;
    return {
        id: r.id,
        applicationId: r.application_id,
        applicantType: r.applicant_type,
        // Personal info
        firstName: r.first_name,
        lastName: r.last_name,
        email: r.email,
        phone: r.phone,
        dateOfBirth: r.date_of_birth,
        // Employment
        employmentStatus: r.employment_status,
        employerName: r.employer_name,
        jobTitle: r.job_title,
        monthlyIncome: r.monthly_income,
        // AI Evaluation
        aiScore: r.ai_score,
        aiLabel: r.ai_label,
        aiRiskFlags: r.ai_risk_flags ? JSON.parse(r.ai_risk_flags) : null,
        aiEvaluatedAt: r.ai_evaluated_at,
        // Background check
        backgroundCheckStatus: r.background_check_status,
        backgroundCheckProvider: r.background_check_provider,
        backgroundCheckReferenceId: r.background_check_reference_id,
        backgroundCheckCompletedAt: r.background_check_completed_at,
        // Invite system
        inviteToken: r.invite_token,
        inviteSentAt: r.invite_sent_at,
        inviteAcceptedAt: r.invite_accepted_at,
        // Metadata
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        createdBy: r.created_by,
    };
}
/**
 * Get all applicants for a specific application
 * Returns primary applicant first, then co-applicants, then guarantors
 */
export async function getApplicantsByApplicationId(dbInput, applicationId) {
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
export async function getApplicantById(dbInput, applicantId) {
    const db = normalizeDb(dbInput);
    const query = 'SELECT * FROM application_applicants WHERE id = ? LIMIT 1';
    const result = await db.queryOne(query, [applicantId]);
    return result ? mapApplicantFromDb(result) : null;
}
/**
 * Get the primary applicant for an application
 */
export async function getPrimaryApplicant(dbInput, applicationId) {
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
export async function createApplicant(dbInput, data) {
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
    if (!created)
        throw new Error('Failed to create applicant');
    return created;
}
/**
 * Update an existing applicant
 */
export async function updateApplicant(dbInput, applicantId, updates) {
    const db = normalizeDb(dbInput);
    const now = new Date().toISOString();
    const setClauses = ['updated_at = ?'];
    const values = [now];
    // Build dynamic SET clause based on provided fields
    for (const [key, value] of Object.entries(updates)) {
        // Convert camelCase to snake_case
        const snakeKey = key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
        // Handle JSON fields
        if (key === 'aiRiskFlags') {
            setClauses.push(`${snakeKey} = ?`);
            values.push(value ? JSON.stringify(value) : null);
        }
        else {
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
    if (!updated)
        throw new Error('Failed to update applicant');
    return updated;
}
/**
 * Delete an applicant (cascade will handle related records)
 */
export async function deleteApplicant(dbInput, applicantId) {
    const db = normalizeDb(dbInput);
    const query = 'DELETE FROM application_applicants WHERE id = ?';
    await db.execute(query, [applicantId]);
}
/**
 * Get applicant count for an application
 */
export async function getApplicantCount(dbInput, applicationId) {
    const db = normalizeDb(dbInput);
    const query = `
    SELECT COUNT(*) as count
    FROM application_applicants
    WHERE application_id = ?
  `;
    const result = await db.queryOne(query, [applicationId]);
    return result?.count || 0;
}
/**
 * Find applicant by invite token
 */
export async function getApplicantByInviteToken(dbInput, inviteToken) {
    const db = normalizeDb(dbInput);
    const query = `
    SELECT * FROM application_applicants
    WHERE invite_token = ?
    LIMIT 1
  `;
    const result = await db.queryOne(query, [inviteToken]);
    return result ? mapApplicantFromDb(result) : null;
}
