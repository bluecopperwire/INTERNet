import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import type { AttendanceStatus, StudentAttendanceHistoryResponse } from '../../../types/api'
import { AttendanceHistoryView } from '../../../components/AttendanceHistoryView'
import { useAuthStore } from '../../../stores/useAuthStore'
import { getErrorMessage } from '../../../utils/error-message'
import { studentApiService } from '../services/student-api.service'
import styles from './AttendanceHistoryPage.module.css'

const PAGE_SIZES = [5, 10, 15] as const

function AttendanceHistoryPage() {
  const { assignmentId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const studentId = useAuthStore((state) => state.user?.studentId)
  const numericAssignmentId = Number(assignmentId)
  const [status, setStatus] = useState<'' | AttendanceStatus>('')
  const [date, setDate] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(5)
  const [data, setData] = useState<StudentAttendanceHistoryResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const valid = Boolean(studentId && Number.isInteger(numericAssignmentId) && numericAssignmentId > 0)

  const load = useCallback(async () => {
    if (!studentId || !valid) return
    setIsLoading(true); setError(null)
    try { setData(await studentApiService.getAttendanceHistory(studentId, numericAssignmentId, { status: status || undefined, date: date || undefined, page, limit })) }
    catch (requestError) { setError(getErrorMessage(requestError, 'Unable to load Attendance History.')) }
    finally { setIsLoading(false) }
  }, [date, limit, numericAssignmentId, page, status, studentId, valid])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(timeoutId)
  }, [load])

  if (!valid) return <p className={styles.feedback} role="alert">Attendance assignment is unavailable.</p>
  if (isLoading && !data) return <p className={styles.feedback}>Loading Attendance History...</p>
  if (error && !data) return <p className={styles.feedback} role="alert">{error}</p>
  if (!data) return null

  const historyDetailsPath = `/intern-seeker/internship-history/${numericAssignmentId}`
  const backRoutes: Record<string, string> = {
    '/intern-seeker/attendance': 'Back to Attendance',
    [historyDetailsPath]: 'Back to Internship Details',
  }
  const requestedBackPath = (location.state as { attendanceHistoryBackPath?: string } | null)?.attendanceHistoryBackPath
  const backPath = requestedBackPath && backRoutes[requestedBackPath] ? requestedBackPath : '/intern-seeker/attendance'

  return <AttendanceHistoryView
    backLabel={backRoutes[backPath]}
    onBack={() => navigate(backPath)}
    profile={data.assignment}
    summary={data.summary}
    records={data.records.map((record) => ({ id: record.attendanceRecordId, date: record.date, timeIn: record.timeIn, timeOut: record.timeOut, renderedMinutes: record.renderedMinutes, status: record.status }))}
    date={date}
    status={status}
    onDateChange={(value) => { setDate(value); setPage(1) }}
    onStatusChange={(value) => { setStatus(value as '' | AttendanceStatus); setPage(1) }}
    page={page}
    limit={limit}
    totalRecords={data.meta.total}
    pageSizes={PAGE_SIZES}
    onPageChange={setPage}
    onLimitChange={(value) => { setLimit(value); setPage(1) }}
    loading={isLoading}
    error={error}
  />
}

export default AttendanceHistoryPage
