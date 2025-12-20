import { generateId } from '~/shared/utils';
import { normalizeDb } from './helpers';
// Mapper function to convert database row to ApplicationDocument type
function mapDocumentFromDb(row) {
    const r = row;
    return {
        id: r.id,
        applicationId: r.application_id,
        applicantId: r.applicant_id,
        // Document metadata
        documentType: r.document_type,
        fileName: r.file_name,
        fileSize: r.file_size,
        mimeType: r.mime_type,
        // Storage
        storageKey: r.storage_key,
        storageUrl: r.storage_url,
        // Status
        verificationStatus: r.verification_status,
        verifiedBy: r.verified_by,
        verifiedAt: r.verified_at,
        rejectionReason: r.rejection_reason,
        // Metadata
        uploadedAt: r.uploaded_at,
        uploadedBy: r.uploaded_by,
        expiresAt: r.expires_at,
    };
}
/**
 * Get all documents for a specific application
 */
export async function getDocumentsByApplicationId(dbInput, applicationId) {
    const db = normalizeDb(dbInput);
    const query = `
    SELECT * FROM application_documents
    WHERE application_id = ?
    ORDER BY uploaded_at DESC
  `;
    const results = await db.query(query, [applicationId]);
    return results.map(mapDocumentFromDb);
}
/**
 * Get documents for a specific applicant
 */
export async function getDocumentsByApplicantId(dbInput, applicantId) {
    const db = normalizeDb(dbInput);
    const query = `
    SELECT * FROM application_documents
    WHERE applicant_id = ?
    ORDER BY uploaded_at DESC
  `;
    const results = await db.query(query, [applicantId]);
    return results.map(mapDocumentFromDb);
}
/**
 * Get a single document by ID
 */
export async function getDocumentById(dbInput, documentId) {
    const db = normalizeDb(dbInput);
    const query = 'SELECT * FROM application_documents WHERE id = ? LIMIT 1';
    const result = await db.queryOne(query, [documentId]);
    return result ? mapDocumentFromDb(result) : null;
}
/**
 * Get document by storage key
 */
export async function getDocumentByStorageKey(dbInput, storageKey) {
    const db = normalizeDb(dbInput);
    const query = 'SELECT * FROM application_documents WHERE storage_key = ? LIMIT 1';
    const result = await db.queryOne(query, [storageKey]);
    return result ? mapDocumentFromDb(result) : null;
}
/**
 * Create a new document record
 */
export async function createDocument(dbInput, data) {
    const db = normalizeDb(dbInput);
    const id = generateId('doc');
    const now = new Date().toISOString();
    const query = `
    INSERT INTO application_documents (
      id, application_id, applicant_id, document_type, file_name, file_size,
      mime_type, storage_key, storage_url, verification_status, verified_by,
      verified_at, rejection_reason, uploaded_at, uploaded_by, expires_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?
    )
  `;
    await db.execute(query, [
        id,
        data.applicationId,
        data.applicantId,
        data.documentType,
        data.fileName,
        data.fileSize,
        data.mimeType,
        data.storageKey,
        data.storageUrl,
        data.verificationStatus || 'pending',
        data.verifiedBy,
        data.verifiedAt,
        data.rejectionReason,
        now,
        data.uploadedBy,
        data.expiresAt,
    ]);
    const created = await getDocumentById(db, id);
    if (!created)
        throw new Error('Failed to create document');
    return created;
}
/**
 * Update document metadata
 */
export async function updateDocument(dbInput, documentId, updates) {
    const db = normalizeDb(dbInput);
    const setClauses = [];
    const values = [];
    // Build dynamic SET clause based on provided fields
    for (const [key, value] of Object.entries(updates)) {
        // Convert camelCase to snake_case
        const snakeKey = key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
        setClauses.push(`${snakeKey} = ?`);
        values.push(value);
    }
    values.push(documentId);
    const query = `
    UPDATE application_documents
    SET ${setClauses.join(', ')}
    WHERE id = ?
  `;
    await db.execute(query, values);
    const updated = await getDocumentById(db, documentId);
    if (!updated)
        throw new Error('Failed to update document');
    return updated;
}
/**
 * Mark document as verified
 */
export async function verifyDocument(dbInput, documentId, verifiedBy) {
    const db = normalizeDb(dbInput);
    const now = new Date().toISOString();
    const query = `
    UPDATE application_documents
    SET verification_status = 'verified',
        verified_by = ?,
        verified_at = ?
    WHERE id = ?
  `;
    await db.execute(query, [verifiedBy, now, documentId]);
    const verified = await getDocumentById(db, documentId);
    if (!verified)
        throw new Error('Failed to verify document');
    return verified;
}
/**
 * Reject a document
 */
export async function rejectDocument(dbInput, documentId, reason, verifiedBy) {
    const db = normalizeDb(dbInput);
    const now = new Date().toISOString();
    const query = `
    UPDATE application_documents
    SET verification_status = 'rejected',
        rejection_reason = ?,
        verified_by = ?,
        verified_at = ?
    WHERE id = ?
  `;
    await db.execute(query, [reason, verifiedBy, now, documentId]);
    const rejected = await getDocumentById(db, documentId);
    if (!rejected)
        throw new Error('Failed to reject document');
    return rejected;
}
/**
 * Delete a document record (storage cleanup should happen separately)
 */
export async function deleteDocument(dbInput, documentId) {
    const db = normalizeDb(dbInput);
    const query = 'DELETE FROM application_documents WHERE id = ?';
    await db.execute(query, [documentId]);
}
/**
 * Get document statistics for an application
 */
export async function getDocumentStats(dbInput, applicationId) {
    const db = normalizeDb(dbInput);
    const query = `
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN verification_status = 'verified' THEN 1 ELSE 0 END) as verified,
      SUM(CASE WHEN verification_status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN verification_status = 'rejected' THEN 1 ELSE 0 END) as rejected
    FROM application_documents
    WHERE application_id = ?
  `;
    const result = await db.queryOne(query, [applicationId]);
    const r = result;
    const total = r?.total || 0;
    const verified = r?.verified || 0;
    const completeness = total > 0 ? Math.round((verified / total) * 100) : 0;
    return {
        total,
        verified,
        pending: r?.pending || 0,
        rejected: r?.rejected || 0,
        completeness,
    };
}
/**
 * Get document statistics per applicant
 */
export async function getDocumentStatsByApplicant(dbInput, applicationId) {
    const db = normalizeDb(dbInput);
    const query = `
    SELECT
      applicant_id,
      COUNT(*) as total,
      SUM(CASE WHEN verification_status = 'verified' THEN 1 ELSE 0 END) as verified,
      SUM(CASE WHEN verification_status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN verification_status = 'rejected' THEN 1 ELSE 0 END) as rejected
    FROM application_documents
    WHERE application_id = ?
    GROUP BY applicant_id
  `;
    const results = await db.query(query, [applicationId]);
    return results.map((r) => ({
        applicantId: r.applicant_id,
        total: r.total || 0,
        verified: r.verified || 0,
        pending: r.pending || 0,
        rejected: r.rejected || 0,
    }));
}
