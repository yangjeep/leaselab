import type { ApplicationDocument } from '~/shared/types';
import { generateId } from '~/shared/utils';
import type { DatabaseInput } from './helpers';
import { normalizeDb } from './helpers';

// Mapper function to convert database row to ApplicationDocument type
function mapDocumentFromDb(row: unknown): ApplicationDocument {
  const r = row as Record<string, unknown>;
  return {
    id: r.id as string,
    applicationId: r.application_id as string,
    applicantId: r.applicant_id as string | null,

    // Document metadata
    documentType: r.document_type as ApplicationDocument['documentType'],
    fileName: r.file_name as string,
    fileSize: r.file_size as number | null,
    mimeType: r.mime_type as string | null,

    // Storage
    storageKey: r.storage_key as string,
    storageUrl: r.storage_url as string | null,

    // Status
    verificationStatus: r.verification_status as ApplicationDocument['verificationStatus'],
    verifiedBy: r.verified_by as string | null,
    verifiedAt: r.verified_at as string | null,
    rejectionReason: r.rejection_reason as string | null,

    // Metadata
    uploadedAt: r.uploaded_at as string,
    uploadedBy: r.uploaded_by as string | null,
    expiresAt: r.expires_at as string | null,
  };
}

/**
 * Get all documents for a specific application
 */
export async function getDocumentsByApplicationId(
  dbInput: DatabaseInput,
  applicationId: string
): Promise<ApplicationDocument[]> {
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
export async function getDocumentsByApplicantId(
  dbInput: DatabaseInput,
  applicantId: string
): Promise<ApplicationDocument[]> {
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
export async function getDocumentById(
  dbInput: DatabaseInput,
  documentId: string
): Promise<ApplicationDocument | null> {
  const db = normalizeDb(dbInput);

  const query = 'SELECT * FROM application_documents WHERE id = ? LIMIT 1';
  const result = await db.queryOne(query, [documentId]);

  return result ? mapDocumentFromDb(result) : null;
}

/**
 * Get document by storage key
 */
export async function getDocumentByStorageKey(
  dbInput: DatabaseInput,
  storageKey: string
): Promise<ApplicationDocument | null> {
  const db = normalizeDb(dbInput);

  const query = 'SELECT * FROM application_documents WHERE storage_key = ? LIMIT 1';
  const result = await db.queryOne(query, [storageKey]);

  return result ? mapDocumentFromDb(result) : null;
}

/**
 * Create a new document record
 */
export async function createDocument(
  dbInput: DatabaseInput,
  data: Omit<ApplicationDocument, 'id' | 'uploadedAt'>
): Promise<ApplicationDocument> {
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
  if (!created) throw new Error('Failed to create document');
  return created;
}

/**
 * Update document metadata
 */
export async function updateDocument(
  dbInput: DatabaseInput,
  documentId: string,
  updates: Partial<Omit<ApplicationDocument, 'id' | 'applicationId' | 'storageKey' | 'uploadedAt'>>
): Promise<ApplicationDocument> {
  const db = normalizeDb(dbInput);

  const setClauses: string[] = [];
  const values: any[] = [];

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
  if (!updated) throw new Error('Failed to update document');
  return updated;
}

/**
 * Mark document as verified
 */
export async function verifyDocument(
  dbInput: DatabaseInput,
  documentId: string,
  verifiedBy: string
): Promise<ApplicationDocument> {
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
  if (!verified) throw new Error('Failed to verify document');
  return verified;
}

/**
 * Reject a document
 */
export async function rejectDocument(
  dbInput: DatabaseInput,
  documentId: string,
  reason: string,
  verifiedBy: string
): Promise<ApplicationDocument> {
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
  if (!rejected) throw new Error('Failed to reject document');
  return rejected;
}

/**
 * Delete a document record (storage cleanup should happen separately)
 */
export async function deleteDocument(
  dbInput: DatabaseInput,
  documentId: string
): Promise<void> {
  const db = normalizeDb(dbInput);
  const query = 'DELETE FROM application_documents WHERE id = ?';
  await db.execute(query, [documentId]);
}

/**
 * Get document statistics for an application
 */
export async function getDocumentStats(
  dbInput: DatabaseInput,
  applicationId: string
): Promise<{
  total: number;
  verified: number;
  pending: number;
  rejected: number;
  completeness: number;
}> {
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
  const r = result as any;

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
export async function getDocumentStatsByApplicant(
  dbInput: DatabaseInput,
  applicationId: string
): Promise<
  Array<{
    applicantId: string | null;
    total: number;
    verified: number;
    pending: number;
    rejected: number;
  }>
> {
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

  return results.map((r: any) => ({
    applicantId: r.applicant_id,
    total: r.total || 0,
    verified: r.verified || 0,
    pending: r.pending || 0,
    rejected: r.rejected || 0,
  }));
}
