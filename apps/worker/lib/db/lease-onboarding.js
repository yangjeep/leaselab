/**
 * Lease Onboarding Database Helpers
 *
 * Manages lease onboarding checklists for new leases being onboarded.
 * Provides functions to create, read, update, and complete lease onboarding.
 */
import { randomUUID } from 'crypto';
/**
 * Default 7-step checklist for lease onboarding
 */
export const DEFAULT_CHECKLIST_STEPS = [
    {
        id: 'application_approved',
        label: 'Application approved',
        required: true,
        completed: true,
        auto_complete: true,
    },
    {
        id: 'lease_terms_defined',
        label: 'Lease terms defined (rent, term, dates)',
        required: true,
        completed: false,
    },
    {
        id: 'lease_document_generated',
        label: 'Lease document generated',
        required: true,
        completed: false,
    },
    {
        id: 'deposit_received',
        label: 'Security deposit received',
        required: true,
        completed: false,
    },
    {
        id: 'signatures_collected',
        label: 'Signatures collected (tenant + guarantor)',
        required: true,
        completed: false,
    },
    {
        id: 'movein_inspection_scheduled',
        label: 'Move-in inspection scheduled',
        required: true,
        completed: false,
    },
    {
        id: 'keys_prepared',
        label: 'Keys/access prepared',
        required: true,
        completed: false,
    },
];
/**
 * Create a new lease onboarding checklist
 */
export async function createLeaseChecklist(db, leaseId, customSteps) {
    const id = randomUUID();
    const steps = customSteps || DEFAULT_CHECKLIST_STEPS;
    const completedSteps = steps.filter(s => s.completed).length;
    await db
        .prepare(`INSERT INTO lease_onboarding_checklists
       (id, lease_id, steps, total_steps, completed_steps, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`)
        .bind(id, leaseId, JSON.stringify(steps), steps.length, completedSteps)
        .run();
    return id;
}
/**
 * Get lease checklist by lease ID
 */
export async function getLeaseChecklist(db, leaseId) {
    const result = await db
        .prepare(`SELECT * FROM lease_onboarding_checklists WHERE lease_id = ?`)
        .bind(leaseId)
        .first();
    if (!result) {
        return null;
    }
    return {
        id: result.id,
        lease_id: result.lease_id,
        steps: JSON.parse(result.steps),
        total_steps: result.total_steps,
        completed_steps: result.completed_steps,
        created_at: result.created_at,
        updated_at: result.updated_at,
    };
}
/**
 * Get lease checklist by checklist ID
 */
export async function getLeaseChecklistById(db, checklistId) {
    const result = await db
        .prepare(`SELECT * FROM lease_onboarding_checklists WHERE id = ?`)
        .bind(checklistId)
        .first();
    if (!result) {
        return null;
    }
    return {
        id: result.id,
        lease_id: result.lease_id,
        steps: JSON.parse(result.steps),
        total_steps: result.total_steps,
        completed_steps: result.completed_steps,
        created_at: result.created_at,
        updated_at: result.updated_at,
    };
}
/**
 * Update a single checklist step
 */
export async function updateChecklistStep(db, leaseId, stepId, completed, notes) {
    const checklist = await getLeaseChecklist(db, leaseId);
    if (!checklist) {
        throw new Error(`Checklist not found for lease ${leaseId}`);
    }
    // Update the specific step
    const updatedSteps = checklist.steps.map(step => {
        if (step.id === stepId) {
            return {
                ...step,
                completed,
                completed_at: completed ? new Date().toISOString() : undefined,
                notes: notes || step.notes,
            };
        }
        return step;
    });
    const completedCount = updatedSteps.filter(s => s.completed).length;
    // Update database
    await db
        .prepare(`UPDATE lease_onboarding_checklists
       SET steps = ?, completed_steps = ?, updated_at = datetime('now')
       WHERE lease_id = ?`)
        .bind(JSON.stringify(updatedSteps), completedCount, leaseId)
        .run();
    return {
        ...checklist,
        steps: updatedSteps,
        completed_steps: completedCount,
        updated_at: new Date().toISOString(),
    };
}
/**
 * Complete lease onboarding (all required steps done)
 * - Sets onboarding_status to 'completed' or null
 * - Optionally updates lease status to 'active'
 */
export async function completeLeaseOnboarding(db, leaseId, setActiveStatus = true) {
    const checklist = await getLeaseChecklist(db, leaseId);
    if (!checklist) {
        throw new Error(`Checklist not found for lease ${leaseId}`);
    }
    // Verify all required steps are completed
    const incompleteRequired = checklist.steps.filter(s => s.required && !s.completed);
    if (incompleteRequired.length > 0) {
        throw new Error(`Cannot complete onboarding: ${incompleteRequired.length} required step(s) incomplete`);
    }
    // Update lease status
    if (setActiveStatus) {
        await db
            .prepare(`UPDATE leases
         SET onboarding_status = NULL, status = 'active'
         WHERE id = ?`)
            .bind(leaseId)
            .run();
    }
    else {
        await db
            .prepare(`UPDATE leases
         SET onboarding_status = 'completed'
         WHERE id = ?`)
            .bind(leaseId)
            .run();
    }
}
/**
 * Get all leases in progress with their checklists
 */
export async function getLeasesInProgress(db, siteId) {
    const result = await db
        .prepare(`SELECT
         l.*,
         loc.id as checklist_id,
         loc.steps as checklist_steps,
         loc.total_steps,
         loc.completed_steps,
         loc.created_at as checklist_created_at,
         loc.updated_at as checklist_updated_at,
         t.id as tenant_id,
         t.first_name as tenant_first_name,
         t.last_name as tenant_last_name,
         t.email as tenant_email,
         u.id as unit_id,
         u.unit_number,
         p.id as property_id,
         p.name as property_name
       FROM leases l
       LEFT JOIN lease_onboarding_checklists loc ON l.id = loc.lease_id
       LEFT JOIN tenants t ON l.tenant_id = t.id
       LEFT JOIN units u ON l.unit_id = u.id
       LEFT JOIN properties p ON u.property_id = p.id
       WHERE l.site_id = ? AND l.onboarding_status = 'in_progress'
       ORDER BY loc.updated_at DESC`)
        .bind(siteId)
        .all();
    return result.results.map((row) => ({
        id: row.id,
        tenant: {
            id: row.tenant_id,
            firstName: row.tenant_first_name,
            lastName: row.tenant_last_name,
            email: row.tenant_email,
        },
        unit: {
            id: row.unit_id,
            unitNumber: row.unit_number,
            propertyName: row.property_name,
        },
        progress: {
            total_steps: row.total_steps,
            completed_steps: row.completed_steps,
            percentage: Math.round((row.completed_steps / row.total_steps) * 100),
        },
        checklist: JSON.parse(row.checklist_steps),
        startDate: row.start_date,
        endDate: row.end_date,
        monthlyRent: row.monthly_rent,
        securityDeposit: row.security_deposit,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.checklist_updated_at,
    }));
}
/**
 * Calculate checklist progress percentage
 */
export function calculateProgress(checklist) {
    if (checklist.total_steps === 0)
        return 0;
    return Math.round((checklist.completed_steps / checklist.total_steps) * 100);
}
