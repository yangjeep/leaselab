import type { ApplicationApplicant } from '~/shared/types';
import type { DatabaseInput } from './helpers';
/**
 * Get all applicants for a specific application
 * Returns primary applicant first, then co-applicants, then guarantors
 */
export declare function getApplicantsByApplicationId(dbInput: DatabaseInput, applicationId: string): Promise<ApplicationApplicant[]>;
/**
 * Get a single applicant by ID
 */
export declare function getApplicantById(dbInput: DatabaseInput, applicantId: string): Promise<ApplicationApplicant | null>;
/**
 * Get the primary applicant for an application
 */
export declare function getPrimaryApplicant(dbInput: DatabaseInput, applicationId: string): Promise<ApplicationApplicant | null>;
/**
 * Create a new applicant
 */
export declare function createApplicant(dbInput: DatabaseInput, data: Omit<ApplicationApplicant, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApplicationApplicant>;
/**
 * Update an existing applicant
 */
export declare function updateApplicant(dbInput: DatabaseInput, applicantId: string, updates: Partial<Omit<ApplicationApplicant, 'id' | 'applicationId' | 'applicantType' | 'createdAt' | 'updatedAt' | 'createdBy'>>): Promise<ApplicationApplicant>;
/**
 * Delete an applicant (cascade will handle related records)
 */
export declare function deleteApplicant(dbInput: DatabaseInput, applicantId: string): Promise<void>;
/**
 * Get applicant count for an application
 */
export declare function getApplicantCount(dbInput: DatabaseInput, applicationId: string): Promise<number>;
/**
 * Find applicant by invite token
 */
export declare function getApplicantByInviteToken(dbInput: DatabaseInput, inviteToken: string): Promise<ApplicationApplicant | null>;
//# sourceMappingURL=application-applicants.d.ts.map