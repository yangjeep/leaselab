/**
 * Unit tests for stage-checkers.ts
 * Tests stage-specific checklist generation and warning logic
 */

import { describe, it, expect } from 'vitest';
import { getStageChecklist, getStageWarnings } from './stage-checkers';
import type { ApplicationApplicant, ApplicationDocument } from '~/shared/types';

describe('stage-checkers', () => {
  describe('getStageChecklist', () => {
    describe('new stage', () => {
      it('should return checklist for new application stage', () => {
        const applicants: ApplicationApplicant[] = [
          {
            id: 'app_123',
            applicationId: 'lead_123',
            applicantType: 'primary',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            phone: '555-1234',
            employmentStatus: 'full_time',
            employerName: 'Acme Corp',
            jobTitle: 'Engineer',
            monthlyIncome: 5000,
            dateOfBirth: null,
            ssn: null,
            currentAddress: null,
            employerAddress: null,
            employmentStartDate: null,
            yearsAtCurrentJob: null,
            previousEmployer: null,
            aiScore: null,
            aiLabel: null,
            aiEvaluatedAt: null,
            backgroundCheckStatus: 'pending',
            backgroundCheckProvider: null,
            backgroundCheckOrderId: null,
            backgroundCheckCompletedAt: null,
            inviteStatus: null,
            inviteToken: null,
            inviteTokenExpiresAt: null,
            inviteSentAt: null,
            inviteViewedAt: null,
            inviteCompletedAt: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ];

        const checklist = getStageChecklist('new', { applicants });

        expect(checklist).toHaveLength(3);
        expect(checklist[0].id).toBe('verify_contact_info');
        expect(checklist[0].checked).toBe(true); // Has email and phone
        expect(checklist[1].id).toBe('verify_employment');
        expect(checklist[1].checked).toBe(true); // Has employment info
        expect(checklist[2].id).toBe('review_application');
        expect(checklist[2].checked).toBe(false); // Manual review required
      });

      it('should mark items unchecked when data is missing', () => {
        const applicants: ApplicationApplicant[] = [
          {
            id: 'app_123',
            applicationId: 'lead_123',
            applicantType: 'primary',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            phone: null, // Missing phone
            employmentStatus: null, // Missing employment
            employerName: null,
            jobTitle: null,
            monthlyIncome: null,
            dateOfBirth: null,
            ssn: null,
            currentAddress: null,
            employerAddress: null,
            employmentStartDate: null,
            yearsAtCurrentJob: null,
            previousEmployer: null,
            aiScore: null,
            aiLabel: null,
            aiEvaluatedAt: null,
            backgroundCheckStatus: 'pending',
            backgroundCheckProvider: null,
            backgroundCheckOrderId: null,
            backgroundCheckCompletedAt: null,
            inviteStatus: null,
            inviteToken: null,
            inviteTokenExpiresAt: null,
            inviteSentAt: null,
            inviteViewedAt: null,
            inviteCompletedAt: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ];

        const checklist = getStageChecklist('new', { applicants });

        expect(checklist[0].checked).toBe(false); // Missing phone
        expect(checklist[1].checked).toBe(false); // Missing employment
      });
    });

    describe('documents_pending stage', () => {
      it('should check for all required documents', () => {
        const documents: ApplicationDocument[] = [
          {
            id: 'doc_1',
            applicationId: 'lead_123',
            applicantId: 'app_123',
            documentType: 'government_id',
            fileName: 'id.pdf',
            fileSize: 1024,
            mimeType: 'application/pdf',
            r2Key: 'key1',
            verificationStatus: 'pending',
            uploadedAt: new Date().toISOString(),
            uploadedByApplicantId: 'app_123',
            verifiedAt: null,
            verifiedBy: null,
            rejectedAt: null,
            rejectedBy: null,
            rejectionReason: null,
            expiresAt: null,
            notes: null,
          },
          {
            id: 'doc_2',
            applicationId: 'lead_123',
            applicantId: 'app_123',
            documentType: 'paystub',
            fileName: 'paystub.pdf',
            fileSize: 2048,
            mimeType: 'application/pdf',
            r2Key: 'key2',
            verificationStatus: 'pending',
            uploadedAt: new Date().toISOString(),
            uploadedByApplicantId: 'app_123',
            verifiedAt: null,
            verifiedBy: null,
            rejectedAt: null,
            rejectedBy: null,
            rejectionReason: null,
            expiresAt: null,
            notes: null,
          },
          {
            id: 'doc_3',
            applicationId: 'lead_123',
            applicantId: 'app_123',
            documentType: 'bank_statement',
            fileName: 'bank.pdf',
            fileSize: 3072,
            mimeType: 'application/pdf',
            r2Key: 'key3',
            verificationStatus: 'pending',
            uploadedAt: new Date().toISOString(),
            uploadedByApplicantId: 'app_123',
            verifiedAt: null,
            verifiedBy: null,
            rejectedAt: null,
            rejectedBy: null,
            rejectionReason: null,
            expiresAt: null,
            notes: null,
          },
        ];

        const applicants: ApplicationApplicant[] = [
          {
            id: 'app_123',
            applicationId: 'lead_123',
            applicantType: 'primary',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            phone: '555-1234',
            employmentStatus: 'full_time',
            employerName: 'Acme Corp',
            jobTitle: null,
            monthlyIncome: null,
            dateOfBirth: null,
            ssn: null,
            currentAddress: null,
            employerAddress: null,
            employmentStartDate: null,
            yearsAtCurrentJob: null,
            previousEmployer: null,
            aiScore: null,
            aiLabel: null,
            aiEvaluatedAt: null,
            backgroundCheckStatus: 'pending',
            backgroundCheckProvider: null,
            backgroundCheckOrderId: null,
            backgroundCheckCompletedAt: null,
            inviteStatus: 'completed',
            inviteToken: null,
            inviteTokenExpiresAt: null,
            inviteSentAt: null,
            inviteViewedAt: null,
            inviteCompletedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ];

        const checklist = getStageChecklist('documents_pending', { documents, applicants });

        const allDocsItem = checklist.find((item) => item.id === 'all_documents_uploaded');
        expect(allDocsItem?.checked).toBe(true); // Has all 3 required docs
      });

      it('should mark unchecked when documents are missing', () => {
        const documents: ApplicationDocument[] = [
          {
            id: 'doc_1',
            applicationId: 'lead_123',
            applicantId: 'app_123',
            documentType: 'government_id',
            fileName: 'id.pdf',
            fileSize: 1024,
            mimeType: 'application/pdf',
            r2Key: 'key1',
            verificationStatus: 'pending',
            uploadedAt: new Date().toISOString(),
            uploadedByApplicantId: 'app_123',
            verifiedAt: null,
            verifiedBy: null,
            rejectedAt: null,
            rejectedBy: null,
            rejectionReason: null,
            expiresAt: null,
            notes: null,
          },
          // Missing paystub and bank_statement
        ];

        const checklist = getStageChecklist('documents_pending', { documents });

        const allDocsItem = checklist.find((item) => item.id === 'all_documents_uploaded');
        expect(allDocsItem?.checked).toBe(false); // Missing required docs
      });
    });

    describe('documents_received stage', () => {
      it('should verify all documents are verified', () => {
        const documents: ApplicationDocument[] = [
          {
            id: 'doc_1',
            applicationId: 'lead_123',
            applicantId: 'app_123',
            documentType: 'government_id',
            fileName: 'id.pdf',
            fileSize: 1024,
            mimeType: 'application/pdf',
            r2Key: 'key1',
            verificationStatus: 'verified',
            uploadedAt: new Date().toISOString(),
            uploadedByApplicantId: 'app_123',
            verifiedAt: new Date().toISOString(),
            verifiedBy: 'user_admin',
            rejectedAt: null,
            rejectedBy: null,
            rejectionReason: null,
            expiresAt: null,
            notes: null,
          },
        ];

        const checklist = getStageChecklist('documents_received', { documents });

        const verifyIdItem = checklist.find((item) => item.id === 'verify_government_id');
        expect(verifyIdItem?.checked).toBe(true);
      });

      it('should detect rejected documents', () => {
        const documents: ApplicationDocument[] = [
          {
            id: 'doc_1',
            applicationId: 'lead_123',
            applicantId: 'app_123',
            documentType: 'government_id',
            fileName: 'id.pdf',
            fileSize: 1024,
            mimeType: 'application/pdf',
            r2Key: 'key1',
            verificationStatus: 'rejected',
            uploadedAt: new Date().toISOString(),
            uploadedByApplicantId: 'app_123',
            verifiedAt: null,
            verifiedBy: null,
            rejectedAt: new Date().toISOString(),
            rejectedBy: 'user_admin',
            rejectionReason: 'Expired',
            expiresAt: null,
            notes: null,
          },
        ];

        const checklist = getStageChecklist('documents_received', { documents });

        const noRejectedItem = checklist.find((item) => item.id === 'no_rejected_docs');
        expect(noRejectedItem?.checked).toBe(false);
      });
    });

    describe('ai_evaluated stage', () => {
      it('should check AI score meets threshold', () => {
        const checklist = getStageChecklist('ai_evaluated', { aiScore: 75 });

        const scoreItem = checklist.find((item) => item.id === 'ai_score_acceptable');
        expect(scoreItem?.checked).toBe(true); // Score >= 50
      });

      it('should fail when AI score is below threshold', () => {
        const checklist = getStageChecklist('ai_evaluated', { aiScore: 30 });

        const scoreItem = checklist.find((item) => item.id === 'ai_score_acceptable');
        expect(scoreItem?.checked).toBe(false); // Score < 50
      });

      it('should check if AI evaluation is complete', () => {
        const checklist1 = getStageChecklist('ai_evaluated', { aiScore: 75 });
        const evaluatedItem1 = checklist1.find((item) => item.id === 'ai_evaluation_complete');
        expect(evaluatedItem1?.checked).toBe(true);

        const checklist2 = getStageChecklist('ai_evaluated', { aiScore: null });
        const evaluatedItem2 = checklist2.find((item) => item.id === 'ai_evaluation_complete');
        expect(evaluatedItem2?.checked).toBe(false);
      });
    });

    describe('screening stage', () => {
      it('should check if all background checks are complete', () => {
        const applicants: ApplicationApplicant[] = [
          {
            id: 'app_1',
            applicationId: 'lead_123',
            applicantType: 'primary',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            phone: '555-1234',
            employmentStatus: 'full_time',
            employerName: null,
            jobTitle: null,
            monthlyIncome: null,
            dateOfBirth: null,
            ssn: null,
            currentAddress: null,
            employerAddress: null,
            employmentStartDate: null,
            yearsAtCurrentJob: null,
            previousEmployer: null,
            aiScore: null,
            aiLabel: null,
            aiEvaluatedAt: null,
            backgroundCheckStatus: 'clear',
            backgroundCheckProvider: null,
            backgroundCheckOrderId: null,
            backgroundCheckCompletedAt: new Date().toISOString(),
            inviteStatus: null,
            inviteToken: null,
            inviteTokenExpiresAt: null,
            inviteSentAt: null,
            inviteViewedAt: null,
            inviteCompletedAt: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ];

        const checklist = getStageChecklist('screening', { applicants });

        const checksCompleteItem = checklist.find((item) => item.id === 'background_check_received');
        expect(checksCompleteItem?.checked).toBe(true);
      });
    });
  });

  describe('getStageWarnings', () => {
    it('should warn about low AI score', () => {
      const warnings = getStageWarnings('documents_received', 'ai_evaluated', { aiScore: 40 });

      expect(warnings).toContain('AI score is below recommended threshold (50). Consider reviewing manually.');
    });

    it('should not warn about acceptable AI score', () => {
      const warnings = getStageWarnings('documents_received', 'ai_evaluated', { aiScore: 75 });

      expect(warnings.length).toBe(0);
    });

    it('should warn about failed background checks', () => {
      const applicants: ApplicationApplicant[] = [
        {
          id: 'app_1',
          applicationId: 'lead_123',
          applicantType: 'primary',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '555-1234',
          employmentStatus: 'full_time',
          employerName: null,
          jobTitle: null,
          monthlyIncome: null,
          dateOfBirth: null,
          ssn: null,
          currentAddress: null,
          employerAddress: null,
          employmentStartDate: null,
          yearsAtCurrentJob: null,
          previousEmployer: null,
          aiScore: null,
          aiLabel: null,
          aiEvaluatedAt: null,
          backgroundCheckStatus: 'failed',
          backgroundCheckProvider: null,
          backgroundCheckOrderId: null,
          backgroundCheckCompletedAt: new Date().toISOString(),
          inviteStatus: null,
          inviteToken: null,
          inviteTokenExpiresAt: null,
          inviteSentAt: null,
          inviteViewedAt: null,
          inviteCompletedAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const warnings = getStageWarnings('screening', 'approved', { applicants });

      expect(warnings).toContain('One or more applicants have failed background checks.');
    });

    it('should warn about skipping stages', () => {
      const warnings = getStageWarnings('new', 'ai_evaluated', {});

      expect(warnings).toContain('You are skipping 2 stage(s). This may affect compliance.');
    });

    it('should warn about review required for background checks', () => {
      const applicants: ApplicationApplicant[] = [
        {
          id: 'app_1',
          applicationId: 'lead_123',
          applicantType: 'primary',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '555-1234',
          employmentStatus: 'full_time',
          employerName: null,
          jobTitle: null,
          monthlyIncome: null,
          dateOfBirth: null,
          ssn: null,
          currentAddress: null,
          employerAddress: null,
          employmentStartDate: null,
          yearsAtCurrentJob: null,
          previousEmployer: null,
          aiScore: null,
          aiLabel: null,
          aiEvaluatedAt: null,
          backgroundCheckStatus: 'review_required',
          backgroundCheckProvider: null,
          backgroundCheckOrderId: null,
          backgroundCheckCompletedAt: null,
          inviteStatus: null,
          inviteToken: null,
          inviteTokenExpiresAt: null,
          inviteSentAt: null,
          inviteViewedAt: null,
          inviteCompletedAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const warnings = getStageWarnings('screening', 'approved', { applicants });

      expect(warnings).toContain('Background check requires manual review before approval.');
    });
  });
});
