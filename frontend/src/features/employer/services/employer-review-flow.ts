import type { Applicant } from '../types/employer.types'

type ReviewReferral = Pick<Applicant, 'id' | 'referralStatus' | 'companyResponse'>

interface OpenReviewDependencies {
  markUnderReview: (referralId: string) => Promise<unknown>
  navigate: (path: string) => void
  onMutationError: (error: unknown) => void
}

interface DetailDependencies<T> {
  getDetail: (referralId: string) => Promise<T>
}

export function employerReferralPath(referralId: string): string {
  return `/employer/applicants/${referralId}`
}

export async function openReferralForReview(
  referral: ReviewReferral,
  dependencies: OpenReviewDependencies,
): Promise<void> {
  if (referral.referralStatus === 'sent' && referral.companyResponse === 'pending') {
    try {
      await dependencies.markUnderReview(referral.id)
    } catch (error: unknown) {
      dependencies.onMutationError(error)
    }
  }
  dependencies.navigate(employerReferralPath(referral.id))
}

export function getEmployerReferralDetail<T>(
  referralId: string,
  dependencies: DetailDependencies<T>,
): Promise<T> {
  return dependencies.getDetail(referralId)
}
