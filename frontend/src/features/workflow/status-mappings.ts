import type {
  ApplicationStatus,
  CompanyResponse,
  ReferralStatus,
  StudentResponse,
} from '../../types/api'

export type WorkflowDisplayStatus =
  | 'For Review'
  | 'Under Review'
  | 'Endorsed'
  | 'Pending'
  | 'Interview Scheduled'
  | 'Offer Received'
  | 'Accepted'
  | 'Offer Declined'
  | 'Rejected'
  | 'Withdrawn'
  | 'Expired'
  | 'Closed'

export type ApplicationHistoryStatus =
  | 'For Review (QC PESO)'
  | 'Under Review (QC PESO)'
  | 'Rejected (QC PESO)'
  | 'For Review (Employer)'
  | 'Under Review (Employer)'
  | 'For Interview (Employer)'
  | 'Rejected (Employer)'
  | 'Offer Received (Student)'
  | 'Offer Declined (Student)'
  | 'Offer Accepted (Student)'
  | 'Withdrawn (Student)'
  | 'Expired (Employer)'

export type ReferralHistoryStatus = Exclude<
  ApplicationHistoryStatus,
  | 'For Review (QC PESO)'
  | 'Under Review (QC PESO)'
  | 'Rejected (QC PESO)'
>

export type EmployerReviewStatus =
  | 'For Review'
  | 'Under Review'
  | 'For Interview'

export const APPLICATION_HISTORY_STATUSES: ApplicationHistoryStatus[] = [
  'For Review (QC PESO)',
  'Under Review (QC PESO)',
  'Rejected (QC PESO)',
  'For Review (Employer)',
  'Under Review (Employer)',
  'For Interview (Employer)',
  'Rejected (Employer)',
  'Offer Received (Student)',
  'Offer Declined (Student)',
  'Offer Accepted (Student)',
  'Withdrawn (Student)',
  'Expired (Employer)',
]

export const REFERRAL_HISTORY_STATUSES: ReferralHistoryStatus[] = [
  'For Review (Employer)',
  'Under Review (Employer)',
  'For Interview (Employer)',
  'Rejected (Employer)',
  'Offer Received (Student)',
  'Offer Declined (Student)',
  'Offer Accepted (Student)',
  'Withdrawn (Student)',
  'Expired (Employer)',
]

export const APPLICATION_ONGOING_STATUSES: ApplicationHistoryStatus[] = [
  'For Review (QC PESO)',
  'Under Review (QC PESO)',
  'For Review (Employer)',
  'Under Review (Employer)',
  'For Interview (Employer)',
  'Offer Received (Student)',
]

export const APPLICATION_CLOSED_STATUSES: ApplicationHistoryStatus[] = [
  'Rejected (QC PESO)',
  'Rejected (Employer)',
  'Offer Declined (Student)',
  'Offer Accepted (Student)',
  'Withdrawn (Student)',
  'Expired (Employer)',
]

export const REFERRAL_ONGOING_STATUSES: ReferralHistoryStatus[] = [
  'For Review (Employer)',
  'Under Review (Employer)',
  'For Interview (Employer)',
  'Offer Received (Student)',
]

export const REFERRAL_CLOSED_STATUSES: ReferralHistoryStatus[] = [
  'Rejected (Employer)',
  'Offer Declined (Student)',
  'Offer Accepted (Student)',
  'Withdrawn (Student)',
  'Expired (Employer)',
]

export interface WorkflowStatusInput {
  applicationStatus?: ApplicationStatus | null
  referralStatus?: ReferralStatus | null
  companyResponse?: CompanyResponse | null
  studentResponse?: StudentResponse | null
}

export function applicationHistoryStatus(
  input: WorkflowStatusInput,
): ApplicationHistoryStatus {
  if (input.applicationStatus === 'withdrawn') return 'Withdrawn (Student)'
  if (input.applicationStatus === 'expired') return 'Expired (Employer)'
  if (input.applicationStatus === 'submitted') return 'For Review (QC PESO)'
  if (input.applicationStatus === 'under_review') return 'Under Review (QC PESO)'
  if (input.applicationStatus === 'rejected_for_referral') return 'Rejected (QC PESO)'
  if (input.companyResponse === 'rejected') return 'Rejected (Employer)'
  if (input.companyResponse === 'accepted') {
    if (input.studentResponse === 'accepted') return 'Offer Accepted (Student)'
    if (input.studentResponse === 'declined') return 'Offer Declined (Student)'
    return 'Offer Received (Student)'
  }
  if (input.companyResponse === 'for_interview') return 'For Interview (Employer)'
  if (input.referralStatus === 'under_review') return 'Under Review (Employer)'
  return 'For Review (Employer)'
}

export function referralHistoryStatus(
  input: WorkflowStatusInput,
): ReferralHistoryStatus {
  if (input.applicationStatus === 'withdrawn' || input.referralStatus === 'withdrawn') {
    return 'Withdrawn (Student)'
  }
  if (input.applicationStatus === 'expired' || input.referralStatus === 'expired') {
    return 'Expired (Employer)'
  }
  if (input.companyResponse === 'rejected') return 'Rejected (Employer)'
  if (input.companyResponse === 'accepted') {
    if (input.studentResponse === 'accepted') return 'Offer Accepted (Student)'
    if (input.studentResponse === 'declined') return 'Offer Declined (Student)'
    return 'Offer Received (Student)'
  }
  if (input.companyResponse === 'for_interview') return 'For Interview (Employer)'
  if (input.referralStatus === 'under_review') return 'Under Review (Employer)'
  return 'For Review (Employer)'
}

export function employerReviewStatus(
  input: WorkflowStatusInput,
): EmployerReviewStatus {
  if (input.companyResponse === 'for_interview') return 'For Interview'
  if (input.referralStatus === 'under_review') return 'Under Review'
  return 'For Review'
}

export function applicationDisplayStatus(input: WorkflowStatusInput): WorkflowDisplayStatus {
  if (input.applicationStatus === 'withdrawn') return 'Withdrawn'
  if (input.applicationStatus === 'expired') return 'Expired'
  if (input.applicationStatus === 'rejected_for_referral') return 'Rejected'
  if (input.applicationStatus === 'submitted') return 'For Review'
  if (input.applicationStatus === 'under_review') return 'Under Review'

  if (input.companyResponse === 'rejected') return 'Rejected'
  if (input.companyResponse === 'for_interview') return 'Interview Scheduled'
  if (input.companyResponse === 'accepted') {
    if (input.studentResponse === 'accepted') return 'Accepted'
    if (input.studentResponse === 'declined') return 'Offer Declined'
    return 'Offer Received'
  }
  if (input.applicationStatus === 'approved_for_referral') return 'Endorsed'
  return 'Closed'
}

export function referralDisplayStatus(
  input: WorkflowStatusInput,
  sentLabel: 'Pending' | 'For Review' = 'Pending',
): WorkflowDisplayStatus {
  if (input.referralStatus === 'withdrawn') return 'Withdrawn'
  if (input.referralStatus === 'expired') return 'Expired'
  if (input.companyResponse === 'rejected') return 'Rejected'
  if (input.companyResponse === 'for_interview') return 'Interview Scheduled'
  if (input.companyResponse === 'accepted') {
    if (input.studentResponse === 'accepted') return 'Accepted'
    if (input.studentResponse === 'declined') return 'Offer Declined'
    return 'Offer Received'
  }
  if (input.referralStatus === 'under_review') return 'Under Review'
  if (input.referralStatus === 'sent') return sentLabel
  return 'Closed'
}

export function isTerminalApplication(status?: ApplicationStatus | null): boolean {
  return ['rejected_for_referral', 'closed', 'withdrawn', 'expired'].includes(status ?? '')
}

export function isTerminalReferral(status?: ReferralStatus | null): boolean {
  return ['closed', 'withdrawn', 'expired'].includes(status ?? '')
}

export function assignmentCandidateResponse(
  response: StudentResponse | null | undefined,
): 'Pending' | 'Accepted' | 'Rejected' | 'Unknown' {
  if (response === 'pending') return 'Pending'
  if (response === 'accepted') return 'Accepted'
  if (response === 'declined') return 'Rejected'
  return 'Unknown'
}
