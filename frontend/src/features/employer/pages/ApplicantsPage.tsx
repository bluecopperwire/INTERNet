import { useState, useEffect, useMemo } from 'react'
import { Search, SlidersHorizontal, ChevronLeft, ChevronRight, Eye } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { EmployerHero } from '../components/EmployerHero'
import { employerService } from '../services/employer.service'
import type { Applicant } from '../types/employer.types'
import styles from './ApplicantsPage.module.css'

export function ApplicantsPage() {
  const navigate = useNavigate()
  const [applicants, setApplicants] = useState<Applicant[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Pagination & Filtering state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(7)
  const [searchQuery, setSearchQuery] = useState('')
  
  const [statusFilter, setStatusFilter] = useState('All')

  useEffect(() => {
    employerService.getAllApplicants().then((data) => {
      setApplicants(data)
      setIsLoading(false)
    })
  }, [])

  // Extract unique values for filter dropdowns
  const uniqueStatuses = useMemo(() => ['All', ...new Set(applicants.map(a => a.status))], [applicants])

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

  if (isLoading) {
    return (
      <main className={styles.pageContainer}>
        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading Applicants...</div>
      </main>
    )
  }

  return (
    <main className={styles.pageContainer}>
      <EmployerHero
        title="Applicants"
        subtitle="Company applicant list monitoring"
        comfortableSpacing
      />

      <section className={styles.mainContent}>
        <div className={styles.toolbar}>
          <div className={styles.searchBox}>
            <Search size={18} color="#160e6f" />
            <input 
              type="text" 
              placeholder="Search applicants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className={styles.statusFilter}>
            <SlidersHorizontal size={18} aria-hidden="true" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter applicants by status">
              {uniqueStatuses.map((status) => <option key={status} value={status}>{status === 'All' ? 'All Statuses' : status}</option>)}
            </select>
          </div>
        </div>

        <div className={styles.tableCard}>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Opportunity</th>
                  <th>Course/Program</th>
                  <th>Year Level</th>
                  <th>Date Applied</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '24px' }}>No applicants found.</td>
                  </tr>
                ) : (
                  currentItems.map((app) => (
                    <tr key={app.id}>
                      <td>{app.name}</td>
                      <td>{app.opportunityTitle}</td>
                      <td>{app.course}</td>
                      <td>{app.yearLevel}</td>
                      <td>{app.dateApplied}</td>
                      <td>
                        <span className={`${styles.statusPill} ${
                          app.status === 'Accepted' || app.status === 'Shortlisted' ? styles.accepted :
                          app.status === 'Rejected' ? styles.rejected :
                          app.status === 'Under Review' || app.status === 'For Review' ? styles.underReview :
                          ''
                        }`}>
                          {app.status}
                        </span>
                      </td>
                      <td>
                        <button 
                          className={styles.reviewBtn}
                          onClick={() => navigate(`/employer/applicants/${app.id}`)}
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
        </div>

        <div className={styles.paginationRow}>
          <div className={styles.leftControls}>
            <span className={styles.viewLabel}>View</span>
            <div className={styles.viewSelectBox}>
              <select 
                className={styles.viewSelect}
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value))
                  setCurrentPage(1)
                }}
              >
                <option value={7}>7</option>
                <option value={10}>10</option>
                <option value={15}>15</option>
              </select>
            </div>
            <span className={styles.perPageLabel}>Students per page</span>
          </div>

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
      </section>

    </main>
  )
}

export default ApplicantsPage
