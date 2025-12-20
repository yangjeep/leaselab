import type { ApplicationDocument } from '~/shared/types';
import type { DatabaseInput } from './helpers';
/**
 * Get all documents for a specific application
 */
export declare function getDocumentsByApplicationId(dbInput: DatabaseInput, applicationId: string): Promise<ApplicationDocument[]>;
/**
 * Get documents for a specific applicant
 */
export declare function getDocumentsByApplicantId(dbInput: DatabaseInput, applicantId: string): Promise<ApplicationDocument[]>;
/**
 * Get a single document by ID
 */
export declare function getDocumentById(dbInput: DatabaseInput, documentId: string): Promise<ApplicationDocument | null>;
/**
 * Get document by storage key
 */
export declare function getDocumentByStorageKey(dbInput: DatabaseInput, storageKey: string): Promise<ApplicationDocument | null>;
/**
 * Create a new document record
 */
export declare function createDocument(dbInput: DatabaseInput, data: Omit<ApplicationDocument, 'id' | 'uploadedAt'>): Promise<ApplicationDocument>;
/**
 * Update document metadata
 */
export declare function updateDocument(dbInput: DatabaseInput, documentId: string, updates: Partial<Omit<ApplicationDocument, 'id' | 'applicationId' | 'storageKey' | 'uploadedAt'>>): Promise<ApplicationDocument>;
/**
 * Mark document as verified
 */
export declare function verifyDocument(dbInput: DatabaseInput, documentId: string, verifiedBy: string): Promise<ApplicationDocument>;
/**
 * Reject a document
 */
export declare function rejectDocument(dbInput: DatabaseInput, documentId: string, reason: string, verifiedBy: string): Promise<ApplicationDocument>;
/**
 * Delete a document record (storage cleanup should happen separately)
 */
export declare function deleteDocument(dbInput: DatabaseInput, documentId: string): Promise<void>;
/**
 * Get document statistics for an application
 */
export declare function getDocumentStats(dbInput: DatabaseInput, applicationId: string): Promise<{
    total: number;
    verified: number;
    pending: number;
    rejected: number;
    completeness: number;
}>;
/**
 * Get document statistics per applicant
 */
export declare function getDocumentStatsByApplicant(dbInput: DatabaseInput, applicationId: string): Promise<Array<{
    applicantId: string | null;
    total: number;
    verified: number;
    pending: number;
    rejected: number;
}>>;
//# sourceMappingURL=application-documents.d.ts.map