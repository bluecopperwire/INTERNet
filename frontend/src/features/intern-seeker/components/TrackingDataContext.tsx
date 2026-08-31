import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { applicationsService } from '../services/applications.service'
import { attendanceService } from '../services/attendance.service'
import { requirementsService } from '../services/requirements.service'
import type { UserApplication } from '../types/application.types'
import type { AttendanceMonth, InternshipDetails, TodayAttendance } from '../types/attendance.types'
import type { InternshipRequirement, RequirementUploadInput } from '../types/requirement.types'

const INITIAL_ATTENDANCE_YEAR = 2026
const INITIAL_ATTENDANCE_MONTH = 7

const monthKey = (year: number, month: number) => `${year}-${month}`

interface TrackingDataContextValue {
  requirements: InternshipRequirement[] | null
  applications: UserApplication[] | null
  today: TodayAttendance | null
  internshipDetails: InternshipDetails | null
  attendanceMonths: Record<string, AttendanceMonth>
  isInitializing: boolean
  requirementsError: string | null
  applicationsError: string | null
  attendanceError: string | null
  setRequirementsError: (error: string | null) => void
  uploadRequirement: (input: RequirementUploadInput) => Promise<InternshipRequirement>
  deleteRequirement: (requirementId: string) => Promise<InternshipRequirement>
  withdrawApplication: (applicationId: string) => Promise<UserApplication>
  respondToOffer: (applicationId: string, decision: 'accept' | 'reject') => Promise<UserApplication>
  deleteApplication: (applicationId: string) => Promise<void>
  loadAttendanceMonth: (year: number, month: number) => Promise<void>
  checkIn: () => Promise<TodayAttendance>
}

const TrackingDataContext = createContext<TrackingDataContextValue | null>(null)

export function TrackingDataProvider({ children }: { children: ReactNode }) {
  const [requirements, setRequirements] = useState<InternshipRequirement[] | null>(null)
  const [applications, setApplications] = useState<UserApplication[] | null>(null)
  const [today, setToday] = useState<TodayAttendance | null>(null)
  const [internshipDetails, setInternshipDetails] = useState<InternshipDetails | null>(null)
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
      attendanceService.getInternshipDetails(),
      attendanceService.getMonth(INITIAL_ATTENDANCE_YEAR, INITIAL_ATTENDANCE_MONTH),
    ]).then((results) => {
      if (!isActive) return

      const [requirementsResult, applicationsResult, todayResult, internshipDetailsResult, monthResult] = results
      if (requirementsResult.status === 'fulfilled') setRequirements(requirementsResult.value)
      else setRequirementsError('Unable to load your requirements.')
      if (applicationsResult.status === 'fulfilled') setApplications(applicationsResult.value)
      else setApplicationsError('Unable to load your applications.')
      if (todayResult.status === 'fulfilled') setToday(todayResult.value)
      if (internshipDetailsResult.status === 'fulfilled') setInternshipDetails(internshipDetailsResult.value)
      if (monthResult.status === 'fulfilled') setAttendanceMonths({ [monthKey(INITIAL_ATTENDANCE_YEAR, INITIAL_ATTENDANCE_MONTH)]: monthResult.value })
      if (todayResult.status === 'rejected' || internshipDetailsResult.status === 'rejected' || monthResult.status === 'rejected') setAttendanceError('Unable to load attendance information.')
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
      throw new Error('Requirement upload failed.')
    }
  }, [])

  const deleteRequirement = useCallback(async (requirementId: string) => {
    setRequirementsError(null)
    try {
      const updatedRequirement = await requirementsService.deleteRequirement(requirementId)
      setRequirements((current) => current?.map((item) => item.id === requirementId ? updatedRequirement : item) ?? [updatedRequirement])
      return updatedRequirement
    } catch {
      throw new Error('Requirement deletion failed.')
    }
  }, [])

  const updateApplication = useCallback(async (action: (applicationId: string) => Promise<UserApplication>, applicationId: string) => {
    setApplicationsError(null)
    try {
      const updated = await action(applicationId)
      setApplications((current) => current?.map((item) => item.id === applicationId ? updated : item) ?? [updated])
      return updated
    } catch {
      throw new Error('Application update failed.')
    }
  }, [])

  const withdrawApplication = useCallback((applicationId: string) => updateApplication(applicationsService.withdrawApplication, applicationId), [updateApplication])
  const respondToOffer = useCallback((applicationId: string, decision: 'accept' | 'reject') => updateApplication((id) => applicationsService.respondToOffer(id, decision), applicationId), [updateApplication])
  const deleteApplication = useCallback(async (applicationId: string) => {
    setApplicationsError(null)
    try {
      await applicationsService.deleteApplication(applicationId)
      setApplications((current) => current?.filter((item) => item.id !== applicationId) ?? [])
    } catch {
      throw new Error('Application deletion failed.')
    }
  }, [])

  const checkIn = useCallback(async () => {
    setAttendanceError(null)
    try {
      const updatedToday = await attendanceService.checkIn()
      setToday(updatedToday)
      return updatedToday
    } catch {
      throw new Error('Check-in failed.')
    }
  }, [])

  const value = useMemo(() => ({
    requirements,
    applications,
    today,
    internshipDetails,
    attendanceMonths,
    isInitializing,
    requirementsError,
    applicationsError,
    attendanceError,
    setRequirementsError,
    uploadRequirement,
    deleteRequirement,
    withdrawApplication,
    respondToOffer,
    deleteApplication,
    loadAttendanceMonth,
    checkIn,
  }), [applications, applicationsError, attendanceError, attendanceMonths, checkIn, deleteApplication, deleteRequirement, internshipDetails, isInitializing, loadAttendanceMonth, requirements, requirementsError, respondToOffer, today, uploadRequirement, withdrawApplication])

  return <TrackingDataContext.Provider value={value}>{children}</TrackingDataContext.Provider>
}

const fallbackTrackingContext: TrackingDataContextValue = {
  requirements: [],
  applications: [],
  today: null,
  internshipDetails: null,
  attendanceMonths: {},
  isInitializing: false,
  requirementsError: null,
  applicationsError: null,
  attendanceError: null,
  setRequirementsError: () => {},
  uploadRequirement: async () => { throw new Error('TrackingDataProvider not available'); },
  deleteRequirement: async () => { throw new Error('TrackingDataProvider not available'); },
  withdrawApplication: async () => { throw new Error('TrackingDataProvider not available'); },
  respondToOffer: async () => { throw new Error('TrackingDataProvider not available'); },
  deleteApplication: async () => {},
  loadAttendanceMonth: async () => {},
  checkIn: async () => { throw new Error('TrackingDataProvider not available'); },
};

export function useTrackingData() {
  const context = useContext(TrackingDataContext)
  if (!context) {
    return fallbackTrackingContext;
  }
  return context
}
