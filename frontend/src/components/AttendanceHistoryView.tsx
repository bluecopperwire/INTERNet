import { ArrowLeft, CalendarDays, SlidersHorizontal } from 'lucide-react'
import { formatAttendanceDate, formatAttendanceDuration, formatAttendanceWholeHours } from '../utils/attendance-format'
import { AttendanceProfileSummary, type AttendanceProfileSummaryData } from './AttendanceProfileSummary'
import { TablePagination } from './TablePagination'
import styles from './AttendanceHistoryView.module.css'

export interface AttendanceHistoryRecordView {
  id: number
  date: string
  timeIn?: string | null
  timeOut?: string | null
  renderedMinutes: number
  status: string
}

interface AttendanceHistoryViewProps {
  backLabel: string
  onBack: () => void
  profile: AttendanceProfileSummaryData
  summary: { daysPresent: number; daysAbsent: number; renderedMinutes: number; remainingMinutes: number }
  records: AttendanceHistoryRecordView[]
  date: string
  status: string
  onDateChange: (value: string) => void
  onStatusChange: (value: string) => void
  page: number
  limit: number
  totalRecords: number
  pageSizes: readonly number[]
  onPageChange: (value: number) => void
  onLimitChange: (value: number) => void
  loading?: boolean
  error?: string | null
}

export function AttendanceHistoryView(props: AttendanceHistoryViewProps) {
  return (
    <main className={styles.page}>
      <div className={styles.wrap}>
        <button type="button" className={styles.backButton} onClick={props.onBack}><ArrowLeft size={19} />{props.backLabel}</button>
        <div className={styles.profileSummary}><AttendanceProfileSummary profile={props.profile} /></div>
        <div className={styles.summaryGrid}>
          <SummaryCard label="Days Present" value={props.summary.daysPresent} />
          <SummaryCard label="Days Absent" value={props.summary.daysAbsent} />
          <SummaryCard label="Rendered Hours" value={formatAttendanceWholeHours(props.summary.renderedMinutes)} />
          <SummaryCard label="Remaining Hours" value={formatAttendanceWholeHours(props.summary.remainingMinutes)} />
        </div>
        <div className={styles.toolbar}>
          <label className={styles.filter}><CalendarDays size={16} /><span className={styles.srOnly}>Attendance date</span><input type="date" value={props.date} onChange={(event) => props.onDateChange(event.target.value)} /></label>
          <label className={styles.filter}><SlidersHorizontal size={16} /><span className={styles.srOnly}>Attendance status</span><select value={props.status} onChange={(event) => props.onStatusChange(event.target.value)}><option value="">All</option><option value="present">Present</option><option value="absent">Absent</option><option value="incomplete">Incomplete</option></select></label>
        </div>
        <section className={styles.tableCard} aria-label="Attendance history">
          <div className={styles.tableScroller}>
            <table className={styles.table}>
              <thead><tr><th>Date</th><th>Clock In Time</th><th>Clock Out Time</th><th>Rendered Time</th><th>Attendance Status</th></tr></thead>
              <tbody>{props.records.map((record) => <tr key={record.id}><td>{formatAttendanceDate(record.date)}</td><td>{formatClockTime(record.timeIn)}</td><td>{formatClockTime(record.timeOut)}</td><td>{formatAttendanceDuration(record.renderedMinutes)}</td><td><StatusPill status={record.status} /></td></tr>)}</tbody>
            </table>
          </div>
          {props.loading && <p className={styles.message}>Loading attendance history...</p>}
          {props.error && <p className={`${styles.message} ${styles.error}`} role="alert">{props.error}</p>}
          {!props.loading && !props.error && props.records.length === 0 && <p className={styles.message}>No attendance records match the selected filters.</p>}
        </section>
        <TablePagination page={props.page} pageSize={props.limit} totalRecords={props.totalRecords} pageSizes={props.pageSizes} onPageChange={props.onPageChange} onPageSizeChange={props.onLimitChange} />
      </div>
    </main>
  )
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return <article className={styles.summaryCard}><h2>{label}</h2><p>{String(value).padStart(2, '0')}</p></article>
}

function StatusPill({ status }: { status: string }) {
  const normalized = status.toLowerCase()
  const label = normalized ? normalized[0].toUpperCase() + normalized.slice(1) : 'Unknown'
  return <span className={`${styles.statusPill} ${styles[normalized] ?? ''}`}>{label}</span>
}

function formatClockTime(value?: string | null): string {
  return value ? value.slice(0, 5) : '—'
}
