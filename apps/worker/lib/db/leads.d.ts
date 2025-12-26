import type { Lead, LeadFile, LeadAIResult, LeadHistory } from '~/shared/types';
import type { DatabaseInput } from './helpers';
export declare function getLeads(dbInput: DatabaseInput, siteId: string, options?: {
    status?: string;
    propertyId?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
    includeArchived?: boolean;
}): Promise<(Lead & {
    isUnitOccupied?: boolean;
    propertyName?: string;
})[]>;
/**
 * Get leads grouped by unit
 * Returns applications organized by unit for better UX in property management
 */
export declare function getLeadsGroupedByUnit(dbInput: DatabaseInput, siteId: string, options?: {
    status?: string;
    propertyId?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    includeArchived?: boolean;
}): Promise<{
    unit: {
        id: any;
        propertyId: any;
        unitNumber: any;
        bedrooms: any;
        bathrooms: any;
        squareFeet: any;
        monthlyRent: any;
        status: any;
    } | null;
    applications: (Lead & {
        isUnitOccupied?: boolean;
        propertyName?: string;
    })[];
    count: number;
}[]>;
export declare function getLeadById(dbInput: DatabaseInput, siteId: string, id: string): Promise<Lead | null>;
export declare function createLead(dbInput: DatabaseInput, siteId: string, data: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'aiScore' | 'aiLabel' | 'status'>): Promise<Lead>;
export declare function updateLead(dbInput: DatabaseInput, siteId: string, id: string, data: Partial<Lead>): Promise<void>;
/**
 * Archive a lead (soft delete)
 */
export declare function archiveLead(dbInput: DatabaseInput, siteId: string, id: string): Promise<void>;
/**
 * Restore an archived lead
 */
export declare function restoreLead(dbInput: DatabaseInput, siteId: string, id: string): Promise<void>;
export declare function getLeadFiles(dbInput: DatabaseInput, siteId: string, leadId: string): Promise<LeadFile[]>;
export declare function createLeadFile(dbInput: DatabaseInput, siteId: string, data: Omit<LeadFile, 'id' | 'uploadedAt'>): Promise<LeadFile>;
/**
 * Create a temporary lead file (before lead is associated)
 * Used during the upload workflow where files are uploaded before lead submission
 * Files are staged in staged_files table until associated with a lead
 */
export declare function createTempLeadFile(dbInput: DatabaseInput, siteId: string, data: {
    fileType: LeadFile['fileType'];
    fileName: string;
    fileSize: number;
    mimeType: string;
    r2Key: string;
}): Promise<{
    id: string;
    uploadedAt: string;
}>;
/**
 * Associate temporary files with a lead
 * Moves files from staged_files to lead_files and returns the count of files associated
 */
export declare function associateFilesWithLead(dbInput: DatabaseInput, siteId: string, leadId: string, fileIds: string[]): Promise<number>;
/**
 * Count files for a lead (or count staged files if leadId is null)
 */
export declare function countLeadFiles(dbInput: DatabaseInput, siteId: string, leadId?: string | null): Promise<number>;
export declare function getAIEvaluation(dbInput: DatabaseInput, siteId: string, leadId: string): Promise<LeadAIResult | null>;
export declare function createAIEvaluation(dbInput: DatabaseInput, siteId: string, data: Omit<LeadAIResult, 'id' | 'evaluatedAt'>): Promise<LeadAIResult>;
export declare function getLeadHistory(dbInput: DatabaseInput, siteId: string, leadId: string): Promise<LeadHistory[]>;
export declare function recordLeadHistory(dbInput: DatabaseInput, siteId: string, leadId: string, eventType: string, eventData: Record<string, unknown>): Promise<void>;
/**
 * Get General Inquiries count (leads with property_id = 'general')
 */
export declare function getGeneralInquiriesCount(dbInput: DatabaseInput, siteId: string, options?: {
    status?: string;
    includeArchived?: boolean;
}): Promise<{
    totalCount: number;
    pendingCount: number;
    resolvedCount: number;
}>;
//# sourceMappingURL=leads.d.ts.map