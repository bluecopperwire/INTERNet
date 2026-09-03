import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Clock3 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { AssignmentStatus, StudentAttendanceResponse } from '../../../types/api'
import { useAuthStore } from '../../../stores/useAuthStore'
import { useToastStore } from '../../../stores/useToastStore'
import { getErrorMessage } from '../../../utils/error-message'
import { todayDateOnly } from '../../../utils/date-only'
import { studentApiService } from '../services/student-api.service'
import { formatMinutes } from '../utils/internship-display'
import { buildCalendarDays, getTodayTag } from '../utils/attendance-display'
import styles from './AttendancePage.module.css'

const WEEKDAYS = ['S', 'M', 'T', 'W', 'TH', 'F', 'ST']
const assignmentLabels: Record<Exclude<AssignmentStatus, 'finalized'>, string> = {
  pending: 'Pending', ongoing: 'Ongoing', complete_company: 'Completed', complete_student: 'Completed', withdrawn: 'Withdrawn', cancelled: 'Cancelled',
}

function AttendancePage() {
  const now = new Date()
  const [visibleMonth, setVisibleMonth] = useState(new Date(now.getFullYear(), now.getMonth(), 1))
  const [data, setData] = useState<StudentAttendanceResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [action, setAction] = useState<'in' | 'out' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const studentId = useAuthStore((state) => state.user?.studentId)
  const toast = useToastStore()
  const navigate = useNavigate()

  const loadAttendance = useCallback(async () => {
    if (!studentId) return
    setIsLoading(true); setError(null)
    try {
      const year = visibleMonth.getFullYear(), month = visibleMonth.getMonth()
      const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`
      const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(new Date(year, month + 1, 0).getDate()).padStart(2, '0')}`
      setData(await studentApiService.getAttendance(studentId, { startDate, endDate }))
    } catch (requestError) { setError(getErrorMessage(requestError, 'Unable to load attendance information.')) }
    finally { setIsLoading(false) }
  }, [studentId, visibleMonth])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadAttendance(), 0)
    return () => window.clearTimeout(timeoutId)
  }, [loadAttendance])

  const runClockAction = async (kind: 'in' | 'out') => {
    if (!studentId || !data?.assignment) return
    setAction(kind)
    try {
      if (kind === 'in') await studentApiService.clockIn(studentId, data.assignment.internshipAssignmentId)
      else await studentApiService.clockOut(studentId, data.assignment.internshipAssignmentId)
      await loadAttendance()
      toast.success(kind === 'in' ? 'Clock In recorded.' : 'Clock Out recorded.')
    } catch (requestError) { toast.error(getErrorMessage(requestError, `Unable to Clock ${kind === 'in' ? 'In' : 'Out'}.`)) }
    finally { setAction(null) }
  }

  if (isLoading) return <p className={styles.feedback}>Loading attendance...</p>
  if (error) return <p className={styles.error} role="alert">{error}</p>
  if (!data?.assignment) return <div className={styles.emptyState}><section className={styles.todayPanel}><h2>No active internship yet</h2><p>There is currently no active internship to track.</p></section><section className={styles.summaryPanel}><h2>Attendance Summary</h2><p>Attendance information will appear once an internship assignment is available.</p></section></div>

  const assignment = data.assignment
  const today = todayDateOnly()
  const todayIsWorkday = assignment.workingDays.includes(new Date(`${today}T00:00:00Z`).getUTCDay()) && today >= assignment.startDate
  const attendanceTag = getTodayTag(assignment.assignmentStatus, todayIsWorkday, data.today)
  const canClockIn = assignment.assignmentStatus === 'ongoing' && todayIsWorkday && !data.today
  const canClockOut = assignment.assignmentStatus === 'ongoing' && data.today?.attendanceStatus === 'present' && Boolean(data.today.timeIn) && !data.today.timeOut

  return <div className={styles.attendanceLayout}><div className={styles.primaryColumn}><section className={styles.todayPanel} aria-labelledby="today-heading"><header className={styles.panelHeader}><h2 id="today-heading">Today&apos;s Status</h2><div className={styles.statusStack}><span className={styles.statusLabel}>Assignment Status</span><span className={styles.statusBadge}>{assignmentLabels[assignment.assignmentStatus as Exclude<AssignmentStatus, 'finalized'>]}</span><span className={styles.statusLabel}>Attendance Status</span><span className={styles.statusBadge}>{attendanceTag}</span></div></header><div className={styles.todayDetails}><TimeField title="Clock In Time" value={data.today?.timeIn} empty="No clock in time yet." /><TimeField title="Clock Out Time" value={data.today?.timeOut} empty="No clock out time yet." /></div><div className={styles.clockActions}><button className={styles.checkInButton} type="button" disabled={!canClockIn || action !== null} onClick={() => void runClockAction('in')}>{action === 'in' ? 'Clocking In...' : 'Clock In'}</button><button className={styles.checkOutButton} type="button" disabled={!canClockOut || action !== null} onClick={() => void runClockAction('out')}>{action === 'out' ? 'Clocking Out...' : 'Clock Out'}</button></div></section><Summary summary={data.summary} onHistory={() => navigate(`/intern-seeker/attendance-history/${assignment.internshipAssignmentId}`)} /></div><aside className={styles.secondaryColumn}><AttendanceCalendar data={data} month={visibleMonth} onPrevious={() => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))} onNext={() => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))} /></aside></div>
}

function TimeField({ title, value, empty }: { title: string; value?: string | null; empty: string }) { return <div className={styles.detailRow}><Clock3 aria-hidden="true" /><div><h3>{title}</h3><p>{value ? String(value).slice(0, 5) : empty}</p></div></div> }

function Summary({ summary, onHistory }: { summary: StudentAttendanceResponse['summary']; onHistory: () => void }) {
  const items = [['Days Present', String(summary.daysPresent), styles.presentCard], ['Days Absent', String(summary.daysAbsent), styles.absentCard], ['Rendered Hours', formatMinutes(summary.renderedMinutes), styles.renderedCard], ['Remaining Hours', formatMinutes(summary.remainingMinutes), styles.remainingCard]] as const
  return <section className={styles.summaryPanel}><h2>Attendance Summary</h2><div className={styles.summaryGrid}>{items.map(([label, value, className]) => <article className={`${styles.summaryCard} ${className}`} key={label}><strong>{label}</strong><span>{value}</span></article>)}</div><button className={styles.historyButton} type="button" onClick={onHistory}>View Attendance History</button></section>
}

function AttendanceCalendar({ data, month, onPrevious, onNext }: { data: StudentAttendanceResponse; month: Date; onPrevious: () => void; onNext: () => void }) {
  const days = useMemo(() => buildCalendarDays(data, month), [data, month])
  const monthLabel = new Intl.DateTimeFormat('en-PH', { month: 'long', year: 'numeric' }).format(month)
  return <section className={styles.calendarPanel}><header className={styles.calendarHeader}><div><h2>Calendar</h2><strong>{monthLabel}</strong></div><div className={styles.monthControls}><button type="button" aria-label="Previous month" onClick={onPrevious}><ChevronLeft /></button><button type="button" aria-label="Next month" onClick={onNext}><ChevronRight /></button></div></header><div className={styles.calendarGrid} role="grid" aria-label={monthLabel}>{WEEKDAYS.map((weekday) => <span className={styles.weekday} role="columnheader" key={weekday}>{weekday}</span>)}{days.map((day) => day.day === null ? <span aria-hidden="true" key={day.key} /> : <span className={`${styles.calendarDay} ${day.status ? styles[day.status] : ''}`} role="gridcell" aria-label={`${day.date}${day.status ? `, ${day.status}` : ''}`} key={day.key}>{day.day}</span>)}</div><div className={styles.legend} aria-label="Calendar legend"><span><i className={styles.workdayDot} />Work Days</span><span><i className={styles.presentDot} />Present</span><span><i className={styles.absentDot} />Absent</span></div></section>
}

export default AttendancePage
