import { useMemo, useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Eye, Search, SlidersHorizontal } from 'lucide-react'
import QCPesoHero from '../components/QCPesoHero'
import ReferralDetailModal from '../components/ReferralDetailModal'
import { qcpesoService } from '../services/qcpeso.service'
import type { ReferralItem, ReferralStatus } from '../types/qcpeso.types'
import styles from './MonitorReferralsPage.module.css'

export function MonitorReferralsPage() {
  const [referrals, setReferrals] = useState<ReferralItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [itemsPerPage, setItemsPerPage] = useState<number>(7)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('All')
  const [selectedReferral, setSelectedReferral] = useState<ReferralItem | null>(null)

  useEffect(() => {
    qcpesoService.getReferrals().then((data) => {
      setReferrals(data)
      setIsLoading(false)
    })
  }, [])

  // Filtering
  const filteredReferrals = useMemo(() => {
    return referrals.filter((item) => {
      const matchesSearch =
        item.studentName.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        item.targetEmployer.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        item.position.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        item.email.toLowerCase().includes(searchQuery.toLowerCase().trim())

      const matchesStatus =
        selectedStatus === 'All' || item.status === selectedStatus

      return matchesSearch && matchesStatus
    })
  }, [referrals, searchQuery, selectedStatus])

  // Pagination
  const totalPages = Math.ceil(filteredReferrals.length / itemsPerPage) || 1
  const displayedReferrals = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredReferrals.slice(start, start + itemsPerPage)
  }, [filteredReferrals, currentPage, itemsPerPage])

  const handleApprove = (id: string) => {
    setReferrals((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: 'Endorsed to Employer' as ReferralStatus } : item
      )
    )
    if (selectedReferral?.id === id) {
      setSelectedReferral((prev) => (prev ? { ...prev, status: 'Endorsed to Employer' } : null))
    }
  }

  const handleReject = (id: string) => {
    setReferrals((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: 'Rejected' as ReferralStatus } : item
      )
    )
    if (selectedReferral?.id === id) {
      setSelectedReferral((prev) => (prev ? { ...prev, status: 'Rejected' } : null))
    }
  }

  const getStatusPillClass = (status: string) => {
    switch (status) {
      case 'Approved':
        return styles.approved
      case 'Endorsed to Employer':
        return styles.endorsed
      case 'Rejected':
        return styles.rejected
      default:
        return ''
    }
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
      <QCPesoHero title="Monitor User" subtitle="QCPESO Referral Monitoring" />

      {/* Main Section */}
      <section className={styles.mainContent}>
        {/* Search and status filters */}
        <div className={styles.toolbarRow}>
          <div className={`${styles.filterGroup} ${styles.searchGroup}`}>
            <div className={styles.searchBox}>
              <Search size={16} color="#160e6f" />
              <input
                type="text"
                placeholder="Search student or employer..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
              />
            </div>
          </div>

          <div className={`${styles.filterGroup} ${styles.statusFilterGroup}`}>
            <div className={styles.filterSelect}>
              <SlidersHorizontal size={16} aria-hidden="true" />
              <select value={selectedStatus} onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1) }}>
                <option value="All">All Statuses</option>
                <option value="Under Review">Under Review</option>
                <option value="Endorsed to Employer">Endorsed to Employer</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table Container */}
        <div className={styles.tableCard}>
          {displayedReferrals.length === 0 ? (
            <div className={styles.noData}>
              No referral applications found matching your filter criteria.
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Target Employer</th>
                  <th>Position</th>
                  <th>Date Forwarded</th>
                  <th>Referral Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {displayedReferrals.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong style={{ color: '#160e6f' }}>{item.studentName}</strong>
                    </td>
                    <td>{item.targetEmployer}</td>
                    <td>{item.position}</td>
                    <td>{item.dateForwarded}</td>
                    <td>
                      <span className={`${styles.statusPill} ${getStatusPillClass(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={styles.actionBtn}
                        onClick={() => setSelectedReferral(item)}
                      >
                        <Eye size={14} />
                        <span>Review</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Page size and navigation */}
        <div className={styles.toolbarRow}>
          <div className={styles.leftControls}>
            <span className={styles.viewLabel}>View</span>
            <div className={styles.viewSelectBox}>
              <select className={styles.viewSelect} value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1) }}>
                <option value={7}>7</option>
                <option value={10}>10</option>
                <option value={15}>15</option>
              </select>
            </div>
            <span className={styles.perPageLabel}>Students per page</span>
          </div>

          <div className={styles.pagination}>
            <button type="button" className={styles.pageBtn} disabled={currentPage === 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} aria-label="Previous Page">
              <ChevronLeft size={18} />
            </button>
            {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
              <button key={pageNumber} type="button" className={`${styles.pageBtn} ${pageNumber === currentPage ? styles.active : ''}`} onClick={() => setCurrentPage(pageNumber)}>{pageNumber}</button>
            ))}
            <button type="button" className={styles.pageBtn} disabled={currentPage === totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} aria-label="Next Page">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* Expand / Pop-up Detail Modal */}
      <ReferralDetailModal
        referral={selectedReferral}
        onClose={() => setSelectedReferral(null)}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </main>
  )
}

export default MonitorReferralsPage
