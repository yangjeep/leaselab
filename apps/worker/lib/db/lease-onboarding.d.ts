/**
 * Lease Onboarding Database Helpers
 *
 * Manages lease onboarding checklists for new leases being onboarded.
 * Provides functions to create, read, update, and complete lease onboarding.
 */
/**
 * Standard checklist step structure
 */
export interface ChecklistStep {
    id: string;
    label: string;
    required: boolean;
    completed: boolean;
    auto_complete?: boolean;
    completed_at?: string;
    notes?: string;
}
/**
 * Checklist database record
 */
export interface LeaseChecklist {
    id: string;
    lease_id: string;
    steps: ChecklistStep[];
    total_steps: number;
    completed_steps: number;
    created_at: string;
    updated_at: string;
}
/**
 * Default 7-step checklist for lease onboarding
 */
export declare const DEFAULT_CHECKLIST_STEPS: ChecklistStep[];
/**
 * Create a new lease onboarding checklist
 */
export declare function createLeaseChecklist(db: D1Database, leaseId: string, customSteps?: ChecklistStep[]): Promise<string>;
/**
 * Get lease checklist by lease ID
 */
export declare function getLeaseChecklist(db: D1Database, leaseId: string): Promise<LeaseChecklist | null>;
/**
 * Get lease checklist by checklist ID
 */
export declare function getLeaseChecklistById(db: D1Database, checklistId: string): Promise<LeaseChecklist | null>;
/**
 * Update a single checklist step
 */
export declare function updateChecklistStep(db: D1Database, leaseId: string, stepId: string, completed: boolean, notes?: string): Promise<LeaseChecklist>;
/**
 * Complete lease onboarding (all required steps done)
 * - Sets onboarding_status to 'completed' or null
 * - Optionally updates lease status to 'active'
 */
export declare function completeLeaseOnboarding(db: D1Database, leaseId: string, setActiveStatus?: boolean): Promise<void>;
/**
 * Get all leases in progress with their checklists
 */
export declare function getLeasesInProgress(db: D1Database, siteId: string): Promise<any[]>;
/**
 * Calculate checklist progress percentage
 */
export declare function calculateProgress(checklist: LeaseChecklist): number;
//# sourceMappingURL=lease-onboarding.d.ts.map