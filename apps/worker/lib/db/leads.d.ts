import type { Lead, LeadFile, LeadAIResult, LeadHistory } from '~/shared/types';
import type { DatabaseInput } from './helpers';
export declare function getLeads(dbInput: DatabaseInput, siteId: string, options?: {
    status?: string;
    propertyId?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
}): Promise<(Lead & {
    isUnitOccupied?: boolean;
    propertyName?: string;
})[]>;
export declare function getLeadById(dbInput: DatabaseInput, siteId: string, id: string): Promise<Lead | null>;
export declare function createLead(dbInput: DatabaseInput, siteId: string, data: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'aiScore' | 'aiLabel' | 'status'>): Promise<Lead>;
export declare function updateLead(dbInput: DatabaseInput, siteId: string, id: string, data: Partial<Lead>): Promise<void>;
export declare function getLeadFiles(dbInput: DatabaseInput, siteId: string, leadId: string): Promise<LeadFile[]>;
export declare function createLeadFile(dbInput: DatabaseInput, siteId: string, data: Omit<LeadFile, 'id' | 'uploadedAt'>): Promise<LeadFile>;
/**
 * Create a temporary lead file (before lead is associated)
 * Used during the upload workflow where files are uploaded before lead submission
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
 * Updates lead_id for temp files and returns the count of files associated
 */
export declare function associateFilesWithLead(dbInput: DatabaseInput, siteId: string, leadId: string, fileIds: string[]): Promise<number>;
/**
 * Count files for a lead (or count temp files if leadId is null)
 */
export declare function countLeadFiles(dbInput: DatabaseInput, siteId: string, leadId?: string | null): Promise<number>;
export declare function getAIEvaluation(dbInput: DatabaseInput, siteId: string, leadId: string): Promise<LeadAIResult | null>;
export declare function createAIEvaluation(dbInput: DatabaseInput, siteId: string, data: Omit<LeadAIResult, 'id' | 'evaluatedAt'>): Promise<LeadAIResult>;
export declare function getLeadHistory(dbInput: DatabaseInput, siteId: string, leadId: string): Promise<LeadHistory[]>;
export declare function recordLeadHistory(dbInput: DatabaseInput, siteId: string, leadId: string, eventType: string, eventData: Record<string, unknown>): Promise<void>;
//# sourceMappingURL=leads.d.ts.map