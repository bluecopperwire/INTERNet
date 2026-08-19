import { useEffect, useState } from 'react'
import { useTrackingData } from '../components/TrackingDataContext'

export function useAttendance(year: number, month: number) {
  const [isCheckingIn, setIsCheckingIn] = useState(false)
  const { today, holidays, attendanceMonths, isInitializing, attendanceError, loadAttendanceMonth, checkIn: saveCheckIn } = useTrackingData()
  const monthData = attendanceMonths[`${year}-${month}`] ?? null

  useEffect(() => {
    if (!isInitializing && !monthData) void loadAttendanceMonth(year, month)
  }, [isInitializing, loadAttendanceMonth, monthData, month, year])

  const checkIn = async () => {
    setIsCheckingIn(true)
    try {
      await saveCheckIn()
    } finally {
      setIsCheckingIn(false)
    }
  }

  return {
    today,
    monthData,
    holidays: holidays ?? [],
    isLoading: isInitializing || !monthData,
    isCheckingIn,
    error: attendanceError,
    checkIn,
  }
}
