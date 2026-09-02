import { useState, useEffect, useMemo } from 'react'
import { X, Search, SlidersHorizontal, ChevronLeft, ChevronRight, Eye } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { employerService } from '../services/employer.service'
import type { Opportunity, Applicant } from '../types/employer.types'
import styles from './ViewApplicantsModal.module.css'
import { getErrorMessage } from '../../../utils/error-message'

interface ViewApplicantsModalProps {
  opportunity: Opportunity
  onClose: () => void
}

export function ViewApplicantsModal({ opportunity, onClose }: ViewApplicantsModalProps) {
  const [applicants, setApplicants] = useState<Applicant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const navigate = useNavigate()

  // Pagination & Filtering state
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 3
  const [searchQuery, setSearchQuery] = useState('')

  const [statusFilter, setStatusFilter] = useState('All')

  useEffect(() => {
    let active = true
    employerService.getApplicantsForOpportunity(opportunity.id)
      .then((data) => { if (active) setApplicants(data) })
      .catch((error: unknown) => { if (active) setLoadError(getErrorMessage(error, 'Failed to load referrals.')) })
      .finally(() => { if (active) setIsLoading(false) })
    return () => { active = false }
  }, [opportunity.id])

  const filteredApplicants = useMemo(() => {
    return applicants.filter((app) => {
      let matches = true

      if (searchQuery) {
        matches = matches && app.name.toLowerCase().includes(searchQuery.toLowerCase())
      }
      if (statusFilter !== 'All') {
        matches = matches && (app.historyStatus ?? app.status) === statusFilter
      }
      return matches
    })
  }, [applicants, searchQuery, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredApplicants.length / itemsPerPage))

  // Ensure current page is valid when filtering changes total pages
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1)
    }
  }, [totalPages, currentPage])

  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredApplicants.slice(indexOfFirstItem, indexOfLastItem)

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1)
  }

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1)
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Referrals</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={24} color="#160e6f" />
          </button>
        </div>

        <hr className={styles.divider} />

        <div className={styles.toolbar}>
          <div className={styles.searchBox}>
            <Search size={18} color="#160e6f" />
            <input
              type="text"
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className={styles.statusFilter}>
            <SlidersHorizontal size={16} aria-hidden="true" />
            <select
              aria-label="Filter referrals by status"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value)
                setCurrentPage(1)
              }}
            >
              <option value="All">All Statuses</option>
              {[...new Set(applicants.map((app) => app.historyStatus ?? app.status))].map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </div>
        </div>

        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Job Title</th>
                <th>Program / Strand</th>
                <th>Application Date</th>
                <th>Referral Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '24px' }}>Loading referrals...</td>
                </tr>
              ) : loadError ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '24px' }} role="alert">{loadError}</td></tr>
              ) : currentItems.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '24px' }}>No referrals found.</td>
                </tr>
              ) : (
                currentItems.map((app) => (
                  <tr key={app.id}>
                    <td>{app.name}</td>
                    <td>{app.opportunityTitle}</td>
                    <td>{app.course}</td>
                    <td>{app.applicationDate}</td>
                    <td>{app.referralDate}</td>
                    <td>
                      <span className={`${styles.statusPill} ${
                        (app.historyStatus ?? app.status).includes('Accepted') ? styles.accepted :
                        ['Rejected', 'Withdrawn', 'Expired', 'Declined'].some((value) => (app.historyStatus ?? app.status).includes(value)) ? styles.rejected :
                        styles.underReview
                      }`}>
                        {app.historyStatus ?? app.status}
                      </span>
                    </td>
                    <td>
                      <button className={styles.reviewBtn} onClick={() => navigate(`/employer/referrals-history/${app.id}?from=opportunity&opportunityId=${opportunity.id}`)}><Eye size={16} /><span>View</span></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className={styles.paginationRow}>
          <div className={styles.pagination}>
            <button
              className={styles.pageBtn}
              onClick={handlePrevPage}
              disabled={currentPage === 1}
            >
              <ChevronLeft size={16} />
            </button>
            <button className={`${styles.pageBtn} ${styles.active}`}>
              {currentPage}
            </button>
            <button
              className={styles.pageBtn}
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
      
    </div>
  )
}
