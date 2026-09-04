import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { AttendanceHistoryView } from '../../../components/AttendanceHistoryView'
import type { EmployerAttendanceHistoryDto } from '../../../types/api'
import { getErrorMessage } from '../../../utils/error-message'
import { employerApiService } from '../services/employer-api.service'
import { COMPANY_PAGE_SIZES } from '../utils/internship-workflow'
import styles from './AttendanceInternshipDetailsPage.module.css'

export function AttendanceInternshipDetailsPage() {
  const { applicantId } = useParams<{ applicantId: string }>()
  const assignmentId = Number(applicantId)
  const location = useLocation()
  const navigate = useNavigate()
  const [result, setResult] = useState<EmployerAttendanceHistoryDto | null>(null)
  const [status, setStatus] = useState('')
  const [date, setDate] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!Number.isInteger(assignmentId)) return
    let active = true
    employerApiService.getAssignmentAttendanceHistory(assignmentId, { page, limit, status: status || undefined, date: date || undefined })
      .then((data) => { if (active) setResult(data) })
      .catch((reason: unknown) => { if (active) setError(getErrorMessage(reason, 'Unable to load attendance history.')) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [assignmentId, date, limit, page, status])

  if (!Number.isInteger(assignmentId)) return <main className={styles.feedback} role="alert">Internship assignment not found.</main>
  if (!result && loading) return <main className={styles.feedback}>Loading attendance history...</main>
  if (!result) return <main className={styles.feedback} role="alert">{error || 'Attendance history not found.'}</main>

  const { header, summary, history } = result
  const internshipDetailsPath = `/employer/internship-history/${assignmentId}`
  const backRoutes: Record<string, string> = {
    '/employer/attendance': 'Back to Monitor Attendance',
    [internshipDetailsPath]: 'Back to Internship Details',
  }
  const requestedBackPath = (location.state as { attendanceHistoryBackPath?: string } | null)?.attendanceHistoryBackPath
  const backPath = requestedBackPath && backRoutes[requestedBackPath] ? requestedBackPath : '/employer/attendance'

  return <AttendanceHistoryView
    backLabel={backRoutes[backPath]}
    onBack={() => navigate(backPath)}
    profile={header}
    summary={summary}
    records={history.data.map((record) => ({ id: record.attendanceRecordId, date: record.date, timeIn: record.timeIn, timeOut: record.timeOut, renderedMinutes: record.renderedMinutes, status: record.attendanceStatus }))}
    date={date}
    status={status}
    onDateChange={(value) => { setLoading(true); setError(''); setDate(value); setPage(1) }}
    onStatusChange={(value) => { setLoading(true); setError(''); setStatus(value); setPage(1) }}
    page={page}
    limit={limit}
    totalPages={history.meta.totalPages}
    pageSizes={COMPANY_PAGE_SIZES}
    onPageChange={(value) => { setLoading(true); setError(''); setPage(value) }}
    onLimitChange={(value) => { setLoading(true); setError(''); setLimit(value); setPage(1) }}
    loading={loading}
    error={error}
  />
}
