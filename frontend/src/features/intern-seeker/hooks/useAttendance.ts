import { useEffect, useState } from 'react'
import { attendanceService } from '../services/attendance.service'
import type { AttendanceMonth, Holiday, TodayAttendance } from '../types/attendance.types'

export function useAttendance(year: number, month: number) {
  const [today, setToday] = useState<TodayAttendance | null>(null)
  const [monthData, setMonthData] = useState<AttendanceMonth | null>(null)
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCheckingIn, setIsCheckingIn] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true

    Promise.all([
      attendanceService.getToday(),
      attendanceService.getMonth(year, month),
      attendanceService.getUpcomingHolidays('2026-08-10'),
    ])
      .then(([todayData, attendanceData, holidayData]) => {
        if (!isActive) return
        setToday(todayData)
        setMonthData(attendanceData)
        setHolidays(holidayData)
      })
      .catch(() => { if (isActive) setError('Unable to load your attendance information.') })
      .finally(() => { if (isActive) setIsLoading(false) })

    return () => { isActive = false }
  }, [year, month])

  const checkIn = async () => {
    setIsCheckingIn(true)
    setError(null)
    try {
      setToday(await attendanceService.checkIn())
    } catch {
      setError('Unable to check in. Please try again.')
    } finally {
      setIsCheckingIn(false)
    }
  }

  return { today, monthData, holidays, isLoading, isCheckingIn, error, checkIn }
}
