import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import type { AttendanceStatus, StudentAttendanceHistoryResponse } from '../../../types/api'
import { useAuthStore } from '../../../stores/useAuthStore'
import { getErrorMessage } from '../../../utils/error-message'
import { studentApiService } from '../services/student-api.service'
import { formatMinutes, formatManilaDate } from '../utils/internship-display'
import styles from './AttendanceHistoryPage.module.css'

function AttendanceHistoryPage() {
  const { assignmentId } = useParams()
  const navigate = useNavigate()
  const studentId = useAuthStore((state) => state.user?.studentId)
  const numericAssignmentId = Number(assignmentId)
  const [status, setStatus] = useState<'all' | AttendanceStatus>('all')
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
    try { setData(await studentApiService.getAttendanceHistory(studentId, numericAssignmentId, { status: status === 'all' ? undefined : status, date: date || undefined, page, limit })) }
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

  const summary = data.summary
  return <div className={styles.page}><button className={styles.backButton} type="button" onClick={() => navigate(-1)}><ArrowLeft size={18} />Back</button><section className={styles.card}><header className={styles.header}><h1>{data.assignment.jobTitle} at {data.assignment.companyName}</h1></header><div className={styles.summaryGrid}>{[['Days Present', String(summary.daysPresent)], ['Days Absent', String(summary.daysAbsent)], ['Rendered Hours', formatMinutes(summary.renderedMinutes)], ['Remaining Hours', formatMinutes(summary.remainingMinutes)]].map(([label, value]) => <article className={styles.summaryCard} key={label}><strong>{label}</strong><span>{value}</span></article>)}</div><div className={styles.filters}><label>Status filter<select value={status} onChange={(event) => { setStatus(event.target.value as 'all' | AttendanceStatus); setPage(1) }}><option value="all">All</option><option value="present">Present</option><option value="absent">Absent</option><option value="incomplete">Incomplete</option></select></label><label>Date filter<input type="date" value={date} onChange={(event) => { setDate(event.target.value); setPage(1) }} /></label></div>{error && <p className={styles.inlineError} role="alert">{error}</p>}<div className={styles.tableScroller}><table><thead><tr><th>Date</th><th>Clock In Time</th><th>Clock Out Time</th><th>Rendered Time</th><th>Attendance Status</th></tr></thead><tbody>{data.records.map((record) => <tr key={record.attendanceRecordId}><td>{formatManilaDate(record.date)}</td><td>{record.timeIn ? record.timeIn.slice(0, 5) : '-'}</td><td>{record.timeOut ? record.timeOut.slice(0, 5) : '-'}</td><td>{formatMinutes(record.renderedMinutes)}</td><td><span className={`${styles.status} ${styles[record.status]}`}>{record.status[0].toUpperCase() + record.status.slice(1)}</span></td></tr>)}</tbody></table></div>{data.records.length === 0 && <div className={styles.empty}><h2>No attendance records found</h2><p>Try another status or date filter.</p></div>}<footer className={styles.pagination}><label>Rows per page<select value={limit} onChange={(event) => { setLimit(Number(event.target.value)); setPage(1) }}>{[5, 10, 15].map((size) => <option key={size} value={size}>{size}</option>)}</select></label><span>Page {data.meta.page} of {Math.max(data.meta.totalPages, 1)}</span><div><button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button><button type="button" disabled={page >= data.meta.totalPages} onClick={() => setPage((value) => value + 1)}>Next</button></div></footer></section></div>
}

export default AttendanceHistoryPage
