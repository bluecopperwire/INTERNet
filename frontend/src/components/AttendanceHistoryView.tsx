import { ArrowLeft, CalendarDays, SlidersHorizontal } from 'lucide-react'
import { formatAttendanceDate, formatAttendanceDuration, formatAttendanceWholeHours } from '../utils/attendance-format'
import { AttendanceProfileSummary, type AttendanceProfileSummaryData } from './AttendanceProfileSummary'
import { DataTable, type DataTableColumn } from './DataTable'
import { StatusBadge, TableCellStack } from './TablePrimitives'
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
  const columns: DataTableColumn<AttendanceHistoryRecordView>[] = [
    { key: 'date', header: 'Date', render: (record) => formatAttendanceDate(record.date) },
    { key: 'time', header: 'Time', render: (record) => <TableCellStack primary={`In: ${formatClockTime(record.timeIn)}`} secondary={`Out: ${formatClockTime(record.timeOut)}`} /> },
    { key: 'rendered', header: 'Rendered', render: (record) => formatAttendanceDuration(record.renderedMinutes) },
    { key: 'status', header: 'Status', align: 'center', render: (record) => <StatusBadge value={attendanceStatusLabel(record.status)} /> },
  ]
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
        <DataTable ariaLabel="Attendance history" columns={columns} rows={props.records} rowKey={(record) => record.id} minWidth={700} loading={props.loading} error={props.error || undefined} emptyMessage="No attendance records are available yet." filteredEmptyMessage="No attendance records match the selected filters." hasActiveFilters={Boolean(props.date || props.status)} footer={<TablePagination page={props.page} pageSize={props.limit} totalRecords={props.totalRecords} pageSizes={props.pageSizes} onPageChange={props.onPageChange} onPageSizeChange={props.onLimitChange} />} />
      </div>
    </main>
  )
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return <article className={styles.summaryCard}><h2>{label}</h2><p>{String(value).padStart(2, '0')}</p></article>
}

function attendanceStatusLabel(status: string) {
  const normalized = status.toLowerCase()
  return normalized ? normalized[0].toUpperCase() + normalized.slice(1) : 'Unknown'
}

function formatClockTime(value?: string | null): string {
  if (!value) return '—'
  const [hours, minutes] = value.slice(0, 5).split(':').map(Number)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value
  return new Date(2000, 0, 1, hours, minutes).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })
}
