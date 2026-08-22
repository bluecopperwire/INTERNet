import { useState, useEffect, useCallback } from 'react'
import { employerService } from '../services/employer.service'
import type { EmployerDashboardSummary, Applicant } from '../types/employer.types'

export function useEmployerDashboard() {
  const [summary, setSummary] = useState<EmployerDashboardSummary | null>(null)
  const [recentApplicants, setRecentApplicants] = useState<Applicant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [summaryData, applicantsData] = await Promise.all([
        employerService.getDashboardSummary(),
        employerService.getRecentApplicants(4),
      ])
      setSummary(summaryData)
      setRecentApplicants(applicantsData)
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
