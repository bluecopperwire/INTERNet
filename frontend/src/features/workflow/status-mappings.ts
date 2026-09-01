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

export interface WorkflowStatusInput {
  applicationStatus?: ApplicationStatus | null
  referralStatus?: ReferralStatus | null
  companyResponse?: CompanyResponse | null
  studentResponse?: StudentResponse | null
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
