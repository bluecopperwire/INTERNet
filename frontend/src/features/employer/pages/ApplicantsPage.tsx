import { useState, useEffect, useMemo } from 'react'
import { Search, SlidersHorizontal, ChevronLeft, ChevronRight, Eye, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { EmployerHero } from '../components/EmployerHero'
import { employerService } from '../services/employer.service'
import type { Applicant } from '../types/employer.types'
import styles from './ApplicantsPage.module.css'
import { ConfirmDeleteModal } from '../../../components/feedback/ConfirmDeleteModal'
import { useToastStore } from '../../../stores/useToastStore'
import { getErrorMessage } from '../../../utils/error-message'
import { openReferralForReview } from '../services/employer-review-flow'
import {
  REFERRAL_CLOSED_STATUSES,
  REFERRAL_HISTORY_STATUSES,
  REFERRAL_ONGOING_STATUSES,
} from '../../workflow/status-mappings'

export function ApplicantsPage() {
  const navigate = useNavigate()
  const [applicants, setApplicants] = useState<Applicant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const toast = useToastStore()

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
  const uniqueStatuses = ['All', 'For Review', 'Under Review', 'For Interview']

  const filteredApplicants = useMemo(() => {
    return applicants.filter((app) => {
      let matches = true

      if (searchQuery) {
        matches = matches && `${app.name} ${app.opportunityTitle} ${app.course}`.toLowerCase().includes(searchQuery.toLowerCase())
      }
      if (statusFilter !== 'All') {
        matches = matches && app.reviewStatus === statusFilter
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

  const handleOpenReferral = async (referral: Applicant) => {
    await openReferralForReview(referral, {
      markUnderReview: employerService.markApplicantUnderReview,
      navigate,
      onMutationError: (error) => toast.error(getErrorMessage(error, 'Failed to start referral review.')),
    })
  }

  if (isLoading) {
    return (
      <main className={styles.pageContainer}>
        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading Referrals...</div>
      </main>
    )
  }

  return (
    <main className={styles.pageContainer}>
      <EmployerHero
        title="Review Referrals"
        subtitle="Review student referrals endorsed to your company."
        comfortableSpacing
      />

      <section className={styles.mainContent}>
        <div className={styles.toolbar}>
          <div className={styles.searchBox}>
            <Search size={18} color="#160e6f" />
            <input 
              type="text" 
              placeholder="Search referrals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className={styles.statusFilter}>
            <SlidersHorizontal size={18} aria-hidden="true" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter referrals by status">
              {uniqueStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </div>
        </div>

        <div className={styles.tableCard}>
          <div className={styles.tableWrapper}>
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
                {currentItems.length === 0 ? (
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
                          app.reviewStatus === 'For Interview' ? styles.underReview :
                          ['Under Review', 'For Review'].includes(app.reviewStatus ?? '') ? styles.underReview :
                          ''
                        }`}>
                          {app.reviewStatus}
                        </span>
                      </td>
                      <td>
                        <div className={styles.actionButtons}>
                          <button className={styles.reviewBtn} onClick={() => void handleOpenReferral(app)}>
                            <Eye size={16} />
                            <span>Review</span>
                          </button>
                        </div>
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

export function ReferralsHistoryPage() {
  const navigate = useNavigate()
  const toast = useToastStore()
  const [referrals, setReferrals] = useState<Applicant[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('All')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(7)
  const [deleteTarget, setDeleteTarget] = useState<Applicant | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    employerService.getReferralHistory().then(setReferrals)
  }, [])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return referrals.filter((referral) => {
      const matchesSearch = !query ||
        `${referral.name} ${referral.opportunityTitle} ${referral.course} ${referral.historyStatus}`
          .toLowerCase().includes(query)
      const matchesStatus = status === 'All' ||
        (status === 'Ongoing' && REFERRAL_ONGOING_STATUSES.includes(referral.historyStatus ?? 'For Review (Employer)')) ||
        (status === 'Closed' && REFERRAL_CLOSED_STATUSES.includes(referral.historyStatus ?? 'For Review (Employer)')) ||
        referral.historyStatus === status
      return matchesSearch && matchesStatus
    })
  }, [referrals, search, status])

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const rows = filtered.slice((page - 1) * perPage, page * perPage)

  useEffect(() => {
    if (page > totalPages) setPage(1)
  }, [page, totalPages])

  const deleteReferral = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await employerService.deleteReferral(deleteTarget.id)
      setReferrals((current) => current.filter((item) => item.id !== deleteTarget.id))
      setDeleteTarget(null)
      toast.success('Referral deleted.')
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to delete referral.'))
    } finally {
      setIsDeleting(false)
    }
  }

  return <main className={styles.pageContainer}>
    <EmployerHero title="Referrals History" subtitle="View the complete lifecycle of every referral sent to your company." comfortableSpacing />
    <section className={styles.mainContent}>
      <div className={styles.toolbar}>
        <div className={styles.searchBox}><Search size={18} color="#160e6f" /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Search referrals..." /></div>
        <div className={styles.statusFilter}><SlidersHorizontal size={18} /><select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }} aria-label="Filter referral history by status"><option value="All">All</option><option>Ongoing</option><option>Closed</option>{REFERRAL_HISTORY_STATUSES.map((value) => <option key={value}>{value}</option>)}</select></div>
      </div>
      <div className={styles.tableCard}><div className={styles.tableWrapper}><table className={styles.table}>
        <thead><tr><th>Student Name</th><th>Job Title</th><th>Program / Strand</th><th>Application Date</th><th>Referral Date</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>{rows.length === 0 ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24 }}>No referral history found.</td></tr> : rows.map((referral) => <tr key={referral.id}>
          <td>{referral.name}</td><td>{referral.opportunityTitle}</td><td>{referral.course}</td><td>{referral.applicationDate}</td><td>{referral.referralDate}</td>
          <td><span className={`${styles.statusPill} ${REFERRAL_CLOSED_STATUSES.includes(referral.historyStatus ?? 'For Review (Employer)') ? styles.rejected : styles.underReview}`}>{referral.historyStatus}</span></td>
          <td><div className={styles.actionButtons}><button className={styles.reviewBtn} onClick={() => navigate(`/employer/referrals-history/${referral.id}`)}><Eye size={16} />View</button>{referral.canHide && <button className={styles.deleteBtn} onClick={() => setDeleteTarget(referral)}><Trash2 size={16} />Delete</button>}</div></td>
        </tr>)}</tbody>
      </table></div></div>
      <div className={styles.paginationRow}><div className={styles.leftControls}><span className={styles.viewLabel}>View</span><div className={styles.viewSelectBox}><select className={styles.viewSelect} value={perPage} onChange={(event) => { setPerPage(Number(event.target.value)); setPage(1) }}><option value={7}>7</option><option value={10}>10</option><option value={15}>15</option></select></div><span className={styles.perPageLabel}>Students per page</span></div><div className={styles.pagination}><button className={styles.pageBtn} disabled={page === 1} onClick={() => setPage((current) => current - 1)}><ChevronLeft size={16} /></button><button className={`${styles.pageBtn} ${styles.active}`}>{page}</button><button className={styles.pageBtn} disabled={page === totalPages} onClick={() => setPage((current) => current + 1)}><ChevronRight size={16} /></button></div></div>
    </section>
    {deleteTarget && <ConfirmDeleteModal subject={`${deleteTarget.name}'s referral`} isDeleting={isDeleting} onClose={() => setDeleteTarget(null)} onConfirm={() => void deleteReferral()} />}
  </main>
}

export default ApplicantsPage
