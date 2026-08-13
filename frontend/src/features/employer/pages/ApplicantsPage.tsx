import { useState, useEffect, useMemo } from 'react'
import { Search, SlidersHorizontal, ChevronLeft, ChevronRight } from 'lucide-react'
import { EmployerHero } from '../components/EmployerHero'
import { ReviewApplicantModal } from '../components/ReviewApplicantModal'
import { employerService } from '../services/employer.service'
import type { Applicant } from '../types/employer.types'
import styles from './ApplicantsPage.module.css'

export function ApplicantsPage() {
  const [applicants, setApplicants] = useState<Applicant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [applicantToReview, setApplicantToReview] = useState<Applicant | null>(null)

  // Pagination & Filtering state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(7)
  const [searchQuery, setSearchQuery] = useState('')
  
  const [showFilterMenu, setShowFilterMenu] = useState(false)
  const [statusFilter, setStatusFilter] = useState('All')
  const [opportunityFilter, setOpportunityFilter] = useState('All')
  const [courseFilter, setCourseFilter] = useState('All')
  const [yearLevelFilter, setYearLevelFilter] = useState('All')

  useEffect(() => {
    employerService.getAllApplicants().then((data) => {
      setApplicants(data)
      setIsLoading(false)
    })
  }, [])

  // Extract unique values for filter dropdowns
  const uniqueStatuses = useMemo(() => ['All', ...new Set(applicants.map(a => a.status))], [applicants])
  const uniqueOpportunities = useMemo(() => ['All', ...new Set(applicants.map(a => a.opportunityTitle))], [applicants])
  const uniqueCourses = useMemo(() => ['All', ...new Set(applicants.map(a => a.course))], [applicants])
  const uniqueYearLevels = useMemo(() => ['All', ...new Set(applicants.map(a => a.yearLevel))], [applicants])

  const filteredApplicants = useMemo(() => {
    return applicants.filter((app) => {
      let matches = true

      if (searchQuery) {
        matches = matches && app.name.toLowerCase().includes(searchQuery.toLowerCase())
      }
      if (statusFilter !== 'All') {
        matches = matches && app.status === statusFilter
      }
      if (opportunityFilter !== 'All') {
        matches = matches && app.opportunityTitle === opportunityFilter
      }
      if (courseFilter !== 'All') {
        matches = matches && app.course === courseFilter
      }
      if (yearLevelFilter !== 'All') {
        matches = matches && app.yearLevel === yearLevelFilter
      }

      return matches
    })
  }, [applicants, searchQuery, statusFilter, opportunityFilter, courseFilter, yearLevelFilter])

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

  // Summary counts
  const totalApplicantsCount = filteredApplicants.length
  const forReviewCount = filteredApplicants.filter(a => a.status === 'For Review' || a.status === 'Under Review').length
  const shortlistedCount = filteredApplicants.filter(a => a.status === 'Shortlisted').length
  const rejectedCount = filteredApplicants.filter(a => a.status === 'Rejected').length

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
        title="Applicant"
        subtitle="Company applicant list monitoring"
        comfortableSpacing
      />

      <section className={styles.mainContent}>
        {/* Summary Cards */}
        <div className={styles.summaryGrid}>
          <div className={styles.summaryCard}>
            <h3 className={styles.cardTitle}>Total Applicants</h3>
            <p className={styles.cardValue}>{totalApplicantsCount.toString().padStart(2, '0')}</p>
          </div>
          <div className={styles.summaryCard}>
            <h3 className={styles.cardTitle}>For Review</h3>
            <p className={styles.cardValue}>{forReviewCount.toString().padStart(2, '0')}</p>
          </div>
          <div className={styles.summaryCard}>
            <h3 className={styles.cardTitle}>Shortlisted</h3>
            <p className={styles.cardValue}>{shortlistedCount.toString().padStart(2, '0')}</p>
          </div>
          <div className={styles.summaryCard}>
            <h3 className={styles.cardTitle}>Rejected</h3>
            <p className={styles.cardValue}>{rejectedCount.toString().padStart(2, '0')}</p>
          </div>
        </div>

        {/* Table Container */}
        <div className={styles.tableCard}>
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
            
            <button 
              className={styles.filterBtn}
              onClick={() => setShowFilterMenu(!showFilterMenu)}
            >
              <SlidersHorizontal size={18} color="#160e6f" />
              <span>Filter</span>
            </button>
          </div>

          {showFilterMenu && (
            <div className={styles.filterMenuRow}>
              <div className={styles.filterWrapper}>
                <span className={styles.filterLabel}>Status:</span>
                <select className={styles.filterSelect} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  {uniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className={styles.filterWrapper}>
                <span className={styles.filterLabel}>Opportunity:</span>
                <select className={styles.filterSelect} value={opportunityFilter} onChange={(e) => setOpportunityFilter(e.target.value)}>
                  {uniqueOpportunities.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div className={styles.filterWrapper}>
                <span className={styles.filterLabel}>Course/Program:</span>
                <select className={styles.filterSelect} value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}>
                  {uniqueCourses.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className={styles.filterWrapper}>
                <span className={styles.filterLabel}>Year Level:</span>
                <select className={styles.filterSelect} value={yearLevelFilter} onChange={(e) => setYearLevelFilter(e.target.value)}>
                  {uniqueYearLevels.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
          )}

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
                  <th></th>
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
                          onClick={() => setApplicantToReview(app)}
                        >
                          Review
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
            <span className={styles.pageInfo}>of {totalPages}</span>
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

      {applicantToReview && (
        <ReviewApplicantModal 
          applicant={applicantToReview} 
          onClose={() => setApplicantToReview(null)} 
          onStatusChange={(newStatus) => {
            setApplicants(prev => prev.map(a => 
              a.id === applicantToReview.id ? { ...a, status: newStatus as any } : a
            ))
            setApplicantToReview(prev => prev ? { ...prev, status: newStatus as any } : null)
          }}
        />
      )}
    </main>
  )
}

export default ApplicantsPage
