import type { ApplicationApplicant } from '~/shared/types';

export type DerivedInviteStatus = 'pending' | 'sent' | 'completed';

export function deriveApplicantInviteStatus(applicant: ApplicationApplicant): DerivedInviteStatus | null {
  if (!applicant.inviteToken && !applicant.inviteSentAt) {
    return null;
  }

  if (applicant.inviteAcceptedAt) {
    return 'completed';
  }

  if (applicant.inviteSentAt) {
    return 'sent';
  }

  return 'pending';
}
