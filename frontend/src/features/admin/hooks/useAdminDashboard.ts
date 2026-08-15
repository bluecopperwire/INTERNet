import { useState, useEffect, useCallback } from 'react'
import { adminService } from '../services/admin.service'
import type { AdminDashboardSummary, AdminNotification, AuditLog } from '../types/admin.types'

export function useAdminDashboard() {
  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null)
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([])
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isBackingUp, setIsBackingUp] = useState(false)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [summaryData, notifData, logsData] = await Promise.all([
        adminService.getDashboardSummary(),
        adminService.getNotifications(),
        adminService.getRecentAuditLogs(4),
      ])
      setSummary(summaryData)
      setNotifications(notifData)
      setRecentLogs(logsData)
    } catch (err) {
      setError('Failed to fetch Super Admin dashboard data')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })))
    await adminService.markAllNotificationsAsRead()
  }

  const triggerBackup = async () => {
    setIsBackingUp(true)
    try {
      await adminService.triggerManualBackup()
      await fetchData()
    } finally {
      setIsBackingUp(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    summary,
    recentLogs,
    notifications,
    isLoading,
    isBackingUp,
    error,
    markAllAsRead,
    triggerBackup,
    refetch: fetchData,
  }
}