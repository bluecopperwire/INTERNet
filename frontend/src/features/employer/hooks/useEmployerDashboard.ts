import { useState, useEffect, useCallback } from 'react'
import { employerService } from '../services/employer.service'
import type { EmployerDashboardSummary, Applicant, EmployerNotification } from '../types/employer.types'

export function useEmployerDashboard() {
  const [summary, setSummary] = useState<EmployerDashboardSummary | null>(null)
  const [recentApplicants, setRecentApplicants] = useState<Applicant[]>([])
  const [notifications, setNotifications] = useState<EmployerNotification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [summaryData, applicantsData, notifData] = await Promise.all([
        employerService.getDashboardSummary(),
        employerService.getRecentApplicants(4),
        employerService.getNotifications(),
      ])
      setSummary(summaryData)
      setRecentApplicants(applicantsData)
      setNotifications(notifData)
    } catch (err) {
      setError('Failed to fetch employer dashboard data')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })))
    await employerService.markAllNotificationsAsRead()
  }

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    summary,
    recentApplicants,
    notifications,
    isLoading,
    error,
    markAllAsRead,
    refetch: fetchData,
  }
}