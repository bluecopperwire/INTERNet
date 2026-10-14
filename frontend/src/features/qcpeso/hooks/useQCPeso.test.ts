import { describe, expect, it } from 'vitest'
import type { QCPesoDashboardSummary, QCPesoReviewApplicant } from '../types/qcpeso.types'
import { buildQCPesoDashboardSummary, latestApplicationsForReview } from './useQCPeso'

const base: QCPesoDashboardSummary = {
  pendingApplications: 2,
  activeEmployers: 8,
  verifiedRequirements: 0,
  availableOpportunities: 4,
  activeInternships: 0,
  awaitingFinalization: 0,
  totalApplications: 0,
  activeApplications: 0,
  activePercentage: 0,
  closedPercentage: 0,
}

function application(id: number, historyStatus: QCPesoReviewApplicant['historyStatus']): QCPesoReviewApplicant {
  return { id: String(id), historyStatus } as QCPesoReviewApplicant
}

describe('QC PESO dashboard data', () => {
  it('combines application history and internship workflow summaries', () => {
    const history = [
      application(5, 'For Review (QC PESO)'),
      application(4, 'Under Review (Employer)'),
      application(3, 'Offer Received (Student)'),
      application(2, 'Rejected (QC PESO)'),
      application(1, 'Offer Accepted (Student)'),
    ]

    expect(buildQCPesoDashboardSummary(
      base,
      { totalInternships: 9, activeInternships: 6, closedInternships: 3 },
      { awaitingFinalization: 2, completedInternships: 1, withdrawalInternships: 1, cancelledInternships: 0 },
      history,
    )).toEqual({
      ...base,
      activeInternships: 6,
      awaitingFinalization: 2,
      totalApplications: 5,
      activeApplications: 3,
      activePercentage: 60,
      closedPercentage: 40,
    })
  })

  it('shows only the five latest applications still for QC PESO review', () => {
    const history = [
      application(8, 'Under Review (QC PESO)'),
      ...Array.from({ length: 7 }, (_, index) =>
        application(7 - index, 'For Review (QC PESO)'),
      ),
    ]

    expect(latestApplicationsForReview(history).map(({ id }) => id)).toEqual([
      '7', '6', '5', '4', '3',
    ])
  })
})
