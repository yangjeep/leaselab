/**
 * ApplicantCard - Display individual applicant information
 * Used in multi-applicant applications to show primary, co-applicants, and guarantors
 */

import type { ApplicationApplicant } from '~/shared/types';
import { Link } from '@remix-run/react';
import { deriveApplicantInviteStatus, type DerivedInviteStatus } from '~/lib/applicant-utils';

type ApplicantCardProps = {
  applicant: ApplicationApplicant;
  applicationId: string;
  isExpanded?: boolean;
  onToggle?: () => void;
};

export function ApplicantCard({
  applicant,
  applicationId,
  isExpanded = false,
  onToggle,
}: ApplicantCardProps) {
  const typeLabels: Record<ApplicationApplicant['applicantType'], { label: string; color: string }> = {
    primary: { label: 'Primary Applicant', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
    co_applicant: { label: 'Co-Applicant', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    guarantor: { label: 'Guarantor', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  };

  const statusLabels: Record<DerivedInviteStatus, { label: string; color: string }> = {
    pending: { label: 'Invite Pending', color: 'bg-yellow-100 text-yellow-800' },
    sent: { label: 'Invite Sent', color: 'bg-blue-100 text-blue-800' },
    completed: { label: 'Completed', color: 'bg-green-100 text-green-800' },
  };

  const aiGradeColors: Record<string, string> = {
    A: 'bg-green-100 text-green-800 border-green-200',
    B: 'bg-blue-100 text-blue-800 border-blue-200',
    C: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    D: 'bg-red-100 text-red-800 border-red-200',
  };

  const backgroundCheckColors: Record<Exclude<ApplicationApplicant['backgroundCheckStatus'], null>, string> = {
    pending: 'bg-gray-100 text-gray-700',
    in_progress: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
    review_required: 'bg-yellow-100 text-yellow-800',
  };

  const typeInfo = typeLabels[applicant.applicantType];
  const inviteStatus = deriveApplicantInviteStatus(applicant);
  const statusInfo = inviteStatus ? statusLabels[inviteStatus] : null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white font-semibold text-lg">
              {applicant.firstName?.[0] || '?'}
              {applicant.lastName?.[0] || ''}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900">
                  {applicant.firstName} {applicant.lastName}
                </h3>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium border ${typeInfo.color}`}
                >
                  {typeInfo.label}
                </span>
              </div>

              {statusInfo && (
                <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${statusInfo.color}`}>
                  {statusInfo.label}
                </span>
              )}
            </div>
          </div>

          {onToggle && (
            <button
              onClick={onToggle}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg
                className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className={`p-4 ${!isExpanded && 'hidden'}`}>
        {/* Contact Information */}
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
            Contact
          </h4>
          <div className="space-y-2">
            {applicant.email && (
              <div className="flex items-center gap-2 text-sm">
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <a href={`mailto:${applicant.email}`} className="text-indigo-600 hover:text-indigo-700">
                  {applicant.email}
                </a>
              </div>
            )}
            {applicant.phone && (
              <div className="flex items-center gap-2 text-sm">
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <a href={`tel:${applicant.phone}`} className="text-indigo-600 hover:text-indigo-700">
                  {applicant.phone}
                </a>
              </div>
            )}
            {applicant.dateOfBirth && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                DOB: {new Date(applicant.dateOfBirth).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>

        {/* Employment Information */}
        {applicant.employmentStatus && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
              Employment
            </h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className="font-medium text-gray-900 capitalize">
                  {applicant.employmentStatus.replace('_', ' ')}
                </span>
              </div>
              {applicant.employerName && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Employer:</span>
                  <span className="font-medium text-gray-900">{applicant.employerName}</span>
                </div>
              )}
              {applicant.jobTitle && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Position:</span>
                  <span className="font-medium text-gray-900">{applicant.jobTitle}</span>
                </div>
              )}
              {applicant.monthlyIncome !== null && applicant.monthlyIncome !== undefined && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Monthly Income:</span>
                  <span className="font-medium text-gray-900">
                    ${applicant.monthlyIncome.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* AI Evaluation */}
        {(applicant.aiScore !== null || applicant.aiLabel) && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
              AI Evaluation
            </h4>
            <div className="flex items-center gap-3">
              {applicant.aiScore !== null && applicant.aiScore !== undefined && (
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-gray-900">
                    {Math.round(applicant.aiScore)}
                  </span>
                  <span className="text-xs text-gray-500">/ 100</span>
                </div>
              )}
              {applicant.aiLabel && (
                <span
                  className={`px-3 py-1 rounded text-sm font-medium border ${
                    aiGradeColors[applicant.aiLabel] || 'bg-gray-100 text-gray-800 border-gray-200'
                  }`}
                >
                  Grade {applicant.aiLabel}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Background Check */}
        {applicant.backgroundCheckStatus && applicant.backgroundCheckStatus !== 'pending' && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
              Background Check
            </h4>
            <div className="space-y-2">
              <span
                className={`inline-block px-3 py-1 rounded text-sm font-medium ${
                  backgroundCheckColors[applicant.backgroundCheckStatus]
                }`}
              >
                {applicant.backgroundCheckStatus.replace('_', ' ').toUpperCase()}
              </span>
              {applicant.backgroundCheckCompletedAt && (
                <div className="text-xs text-gray-600">
                  Completed {new Date(applicant.backgroundCheckCompletedAt).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Invite Link (if applicable) */}
        {inviteStatus && inviteStatus !== 'completed' && applicant.inviteToken && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={() => {
                const url = `${window.location.origin}/apply/${applicant.inviteToken}`;
                navigator.clipboard.writeText(url);
              }}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy Invite Link
            </button>
          </div>
        )}
      </div>

      {/* Summary View (when collapsed) */}
      {!isExpanded && (
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4 text-gray-600">
              {applicant.email && (
                <span className="truncate max-w-[200px]">{applicant.email}</span>
              )}
              {applicant.monthlyIncome !== null && applicant.monthlyIncome !== undefined && (
                <span>${applicant.monthlyIncome.toLocaleString()}/mo</span>
              )}
            </div>
            {applicant.aiLabel && (
              <span
                className={`px-2 py-1 rounded text-xs font-medium border ${
                  aiGradeColors[applicant.aiLabel] || 'bg-gray-100 text-gray-800 border-gray-200'
                }`}
              >
                Grade {applicant.aiLabel}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
