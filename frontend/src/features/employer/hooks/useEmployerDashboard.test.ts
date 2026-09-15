import { describe, expect, it } from 'vitest'
import type { Applicant, EmployerDashboardSummary } from '../types/employer.types'
import {
  buildEmployerDashboardSummary,
  latestReferrals,
} from './useEmployerDashboard'

const base: EmployerDashboardSummary = {
  companyName: 'Test Company',
  activeOpportunities: 3,
  activeReferrals: 0,
  activeInternships: 0,
  awaitingReview: 0,
  awaitingCompletion: 0,
  totalReferrals: 0,
  activePercentage: 0,
  closedPercentage: 0,
}

function referral(id: number, historyStatus: Applicant['historyStatus']): Applicant {
  return { id: String(id), historyStatus } as Applicant
}

describe('employer dashboard referral metrics', () => {
  it('derives cards and ongoing-versus-closed percentages from referral history', () => {
    const history = [
      referral(6, 'For Review (Employer)'),
      referral(5, 'Offer Accepted (Student)'),
      referral(4, 'Rejected (Employer)'),
      referral(3, 'Offer Declined (Student)'),
      referral(2, 'Under Review (Employer)'),
      referral(1, 'Withdrawn (Student)'),
    ]

    expect(buildEmployerDashboardSummary(base, {
      activeInternships: 7,
      pendingInternships: 2,
      ongoingInternships: 4,
      awaitingCompletion: 1,
    }, history)).toEqual({
      ...base,
      activeReferrals: 2,
      activeInternships: 7,
      awaitingReview: 1,
      awaitingCompletion: 1,
      totalReferrals: 6,
      activePercentage: 33,
      closedPercentage: 67,
    })
  })

  it('keeps only the five newest For Review referrals', () => {
    const history = [
      referral(8, 'Under Review (Employer)'),
      ...Array.from({ length: 7 }, (_, index) =>
        referral(7 - index, 'For Review (Employer)'),
      ),
    ]

    expect(latestReferrals(history).map(({ id }) => id)).toEqual([
      '7', '6', '5', '4', '3',
    ])
  })
})
