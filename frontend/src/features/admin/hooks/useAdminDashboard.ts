import { useState, useEffect, useCallback } from 'react'
import { adminService } from '../services/admin.service'
import type { AdminDashboardSummary } from '../types/admin.types'

export function useAdminDashboard() {
  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const summaryData = await adminService.getDashboardSummary()
      setSummary(summaryData)
    } catch {
      setError('Failed to fetch Admin dashboard data.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const loadTimer = window.setTimeout(() => void fetchData(), 0)
    return () => window.clearTimeout(loadTimer)
  }, [fetchData])

  return {
    summary,
    isLoading,
    error,
    refetch: fetchData,
  }
}
