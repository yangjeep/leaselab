/**
 * Integration tests for application-applicants.ts
 * Tests database operations for applicant management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getApplicantsByApplicationId,
  createApplicant,
  updateApplicant,
  deleteApplicant,
  getApplicantByInviteToken,
} from './application-applicants';
import type { ApplicationApplicant } from '~/shared/types';

// Mock D1 types
interface MockD1Result<T> {
  results: T[];
  success: boolean;
  meta: {
    changes: number;
    last_row_id: number;
    duration: number;
  };
}

interface MockD1Statement {
  bind: (...args: unknown[]) => MockD1Statement;
  all: <T>() => Promise<MockD1Result<T>>;
  first: <T>() => Promise<T | null>;
  run: () => Promise<MockD1Result<unknown>>;
}

interface MockD1Database {
  prepare: (sql: string) => MockD1Statement;
  batch: <T>(statements: MockD1Statement[]) => Promise<MockD1Result<T>[]>;
}

describe('application-applicants database helpers', () => {
  let mockD1: MockD1Database;
  let mockStatement: MockD1Statement;

  beforeEach(() => {
    mockStatement = {
      bind: vi.fn().mockReturnThis(),
      all: vi.fn().mockResolvedValue({
        results: [],
        success: true,
        meta: { changes: 0, last_row_id: 0, duration: 1 },
      }),
      first: vi.fn().mockResolvedValue(null),
      run: vi.fn().mockResolvedValue({
        results: [],
        success: true,
        meta: { changes: 1, last_row_id: 1, duration: 1 },
      }),
    };

    mockD1 = {
      prepare: vi.fn().mockReturnValue(mockStatement),
      batch: vi.fn().mockResolvedValue([]),
    };
  });

  describe('getApplicantsByApplicationId', () => {
    it('should fetch all applicants for an application', async () => {
      const mockApplicants = [
        {
          id: 'app_primary',
          application_id: 'lead_123',
          applicant_type: 'primary',
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          phone: '555-1234',
          employment_status: 'full_time',
          employer_name: 'Acme Corp',
          job_title: 'Engineer',
          monthly_income: 5000,
          date_of_birth: null,
          ssn: null,
          current_address: null,
          employer_address: null,
          employment_start_date: null,
          years_at_current_job: null,
          previous_employer: null,
          ai_score: 85,
          ai_label: 'A',
          ai_evaluated_at: '2025-01-01T00:00:00Z',
          background_check_status: 'pending',
          background_check_provider: null,
          background_check_order_id: null,
          background_check_completed_at: null,
          invite_status: null,
          invite_token: null,
          invite_token_expires_at: null,
          invite_sent_at: null,
          invite_viewed_at: null,
          invite_completed_at: null,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        },
      ];

      mockStatement.all = vi.fn().mockResolvedValue({
        results: mockApplicants,
        success: true,
        meta: { changes: 0, last_row_id: 0, duration: 1 },
      });

      const result = await getApplicantsByApplicationId(mockD1 as any, 'lead_123');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('app_primary');
      expect(result[0].applicantType).toBe('primary');
      expect(result[0].firstName).toBe('John');
      expect(result[0].aiScore).toBe(85);
      expect(mockD1.prepare).toHaveBeenCalledWith(expect.stringContaining('SELECT * FROM application_applicants'));
    });

    it('should return empty array when no applicants found', async () => {
      mockStatement.all = vi.fn().mockResolvedValue({
        results: [],
        success: true,
        meta: { changes: 0, last_row_id: 0, duration: 1 },
      });

      const result = await getApplicantsByApplicationId(mockD1 as any, 'lead_999');

      expect(result).toHaveLength(0);
    });
  });

  describe('createApplicant', () => {
    it('should create a new applicant', async () => {
      const newApplicant: Omit<ApplicationApplicant, 'id' | 'createdAt' | 'updatedAt'> = {
        applicationId: 'lead_123',
        applicantType: 'co_applicant',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        phone: '555-5678',
        dateOfBirth: null,
        employmentStatus: 'employed',
        employerName: 'Tech Co',
        jobTitle: 'Developer',
        monthlyIncome: 6000,
        aiScore: null,
        aiLabel: null,
        aiRiskFlags: null,
        aiEvaluatedAt: null,
        backgroundCheckStatus: 'pending',
        backgroundCheckProvider: null,
        backgroundCheckReferenceId: null,
        backgroundCheckCompletedAt: null,
        inviteToken: 'token_abc123',
        inviteSentAt: null,
        inviteAcceptedAt: null,
        createdBy: null,
      };

      // Mock the queryOne call that happens after insert
      mockStatement.first = vi.fn().mockResolvedValue({
        id: 'app_new',
        application_id: 'lead_123',
        applicant_type: 'co_applicant',
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane@example.com',
        phone: '555-5678',
        date_of_birth: null,
        ssn: null,
        current_address: null,
        employment_status: 'full_time',
        employer_name: 'Tech Co',
        employer_address: null,
        job_title: 'Developer',
        employment_start_date: null,
        years_at_current_job: null,
        monthly_income: 6000,
        previous_employer: null,
        ai_score: null,
        ai_label: null,
        ai_evaluated_at: null,
        background_check_status: 'pending',
        background_check_provider: null,
        background_check_order_id: null,
        background_check_completed_at: null,
        invite_status: 'pending',
        invite_token: 'token_abc123',
        invite_token_expires_at: '2025-02-01T00:00:00Z',
        invite_sent_at: null,
        invite_viewed_at: null,
        invite_completed_at: null,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      });

      const result = await createApplicant(mockD1 as any, newApplicant);

      expect(result.id).toBe('app_new');
      expect(result.applicantType).toBe('co_applicant');
      expect(result.firstName).toBe('Jane');
      expect(result.inviteToken).toBe('token_abc123');
      expect(mockD1.prepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO application_applicants'));
    });
  });

  describe('updateApplicant', () => {
    it('should update applicant fields', async () => {
      const updates = {
        aiScore: 90,
        aiLabel: 'A' as const,
        aiEvaluatedAt: '2025-01-02T00:00:00Z',
      };

      mockStatement.first = vi.fn().mockResolvedValue({
        id: 'app_123',
        application_id: 'lead_123',
        applicant_type: 'primary',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        phone: '555-1234',
        date_of_birth: null,
        ssn: null,
        current_address: null,
        employment_status: 'full_time',
        employer_name: 'Acme Corp',
        employer_address: null,
        job_title: 'Engineer',
        employment_start_date: null,
        years_at_current_job: null,
        monthly_income: 5000,
        previous_employer: null,
        ai_score: 90,
        ai_label: 'A',
        ai_evaluated_at: '2025-01-02T00:00:00Z',
        background_check_status: 'pending',
        background_check_provider: null,
        background_check_order_id: null,
        background_check_completed_at: null,
        invite_status: null,
        invite_token: null,
        invite_token_expires_at: null,
        invite_sent_at: null,
        invite_viewed_at: null,
        invite_completed_at: null,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-02T00:00:00Z',
      });

      const result = await updateApplicant(mockD1 as any, 'app_123', updates);

      expect(result.aiScore).toBe(90);
      expect(result.aiLabel).toBe('A');
      expect(mockD1.prepare).toHaveBeenCalledWith(expect.stringContaining('UPDATE application_applicants'));
    });
  });

  describe('deleteApplicant', () => {
    it('should delete an applicant', async () => {
      await deleteApplicant(mockD1 as any, 'app_123');

      expect(mockD1.prepare).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM application_applicants'));
      expect(mockStatement.bind).toHaveBeenCalledWith('app_123');
    });
  });

  describe('getApplicantByInviteToken', () => {
    it('should find applicant by invite token', async () => {
      const mockApplicant = {
        id: 'app_123',
        application_id: 'lead_123',
        applicant_type: 'co_applicant',
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane@example.com',
        phone: '555-5678',
        date_of_birth: null,
        ssn: null,
        current_address: null,
        employment_status: 'full_time',
        employer_name: 'Tech Co',
        employer_address: null,
        job_title: 'Developer',
        employment_start_date: null,
        years_at_current_job: null,
        monthly_income: 6000,
        previous_employer: null,
        ai_score: null,
        ai_label: null,
        ai_evaluated_at: null,
        background_check_status: 'pending',
        background_check_provider: null,
        background_check_order_id: null,
        background_check_completed_at: null,
        invite_status: 'sent',
        invite_token: 'token_xyz789',
        invite_token_expires_at: '2025-02-01T00:00:00Z',
        invite_sent_at: '2025-01-01T00:00:00Z',
        invite_viewed_at: null,
        invite_completed_at: null,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      mockStatement.first = vi.fn().mockResolvedValue(mockApplicant);

      const result = await getApplicantByInviteToken(mockD1 as any, 'token_xyz789');

      expect(result).not.toBeNull();
      expect(result?.inviteToken).toBe('token_xyz789');
      expect(result?.applicantType).toBe('co_applicant');
      expect(mockD1.prepare).toHaveBeenCalledWith(expect.stringContaining('WHERE invite_token = ?'));
    });

    it('should return null when token not found', async () => {
      mockStatement.first = vi.fn().mockResolvedValue(null);

      const result = await getApplicantByInviteToken(mockD1 as any, 'invalid_token');

      expect(result).toBeNull();
    });
  });
});
