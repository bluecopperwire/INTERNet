import { useState, useEffect, useMemo } from 'react'
import { X, Search, SlidersHorizontal, ChevronLeft, ChevronRight, Eye } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { employerService } from '../services/employer.service'
import type { Opportunity, Applicant } from '../types/employer.types'
import styles from './ViewApplicantsModal.module.css'

interface ViewApplicantsModalProps {
  opportunity: Opportunity
  onClose: () => void
}

export function ViewApplicantsModal({ opportunity, onClose }: ViewApplicantsModalProps) {
  const [applicants, setApplicants] = useState<Applicant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  // Pagination & Filtering state
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 3
  const [searchQuery, setSearchQuery] = useState('')

  const [statusFilter, setStatusFilter] = useState('All')

  useEffect(() => {
    employerService.getApplicantsForOpportunity(opportunity.id).then((data) => {
      setApplicants(data)
      setIsLoading(false)
    })
  }, [opportunity.id])

  const filteredApplicants = useMemo(() => {
    return applicants.filter((app) => {
      let matches = true

      if (searchQuery) {
        matches = matches && app.name.toLowerCase().includes(searchQuery.toLowerCase())
      }
      if (statusFilter !== 'All') {
        matches = matches && app.status === statusFilter
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
          <h2 className={styles.modalTitle}>Applicants</h2>
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
              aria-label="Filter applicants by status"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value)
                setCurrentPage(1)
              }}
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Accepted">Accepted</option>
              <option value="For Interview">For Interview</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>

        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Job Title</th>
                <th>Program/Strand</th>
                <th>Date Applied</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '24px' }}>Loading applicants...</td>
                </tr>
              ) : currentItems.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '24px' }}>No applicants found.</td>
                </tr>
              ) : (
                currentItems.map((app) => (
                  <tr key={app.id}>
                    <td>{app.name}</td>
                    <td>{app.opportunityTitle}</td>
                    <td>{app.course}</td>
                    <td>{app.dateApplied}</td>
                    <td>
                      <span className={`${styles.statusPill} ${
                        app.status === 'Accepted' ? styles.accepted :
                        app.status === 'Rejected' ? styles.rejected :
                        app.status === 'For Interview' ? styles.underReview :
                        ''
                      }`}>
                        {app.status}
                      </span>
                    </td>
                    <td>
                      <button 
                        className={styles.reviewBtn}
                        onClick={() => navigate(`/employer/applicants/${app.id}?from=opportunity&opportunityId=${opportunity.id}`)}
                      >
                        <Eye size={16} />
                        <span>Review</span>
                      </button>
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
