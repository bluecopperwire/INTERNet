import { describe, expect, it, vi } from 'vitest'
import type { Applicant } from '../types/employer.types'
import { getEmployerReferralDetail, openReferralForReview } from './employer-review-flow'

function referral(
  referralStatus: Applicant['referralStatus'],
  companyResponse: Applicant['companyResponse'] = 'pending',
) {
  return { id: '41', referralStatus, companyResponse }
}

describe('employer referral review navigation', () => {
  it('marks a sent referral under review exactly once before navigating', async () => {
    const markUnderReview = vi.fn().mockResolvedValue(undefined)
    const navigate = vi.fn()
    await openReferralForReview(referral('sent'), { markUnderReview, navigate, onMutationError: vi.fn() })
    expect(markUnderReview).toHaveBeenCalledTimes(1)
    expect(markUnderReview).toHaveBeenCalledWith('41')
    expect(navigate).toHaveBeenCalledWith('/employer/applicants/41')
  })

  it.each([
    ['under_review', 'pending'],
    ['under_review', 'for_interview'],
    ['under_review', 'accepted'],
    ['closed', 'rejected'],
    ['withdrawn', 'accepted'],
    ['expired', 'pending'],
  ] as const)('opens %s/%s without a review mutation', async (referralStatus, companyResponse) => {
    const markUnderReview = vi.fn()
    const navigate = vi.fn()
    await openReferralForReview(referral(referralStatus, companyResponse), { markUnderReview, navigate, onMutationError: vi.fn() })
    expect(markUnderReview).not.toHaveBeenCalled()
    expect(navigate).toHaveBeenCalledWith('/employer/applicants/41')
  })

  it('loads only the requested IDs on direct load, refresh, and referral switches', async () => {
    const getDetail = vi.fn(async (id: string) => ({ id }))
    await getEmployerReferralDetail('41', { getDetail })
    await getEmployerReferralDetail('41', { getDetail })
    await getEmployerReferralDetail('52', { getDetail })
    expect(getDetail.mock.calls).toEqual([['41'], ['41'], ['52']])
  })
})
