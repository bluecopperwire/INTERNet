import { useState, useEffect, useCallback } from 'react'
import { employerService } from '../services/employer.service'
import type { EmployerDashboardSummary, Applicant } from '../types/employer.types'
import type { EmployerManageInternshipSummaryDto } from '../../../types/api'
import {
  REFERRAL_CLOSED_STATUSES,
  REFERRAL_ONGOING_STATUSES,
} from '../../workflow/status-mappings'

export function buildEmployerDashboardSummary(
  base: EmployerDashboardSummary,
  internships: EmployerManageInternshipSummaryDto,
  referralHistory: Applicant[],
): EmployerDashboardSummary {
  const totalReferrals = referralHistory.length
  const ongoing = referralHistory.filter((referral) =>
    REFERRAL_ONGOING_STATUSES.includes(
      referral.historyStatus ?? 'For Review (Employer)',
    ),
  ).length
  const closed = referralHistory.filter((referral) =>
    REFERRAL_CLOSED_STATUSES.includes(
      referral.historyStatus ?? 'For Review (Employer)',
    ),
  ).length
  const categorizedReferrals = ongoing + closed
  const activePercentage = categorizedReferrals
    ? Math.round((ongoing / categorizedReferrals) * 100)
    : 0

  return {
    ...base,
    activeReferrals: ongoing,
    activeInternships: internships.activeInternships,
    awaitingReview: referralHistory.filter(
      (referral) => referral.historyStatus === 'For Review (Employer)',
    ).length,
    awaitingCompletion: internships.awaitingCompletion,
    totalReferrals,
    activePercentage,
    closedPercentage: categorizedReferrals ? 100 - activePercentage : 0,
  }
}

export function latestReferrals(referralHistory: Applicant[]): Applicant[] {
  return referralHistory
    .filter((referral) => referral.historyStatus === 'For Review (Employer)')
    .slice(0, 5)
}

export function useEmployerDashboard() {
  const [summary, setSummary] = useState<EmployerDashboardSummary | null>(null)
  const [recentApplicants, setRecentApplicants] = useState<Applicant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [baseSummary, internshipSummary, referralHistory] = await Promise.all([
        employerService.getDashboardSummary(),
        employerService.getInternshipSummary(),
        employerService.getReferralHistory(),
      ])
      setSummary(
        buildEmployerDashboardSummary(
          baseSummary,
          internshipSummary,
          referralHistory,
        ),
      )
      setRecentApplicants(latestReferrals(referralHistory))
    } catch (err) {
      setError('Failed to fetch employer dashboard data')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    summary,
    recentApplicants,
    isLoading,
    error,
    refetch: fetchData,
  }
}
