/**
 * Unit tests for lease onboarding database helpers
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createLeaseChecklist,
  getLeaseChecklist,
  updateChecklistStep,
  completeLeaseOnboarding,
  DEFAULT_CHECKLIST_STEPS,
  calculateProgress,
} from './lease-onboarding';

// Mock D1 database for testing
const createMockDb = () => {
  const data: Record<string, any> = {};

  return {
    prepare: (sql: string) => ({
      bind: (...params: any[]) => ({
        run: async () => {
          // Store data based on SQL command
          if (sql.includes('INSERT INTO lease_onboarding_checklists')) {
            const [id, leaseId, steps, totalSteps, completedSteps] = params;
            data[`checklist_${leaseId}`] = {
              id,
              lease_id: leaseId,
              steps,
              total_steps: totalSteps,
              completed_steps: completedSteps,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
          } else if (sql.includes('UPDATE lease_onboarding_checklists')) {
            const [steps, completedSteps, leaseId] = params;
            if (data[`checklist_${leaseId}`]) {
              data[`checklist_${leaseId}`].steps = steps;
              data[`checklist_${leaseId}`].completed_steps = completedSteps;
              data[`checklist_${leaseId}`].updated_at = new Date().toISOString();
            }
          } else if (sql.includes('UPDATE leases')) {
            const [status, leaseId] = params;
            data[`lease_${leaseId}`] = { onboarding_status: status };
          }
          return { success: true };
        },
        first: async () => {
          // Return data based on SQL query
          if (sql.includes('SELECT') && sql.includes('lease_onboarding_checklists')) {
            const leaseId = params[0];
            return data[`checklist_${leaseId}`] || null;
          }
          return null;
        },
      }),
    }),
  } as any;
};

describe('Lease Onboarding Helpers', () => {
  let db: any;

  beforeEach(() => {
    db = createMockDb();
  });

  describe('createLeaseChecklist', () => {
    it('should create a checklist with default steps', async () => {
      const leaseId = 'lease-123';
      const checklistId = await createLeaseChecklist(db, leaseId);

      expect(checklistId).toBeDefined();
      expect(typeof checklistId).toBe('string');

      const checklist = await getLeaseChecklist(db, leaseId);
      expect(checklist).toBeDefined();
      expect(checklist?.lease_id).toBe(leaseId);
      expect(checklist?.total_steps).toBe(7);
      expect(checklist?.completed_steps).toBe(1); // First step auto-completed
    });

    it('should create a checklist with custom steps', async () => {
      const leaseId = 'lease-456';
      const customSteps = [
        {
          id: 'step1',
          label: 'Custom Step 1',
          required: true,
          completed: true,
        },
        {
          id: 'step2',
          label: 'Custom Step 2',
          required: false,
          completed: false,
        },
      ];

      await createLeaseChecklist(db, leaseId, customSteps);
      const checklist = await getLeaseChecklist(db, leaseId);

      expect(checklist?.total_steps).toBe(2);
      expect(checklist?.completed_steps).toBe(1);
      expect(checklist?.steps).toHaveLength(2);
    });
  });

  describe('getLeaseChecklist', () => {
    it('should return null for non-existent lease', async () => {
      const checklist = await getLeaseChecklist(db, 'non-existent');
      expect(checklist).toBeNull();
    });

    it('should return checklist for existing lease', async () => {
      const leaseId = 'lease-789';
      await createLeaseChecklist(db, leaseId);

      const checklist = await getLeaseChecklist(db, leaseId);
      expect(checklist).toBeDefined();
      expect(checklist?.lease_id).toBe(leaseId);
    });
  });

  describe('updateChecklistStep', () => {
    it('should update a checklist step to completed', async () => {
      const leaseId = 'lease-update-1';
      await createLeaseChecklist(db, leaseId);

      const updated = await updateChecklistStep(
        db,
        leaseId,
        'lease_terms_defined',
        true,
        'Terms agreed upon'
      );

      expect(updated.completed_steps).toBe(2); // First step + this step
      const step = updated.steps.find((s) => s.id === 'lease_terms_defined');
      expect(step?.completed).toBe(true);
      expect(step?.notes).toBe('Terms agreed upon');
      expect(step?.completed_at).toBeDefined();
    });

    it('should update a checklist step to uncompleted', async () => {
      const leaseId = 'lease-update-2';
      await createLeaseChecklist(db, leaseId);

      // First complete it
      await updateChecklistStep(db, leaseId, 'lease_terms_defined', true);
      // Then uncomplete it
      const updated = await updateChecklistStep(
        db,
        leaseId,
        'lease_terms_defined',
        false
      );

      expect(updated.completed_steps).toBe(1); // Back to just first step
      const step = updated.steps.find((s) => s.id === 'lease_terms_defined');
      expect(step?.completed).toBe(false);
      expect(step?.completed_at).toBeUndefined();
    });

    it('should throw error for non-existent lease', async () => {
      await expect(
        updateChecklistStep(db, 'non-existent', 'any-step', true)
      ).rejects.toThrow('Checklist not found');
    });
  });

  describe('completeLeaseOnboarding', () => {
    it('should throw error if required steps are incomplete', async () => {
      const leaseId = 'lease-incomplete';
      await createLeaseChecklist(db, leaseId);

      await expect(
        completeLeaseOnboarding(db, leaseId, true)
      ).rejects.toThrow('Cannot complete onboarding');
    });

    it('should complete onboarding when all required steps are done', async () => {
      const leaseId = 'lease-complete';
      await createLeaseChecklist(db, leaseId);

      // Complete all required steps
      const requiredSteps = DEFAULT_CHECKLIST_STEPS.filter(
        (s) => s.required && !s.completed
      );
      for (const step of requiredSteps) {
        await updateChecklistStep(db, leaseId, step.id, true);
      }

      await expect(
        completeLeaseOnboarding(db, leaseId, true)
      ).resolves.not.toThrow();
    });
  });

  describe('calculateProgress', () => {
    it('should calculate progress percentage correctly', () => {
      const checklist = {
        id: 'test',
        lease_id: 'test',
        steps: [],
        total_steps: 10,
        completed_steps: 7,
        created_at: '',
        updated_at: '',
      };

      const progress = calculateProgress(checklist);
      expect(progress).toBe(70);
    });

    it('should return 0 for zero total steps', () => {
      const checklist = {
        id: 'test',
        lease_id: 'test',
        steps: [],
        total_steps: 0,
        completed_steps: 0,
        created_at: '',
        updated_at: '',
      };

      const progress = calculateProgress(checklist);
      expect(progress).toBe(0);
    });

    it('should round percentage correctly', () => {
      const checklist = {
        id: 'test',
        lease_id: 'test',
        steps: [],
        total_steps: 3,
        completed_steps: 1,
        created_at: '',
        updated_at: '',
      };

      const progress = calculateProgress(checklist);
      expect(progress).toBe(33); // 33.33... rounded to 33
    });
  });

  describe('DEFAULT_CHECKLIST_STEPS', () => {
    it('should have 7 steps', () => {
      expect(DEFAULT_CHECKLIST_STEPS).toHaveLength(7);
    });

    it('should have first step auto-completed', () => {
      const firstStep = DEFAULT_CHECKLIST_STEPS[0];
      expect(firstStep.id).toBe('application_approved');
      expect(firstStep.completed).toBe(true);
      expect(firstStep.auto_complete).toBe(true);
    });

    it('should have all required steps', () => {
      const allRequired = DEFAULT_CHECKLIST_STEPS.every((s) => s.required);
      expect(allRequired).toBe(true);
    });
  });
});
