import type { ApplicationStageTransition } from '~/shared/types';
import type { DatabaseInput } from './helpers';
/**
 * Get all stage transitions for an application
 */
export declare function getTransitionsByApplicationId(dbInput: DatabaseInput, applicationId: string): Promise<ApplicationStageTransition[]>;
/**
 * Get a single transition by ID
 */
export declare function getTransitionById(dbInput: DatabaseInput, transitionId: string): Promise<ApplicationStageTransition | null>;
/**
 * Get the most recent transition for an application
 */
export declare function getLatestTransition(dbInput: DatabaseInput, applicationId: string): Promise<ApplicationStageTransition | null>;
/**
 * Create a new stage transition record
 */
export declare function createTransition(dbInput: DatabaseInput, data: Omit<ApplicationStageTransition, 'id' | 'transitionedAt'>): Promise<ApplicationStageTransition>;
/**
 * Get transitions by stage range
 */
export declare function getTransitionsByStageRange(dbInput: DatabaseInput, applicationId: string, fromStage: string, toStage: string): Promise<ApplicationStageTransition[]>;
/**
 * Get transitions that required bypass
 */
export declare function getBypassTransitions(dbInput: DatabaseInput, applicationId: string): Promise<ApplicationStageTransition[]>;
/**
 * Get transition statistics for an application
 */
export declare function getTransitionStats(dbInput: DatabaseInput, applicationId: string): Promise<{
    totalTransitions: number;
    manualTransitions: number;
    automaticTransitions: number;
    bypassedTransitions: number;
    averageTimeInStage?: Record<string, number>;
}>;
//# sourceMappingURL=application-stage-transitions.d.ts.map