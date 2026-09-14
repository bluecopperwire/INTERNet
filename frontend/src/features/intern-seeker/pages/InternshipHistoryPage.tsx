import { useCallback, useEffect, useState } from 'react'
import { Eye, Search, SlidersHorizontal } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { AssignmentStatus, PageMeta, StudentInternshipDto } from '../../../types/api'
import { useAuthStore } from '../../../stores/useAuthStore'
import { getErrorMessage } from '../../../utils/error-message'
import { studentApiService } from '../services/student-api.service'
import { studentAssignmentStatus } from '../utils/internship-display'
import styles from './StudentInternshipPages.module.css'
import { TablePagination } from '../../../components/TablePagination'

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

  return (
    <section className={styles.historyPage} aria-labelledby="internship-history-heading">
      <h1 className={styles.srOnly} id="internship-history-heading">Internship History</h1>

      <div className={styles.historyToolbar}>
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
      </div>

      <div className={styles.historyCard}>
        <div className={styles.tableScroller}>
          <table className={styles.historyTable}>
            <thead><tr><th>Company</th><th>Job Title</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>{records.map((record) => {
              const label = studentAssignmentStatus(record.assignmentStatus)
              return <tr key={record.internshipAssignmentId}><td>{record.companyName}</td><td>{record.jobTitle}</td><td><StatusPill status={record.assignmentStatus} label={label} /></td><td><button className={styles.viewButton} type="button" onClick={() => navigate(`/intern-seeker/internship-history/${record.internshipAssignmentId}`)}><Eye size={15} />View</button></td></tr>
            })}</tbody>
          </table>
        </div>
        {error && <p className={`${styles.feedback} ${styles.inlineFeedback}`} role="alert">{error}</p>}
        {isLoading && <p className={`${styles.feedback} ${styles.inlineFeedback}`}>Loading internship history...</p>}
        {!isLoading && !error && records.length === 0 && <div className={styles.emptyHistory}><h2>No internship history found</h2><p>Try another company, job title, or status.</p></div>}
      </div>

      <TablePagination page={page} pageSize={limit} totalRecords={meta.total} pageSizes={PAGE_SIZES} onPageChange={setPage} onPageSizeChange={(value) => { setLimit(value); setPage(1) }} />
    </section>
  )
}

function StatusPill({ status, label }: { status: AssignmentStatus; label: string }) {
  const className = status === 'complete_company' || status === 'complete_student' ? 'completed' : status
  return <span className={`${styles.tableStatus} ${styles[className] ?? ''}`}>{label}</span>
}

export default InternshipHistoryPage
