/**
 * Stage-specific checklist configurations
 * Defines required items for each stage transition
 */

import type { ChecklistItem } from '~/components/application/StageChecker';
import type { LeadStatus, ApplicationDocument, ApplicationApplicant } from '~/shared/types';

/**
 * Get checklist items for a specific stage
 */
export function getStageChecklist(
  stage: LeadStatus,
  data: {
    applicants?: ApplicationApplicant[];
    documents?: ApplicationDocument[];
    aiScore?: number | null;
    backgroundCheckStatus?: string;
  }
): ChecklistItem[] {
  switch (stage) {
    case 'new':
      return getNewStageChecklist(data);
    case 'documents_pending':
      return getDocumentsPendingChecklist(data);
    case 'documents_received':
      return getDocumentsReceivedChecklist(data);
    case 'ai_evaluated':
      return getAiEvaluatedChecklist(data);
    case 'screening':
      return getScreeningChecklist(data);
    case 'approved':
      return getApprovedChecklist(data);
    default:
      return [];
  }
}

/**
 * New Application → Documents Pending
 */
function getNewStageChecklist(data: {
  applicants?: ApplicationApplicant[];
}): ChecklistItem[] {
  const primaryApplicant = data.applicants?.find((a) => a.applicantType === 'primary');

  return [
    {
      id: 'verify_contact_info',
      label: 'Verify contact information',
      description: 'Confirm email and phone number are valid',
      required: true,
      checked: !!(primaryApplicant?.email && primaryApplicant?.phone),
    },
    {
      id: 'verify_employment',
      label: 'Verify employment status',
      description: 'Ensure employment information is complete',
      required: true,
      checked: !!(primaryApplicant?.employmentStatus && primaryApplicant?.employerName),
    },
    {
      id: 'review_application',
      label: 'Review application for completeness',
      description: 'Check that all required fields are filled',
      required: true,
      checked: false,
    },
  ];
}

/**
 * Documents Pending → Documents Received
 */
function getDocumentsPendingChecklist(data: {
  documents?: ApplicationDocument[];
  applicants?: ApplicationApplicant[];
}): ChecklistItem[] {
  const requiredDocTypes: ApplicationDocument['documentType'][] = [
    'government_id',
    'paystub',
    'bank_statement',
  ];

  const hasAllRequired = requiredDocTypes.every((type) =>
    data.documents?.some((doc) => doc.documentType === type)
  );

  const allApplicantsCompleted = data.applicants?.every(
    (a) => a.inviteStatus === 'completed' || a.applicantType === 'primary'
  ) ?? false;

  return [
    {
      id: 'request_documents',
      label: 'Request required documents from applicant',
      description: 'Send document upload link to primary applicant',
      required: true,
      checked: false,
    },
    {
      id: 'all_documents_uploaded',
      label: 'All required documents uploaded',
      description: 'Government ID, pay stub, and bank statement',
      required: true,
      checked: hasAllRequired,
    },
    {
      id: 'co_applicants_completed',
      label: 'Co-applicants completed their submissions',
      description: 'All invited co-applicants and guarantors have submitted',
      required: data.applicants && data.applicants.length > 1,
      checked: allApplicantsCompleted,
    },
  ];
}

/**
 * Documents Received → AI Evaluated
 */
function getDocumentsReceivedChecklist(data: {
  documents?: ApplicationDocument[];
}): ChecklistItem[] {
  const allVerified = data.documents?.every(
    (doc) => doc.verificationStatus === 'verified'
  ) ?? false;

  const hasRejected = data.documents?.some(
    (doc) => doc.verificationStatus === 'rejected'
  ) ?? false;

  return [
    {
      id: 'verify_government_id',
      label: 'Verify government-issued ID',
      description: 'Check ID is valid, not expired, and matches applicant name',
      required: true,
      checked: data.documents?.some(
        (doc) => doc.documentType === 'government_id' && doc.verificationStatus === 'verified'
      ) ?? false,
    },
    {
      id: 'verify_income_docs',
      label: 'Verify income documentation',
      description: 'Check pay stubs and bank statements for authenticity',
      required: true,
      checked: data.documents?.some(
        (doc) =>
          (doc.documentType === 'paystub' || doc.documentType === 'bank_statement') &&
          doc.verificationStatus === 'verified'
      ) ?? false,
    },
    {
      id: 'no_rejected_docs',
      label: 'No rejected documents',
      description: 'All documents must be verified or re-uploaded',
      required: true,
      checked: !hasRejected,
    },
    {
      id: 'all_docs_verified',
      label: 'All documents verified',
      description: 'Every uploaded document has been reviewed',
      required: false,
      checked: allVerified,
    },
  ];
}

/**
 * AI Evaluated → Background Check
 */
function getAiEvaluatedChecklist(data: {
  aiScore?: number | null;
  applicants?: ApplicationApplicant[];
}): ChecklistItem[] {
  const hasAiScore = data.aiScore !== null && data.aiScore !== undefined;
  const aiScoreAcceptable = (data.aiScore ?? 0) >= 50; // Threshold
  const allApplicantsScored = data.applicants?.every(
    (a) => a.aiScore !== null && a.aiScore !== undefined
  ) ?? false;

  return [
    {
      id: 'ai_evaluation_complete',
      label: 'AI evaluation completed',
      description: 'Application has been scored by AI system',
      required: true,
      checked: hasAiScore,
    },
    {
      id: 'review_ai_score',
      label: 'Review AI score and assessment',
      description: 'Examine AI evaluation results and recommendations',
      required: true,
      checked: false,
    },
    {
      id: 'ai_score_acceptable',
      label: 'AI score meets minimum threshold',
      description: 'Score must be at least 50/100 to proceed',
      required: true,
      checked: aiScoreAcceptable,
    },
    {
      id: 'all_applicants_scored',
      label: 'All applicants have AI scores',
      description: 'Primary, co-applicants, and guarantors evaluated',
      required: false,
      checked: allApplicantsScored,
    },
  ];
}

/**
 * Background Check → Decision
 */
function getScreeningChecklist(data: {
  backgroundCheckStatus?: string;
  applicants?: ApplicationApplicant[];
}): ChecklistItem[] {
  const allChecksComplete = data.applicants?.every(
    (a) => a.backgroundCheckStatus && a.backgroundCheckStatus !== 'pending'
  ) ?? false;

  return [
    {
      id: 'initiate_background_check',
      label: 'Initiate background check',
      description: 'Submit request to third-party screening service',
      required: true,
      checked: false,
    },
    {
      id: 'background_check_received',
      label: 'Background check results received',
      description: 'All screening reports have been returned',
      required: true,
      checked: allChecksComplete,
    },
    {
      id: 'review_criminal_history',
      label: 'Review criminal history',
      description: 'Examine criminal background check results',
      required: true,
      checked: false,
    },
    {
      id: 'review_eviction_history',
      label: 'Review eviction history',
      description: 'Check for prior evictions or rental disputes',
      required: true,
      checked: false,
    },
    {
      id: 'verify_references',
      label: 'Contact and verify references',
      description: 'Call previous landlords and employers',
      required: false,
      checked: false,
    },
  ];
}

/**
 * Decision → Lease Preparation
 */
function getApprovedChecklist(data: {}): ChecklistItem[] {
  return [
    {
      id: 'review_full_application',
      label: 'Review complete application package',
      description: 'Final review of all documents and screening results',
      required: true,
      checked: false,
    },
    {
      id: 'approve_application',
      label: 'Make approval/rejection decision',
      description: 'Decide whether to approve or reject the application',
      required: true,
      checked: false,
    },
    {
      id: 'notify_applicant',
      label: 'Notify applicant of decision',
      description: 'Send approval or rejection notification',
      required: true,
      checked: false,
    },
    {
      id: 'collect_holding_deposit',
      label: 'Collect holding deposit (if approved)',
      description: 'Secure property with deposit payment',
      required: false,
      checked: false,
    },
  ];
}

/**
 * Get warnings for a specific stage transition
 */
export function getStageWarnings(
  fromStage: LeadStatus,
  toStage: LeadStatus,
  data: {
    aiScore?: number | null;
    backgroundCheckStatus?: string;
    applicants?: ApplicationApplicant[];
  }
): string[] {
  const warnings: string[] = [];

  // Moving to AI Evaluated without sufficient score
  if (toStage === 'ai_evaluated' && data.aiScore && data.aiScore < 50) {
    warnings.push('AI score is below recommended threshold (50). Consider reviewing manually.');
  }

  // Moving to Decision with background check concerns
  if (toStage === 'approved') {
    const hasFailedCheck = data.applicants?.some(
      (a) => a.backgroundCheckStatus === 'failed'
    );
    if (hasFailedCheck) {
      warnings.push('One or more applicants have failed background checks.');
    }

    const hasReviewRequired = data.applicants?.some(
      (a) => a.backgroundCheckStatus === 'review_required'
    );
    if (hasReviewRequired) {
      warnings.push('Background check requires manual review before approval.');
    }
  }

  // Skipping stages
  const stageOrder: LeadStatus[] = [
    'new',
    'documents_pending',
    'documents_received',
    'ai_evaluated',
    'screening',
    'approved',
    'lease_sent',
    'lease_signed',
  ];
  const fromIndex = stageOrder.indexOf(fromStage);
  const toIndex = stageOrder.indexOf(toStage);

  if (toIndex > fromIndex + 1) {
    warnings.push(`You are skipping ${toIndex - fromIndex - 1} stage(s). This may affect compliance.`);
  }

  return warnings;
}
