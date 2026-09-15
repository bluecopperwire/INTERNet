import { useCallback, useEffect, useState } from 'react'
import { Eye, Search, SlidersHorizontal } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { PageMeta, StudentInternshipDto } from '../../../types/api'
import { DataTable, type DataTableColumn } from '../../../components/DataTable'
import { StatusBadge, TableActions, TableCellStack } from '../../../components/TablePrimitives'
import { useAuthStore } from '../../../stores/useAuthStore'
import { getErrorMessage } from '../../../utils/error-message'
import { studentApiService } from '../services/student-api.service'
import { studentAssignmentStatus } from '../utils/internship-display'
import styles from './StudentInternshipPages.module.css'
import { TablePagination } from '../../../components/TablePagination'
import { TableToolbar } from '../../../components/TableToolbar'

const PAGE_SIZES = [5, 10, 15]
type HistoryStatus = '' | 'pending' | 'ongoing' | 'completed' | 'withdrawn' | 'cancelled' | 'finalized'

function InternshipHistoryPage() {
  const studentId = useAuthStore((state) => state.user?.studentId)
  const navigate = useNavigate()
  const [records, setRecords] = useState<StudentInternshipDto[]>([])
  const [meta, setMeta] = useState<PageMeta>({ page: 1, limit: 5, total: 0, totalPages: 1 })
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<HistoryStatus>('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(5)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadHistory = useCallback(async () => {
    if (!studentId) {
      setError('Student profile is unavailable.')
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const response = await studentApiService.getInternshipHistory(studentId, page, limit, {
        search: search.trim() || undefined,
        status: status || undefined,
      })
      setRecords(response.data)
      setMeta(response.meta)
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError, 'Unable to load internship history.'))
      setRecords([])
    } finally {
      setIsLoading(false)
    }
  }, [limit, page, search, status, studentId])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadHistory(), 0)
    return () => window.clearTimeout(timeoutId)
  }, [loadHistory])

  const beginFilter = () => setPage(1)
  const columns: DataTableColumn<StudentInternshipDto>[] = [
    { key: 'placement', header: 'Placement', render: (record) => <TableCellStack primary={record.jobTitle} secondary={record.companyName} /> },
    { key: 'period', header: 'Period', render: (record) => <TableCellStack primary={`Start: ${formatDate(record.startDate)}`} secondary={`End: ${formatDate(record.endDate || record.expectedEndDate)}`} /> },
    { key: 'progress', header: 'Progress', render: (record) => <TableCellStack primary={`${formatMinutes(record.renderedMinutes)} rendered`} secondary={`${formatMinutes(record.requiredMinutes)} required · ${formatMinutes(record.remainingMinutes)} remaining`} /> },
    { key: 'status', header: 'Status', align: 'center', render: (record) => <StatusBadge value={studentAssignmentStatus(record.assignmentStatus)} /> },
    { key: 'actions', header: 'Actions', align: 'center', headerAlign: 'center', render: (record) => <TableActions><button className={styles.viewButton} type="button" onClick={() => navigate(`/intern-seeker/internship-history/${record.internshipAssignmentId}`)} aria-label={`View ${record.companyName} internship`}><Eye size={15} aria-hidden="true" />View</button></TableActions> },
  ]

  return (
    <section className={styles.historyPage} aria-labelledby="internship-history-heading">
      <h1 className={styles.srOnly} id="internship-history-heading">Internship History</h1>

      <TableToolbar className={styles.historyToolbar} hasActiveFilters={Boolean(search.trim()) || Boolean(status)} onClearFilters={() => { setSearch(''); setStatus(''); setPage(1) }}>
        <label className={styles.searchBox}>
          <Search size={17} />
          <span className={styles.srOnly}>Search internship history</span>
          <input value={search} onChange={(event) => { setSearch(event.target.value); beginFilter() }} placeholder="Search company or job title..." />
        </label>
        <label className={styles.statusFilter}>
          <SlidersHorizontal size={16} />
          <span className={styles.srOnly}>Filter internship status</span>
          <select value={status} onChange={(event) => { setStatus(event.target.value as HistoryStatus); beginFilter() }}>
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
            <option value="withdrawn">Withdrawn</option>
            <option value="cancelled">Cancelled</option>
            <option value="finalized">Finalized</option>
          </select>
        </label>
      </TableToolbar>

      <DataTable ariaLabel="My internship history" columns={columns} rows={records} rowKey={(record) => record.internshipAssignmentId} minWidth={940} loading={isLoading} error={error || undefined} onRetry={() => void loadHistory()} emptyMessage="No internship history is available yet." filteredEmptyMessage="No internships match the selected filters." hasActiveFilters={Boolean(search.trim()) || Boolean(status)} footer={<TablePagination page={page} pageSize={limit} totalRecords={meta.total} pageSizes={PAGE_SIZES} onPageChange={setPage} onPageSizeChange={(value) => { setLimit(value); setPage(1) }} />} />
    </section>
  )
}

function formatMinutes(value: number) {
  const minutes = Math.max(0, Math.round(value || 0))
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00+08:00` : value)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default InternshipHistoryPage
