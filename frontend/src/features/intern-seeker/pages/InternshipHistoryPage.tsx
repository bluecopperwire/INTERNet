import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { PageMeta, StudentInternshipDto } from '../../../types/api'
import { useAuthStore } from '../../../stores/useAuthStore'
import { getErrorMessage } from '../../../utils/error-message'
import { studentApiService } from '../services/student-api.service'
import { studentAssignmentStatus } from '../utils/internship-display'
import styles from './StudentInternshipPages.module.css'

const PAGE_SIZES = [5, 10, 15]

function InternshipHistoryPage() {
  const studentId = useAuthStore((state) => state.user?.studentId)
  const navigate = useNavigate()
  const [records, setRecords] = useState<StudentInternshipDto[]>([])
  const [meta, setMeta] = useState<PageMeta>({
    page: 1,
    limit: 5,
    total: 0,
    totalPages: 1,
  })
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
      const response = await studentApiService.getInternshipHistory(studentId, page, limit)
      setRecords(response.data)
      setMeta(response.meta)
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError, 'Unable to load internship history.'))
      setRecords([])
    } finally {
      setIsLoading(false)
    }
  }, [limit, page, studentId])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadHistory(), 0)
    return () => window.clearTimeout(timeoutId)
  }, [loadHistory])

  return (
    <section className={styles.historyCard} aria-labelledby="internship-history-heading">
      <header className={styles.historyHeader}>
        <div>
          <h1 id="internship-history-heading">Internship History</h1>
          <p>View every internship assignment from creation onward.</p>
        </div>
      </header>
      {error && (
        <p className={styles.feedback} role="alert">
          {error}
        </p>
      )}
      {isLoading && <p className={styles.feedback}>Loading internship history...</p>}
      {!isLoading && !error && records.length === 0 && (
        <div className={styles.emptyHistory}>
          <h2>No internship history yet</h2>
          <p>There are currently no internship records to display.</p>
        </div>
      )}
      {!isLoading && !error && records.length > 0 && (
        <>
          <div className={styles.tableScroller}>
            <table className={styles.historyTable}>
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Job Title</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.internshipAssignmentId}>
                    <td>{record.companyName}</td>
                    <td>{record.jobTitle}</td>
                    <td>
                      <span className={styles.tableStatus}>{studentAssignmentStatus(record.assignmentStatus)}</span>
                    </td>
                    <td>
                      <button className={styles.viewButton} type="button" onClick={() => navigate(`/intern-seeker/internship-history/${record.internshipAssignmentId}`)}>
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.pagination}>
            <label>
              Rows per page{' '}
              <select
                value={limit}
                onChange={(event) => {
                  setLimit(Number(event.target.value))
                  setPage(1)
                }}
              >
                {PAGE_SIZES.map((size) => (
                  <option value={size} key={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
            <span>
              Page {meta.page} of {meta.totalPages}
            </span>
            <div>
              <button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
                Previous
              </button>
              <button type="button" disabled={page >= meta.totalPages} onClick={() => setPage((current) => current + 1)}>
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  )
}

export default InternshipHistoryPage
