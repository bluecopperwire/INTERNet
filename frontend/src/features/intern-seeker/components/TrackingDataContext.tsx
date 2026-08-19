import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { applicationsService } from '../services/applications.service'
import { attendanceService } from '../services/attendance.service'
import { requirementsService } from '../services/requirements.service'
import type { UserApplication } from '../types/application.types'
import type { AttendanceMonth, Holiday, TodayAttendance } from '../types/attendance.types'
import type { InternshipRequirement, RequirementUploadInput } from '../types/requirement.types'

const INITIAL_ATTENDANCE_YEAR = 2026
const INITIAL_ATTENDANCE_MONTH = 7
const HOLIDAY_FROM_DATE = '2026-08-10'

const monthKey = (year: number, month: number) => `${year}-${month}`

interface TrackingDataContextValue {
  requirements: InternshipRequirement[] | null
  applications: UserApplication[] | null
  today: TodayAttendance | null
  holidays: Holiday[] | null
  attendanceMonths: Record<string, AttendanceMonth>
  isInitializing: boolean
  requirementsError: string | null
  applicationsError: string | null
  attendanceError: string | null
  setRequirementsError: (error: string | null) => void
  uploadRequirement: (input: RequirementUploadInput) => Promise<InternshipRequirement>
  loadAttendanceMonth: (year: number, month: number) => Promise<void>
  checkIn: () => Promise<TodayAttendance>
}

const TrackingDataContext = createContext<TrackingDataContextValue | null>(null)

export function TrackingDataProvider({ children }: { children: ReactNode }) {
  const [requirements, setRequirements] = useState<InternshipRequirement[] | null>(null)
  const [applications, setApplications] = useState<UserApplication[] | null>(null)
  const [today, setToday] = useState<TodayAttendance | null>(null)
  const [holidays, setHolidays] = useState<Holiday[] | null>(null)
  const [attendanceMonths, setAttendanceMonths] = useState<Record<string, AttendanceMonth>>({})
  const [isInitializing, setIsInitializing] = useState(true)
  const [requirementsError, setRequirementsError] = useState<string | null>(null)
  const [applicationsError, setApplicationsError] = useState<string | null>(null)
  const [attendanceError, setAttendanceError] = useState<string | null>(null)

  const loadAttendanceMonth = useCallback(async (year: number, month: number) => {
    const key = monthKey(year, month)
    if (attendanceMonths[key]) return

    try {
      const data = await attendanceService.getMonth(year, month)
      setAttendanceMonths((current) => current[key] ? current : { ...current, [key]: data })
    } catch {
      setAttendanceError('Unable to load attendance information.')
    }
  }, [attendanceMonths])

  useEffect(() => {
    let isActive = true

    Promise.allSettled([
      requirementsService.getRequirements(),
      applicationsService.getMyApplications(),
      attendanceService.getToday(),
      attendanceService.getMonth(INITIAL_ATTENDANCE_YEAR, INITIAL_ATTENDANCE_MONTH),
      attendanceService.getUpcomingHolidays(HOLIDAY_FROM_DATE),
    ]).then((results) => {
      if (!isActive) return

      const [requirementsResult, applicationsResult, todayResult, monthResult, holidaysResult] = results
      if (requirementsResult.status === 'fulfilled') setRequirements(requirementsResult.value)
      else setRequirementsError('Unable to load your requirements.')
      if (applicationsResult.status === 'fulfilled') setApplications(applicationsResult.value)
      else setApplicationsError('Unable to load your applications.')
      if (todayResult.status === 'fulfilled') setToday(todayResult.value)
      if (monthResult.status === 'fulfilled') setAttendanceMonths({ [monthKey(INITIAL_ATTENDANCE_YEAR, INITIAL_ATTENDANCE_MONTH)]: monthResult.value })
      if (holidaysResult.status === 'fulfilled') setHolidays(holidaysResult.value)
      if (todayResult.status === 'rejected' || monthResult.status === 'rejected' || holidaysResult.status === 'rejected') setAttendanceError('Unable to load attendance information.')
      setIsInitializing(false)
    })

    return () => { isActive = false }
  }, [])

  const uploadRequirement = useCallback(async (input: RequirementUploadInput) => {
    setRequirementsError(null)
    try {
      const updatedRequirement = await requirementsService.uploadRequirement(input)
      setRequirements((current) => current?.map((item) => item.id === input.requirementId ? updatedRequirement : item) ?? [updatedRequirement])
      return updatedRequirement
    } catch {
      setRequirementsError('The document could not be uploaded. Please try again.')
      throw new Error('Requirement upload failed.')
    }
  }, [])

  const checkIn = useCallback(async () => {
    setAttendanceError(null)
    try {
      const updatedToday = await attendanceService.checkIn()
      setToday(updatedToday)
      return updatedToday
    } catch {
      setAttendanceError('Unable to check in.')
      throw new Error('Check-in failed.')
    }
  }, [])

  const value = useMemo(() => ({
    requirements,
    applications,
    today,
    holidays,
    attendanceMonths,
    isInitializing,
    requirementsError,
    applicationsError,
    attendanceError,
    setRequirementsError,
    uploadRequirement,
    loadAttendanceMonth,
    checkIn,
  }), [applications, applicationsError, attendanceError, attendanceMonths, checkIn, holidays, isInitializing, loadAttendanceMonth, requirements, requirementsError, today, uploadRequirement])

  return <TrackingDataContext.Provider value={value}>{children}</TrackingDataContext.Provider>
}

export function useTrackingData() {
  const context = useContext(TrackingDataContext)
  if (!context) throw new Error('useTrackingData must be used within TrackingDataProvider.')
  return context
}
