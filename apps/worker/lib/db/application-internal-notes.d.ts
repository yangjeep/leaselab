import type { ApplicationInternalNote } from '~/shared/types';
import type { DatabaseInput } from './helpers';
/**
 * Get all notes for an application
 */
export declare function getNotesByApplicationId(dbInput: DatabaseInput, applicationId: string, options?: {
    category?: string;
    includeArchived?: boolean;
}): Promise<ApplicationInternalNote[]>;
/**
 * Get notes for a specific applicant
 */
export declare function getNotesByApplicantId(dbInput: DatabaseInput, applicantId: string): Promise<ApplicationInternalNote[]>;
/**
 * Get a single note by ID
 */
export declare function getNoteById(dbInput: DatabaseInput, noteId: string): Promise<ApplicationInternalNote | null>;
/**
 * Create a new internal note
 */
export declare function createNote(dbInput: DatabaseInput, data: Omit<ApplicationInternalNote, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApplicationInternalNote>;
/**
 * Update an existing note
 */
export declare function updateNote(dbInput: DatabaseInput, noteId: string, updates: Partial<Pick<ApplicationInternalNote, 'noteText' | 'noteCategory' | 'taggedApplicants' | 'priority' | 'isSensitive' | 'visibleToRoles'>>): Promise<ApplicationInternalNote>;
/**
 * Delete a note
 */
export declare function deleteNote(dbInput: DatabaseInput, noteId: string): Promise<void>;
/**
 * Get notes by category for an application
 */
export declare function getNotesByCategory(dbInput: DatabaseInput, applicationId: string, category: ApplicationInternalNote['noteCategory']): Promise<ApplicationInternalNote[]>;
/**
 * Get high-priority notes for an application
 */
export declare function getHighPriorityNotes(dbInput: DatabaseInput, applicationId: string): Promise<ApplicationInternalNote[]>;
/**
 * Get note statistics for an application
 */
export declare function getNoteStats(dbInput: DatabaseInput, applicationId: string): Promise<{
    total: number;
    byCategory: Record<string, number>;
    byPriority: Record<string, number>;
    sensitiveCount: number;
}>;
//# sourceMappingURL=application-internal-notes.d.ts.map