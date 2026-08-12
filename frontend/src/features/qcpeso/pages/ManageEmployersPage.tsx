import { useMemo, useState, useEffect } from 'react'
import { Briefcase, ChevronLeft, ChevronRight, Eye, Search } from 'lucide-react'
import headerImage from '../../../assets/requirements-header-image.png'
import { EmployerReviewModal } from '../components/EmployerReviewModal'
import { qcpesoService } from '../services/qcpeso.service'
import type { EmployerOpportunity } from '../types/qcpeso.types'
import styles from './ManageEmployersPage.module.css'

export function ManageEmployersPage() {
  const [employers, setEmployers] = useState<EmployerOpportunity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [itemsPerPage, setItemsPerPage] = useState<number>(7)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('All')
  const [selectedEmployer, setSelectedEmployer] = useState<EmployerOpportunity | null>(null)

  useEffect(() => {
    qcpesoService.getRecentEmployers().then((data) => {
      setEmployers(data)
      setIsLoading(false)
    })
  }, [])

  // Computed stats
  const activeCount = useMemo(
    () => employers.filter((e) => e.status === 'Active').length,
    [employers]
  )
  const totalOpportunities = useMemo(
    () => employers.reduce((sum, e) => sum + e.opportunities, 0),
    [employers]
  )
  const pendingCount = useMemo(
    () => employers.filter((e) => e.status === 'Pending').length,
    [employers]
  )

  // Filtering
  const filteredEmployers = useMemo(() => {
    return employers.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        item.rep.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        item.email.toLowerCase().includes(searchQuery.toLowerCase().trim())

      const matchesStatus =
        selectedStatus === 'All' || item.status === selectedStatus

      return matchesSearch && matchesStatus
    })
  }, [employers, searchQuery, selectedStatus])

  // Pagination
  const totalPages = Math.ceil(filteredEmployers.length / itemsPerPage) || 1
  const displayedEmployers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredEmployers.slice(start, start + itemsPerPage)
  }, [filteredEmployers, currentPage, itemsPerPage])

  const updateStatus = (id: string, newStatus: string) => {
    setEmployers((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: newStatus } : item
      )
    )
    if (selectedEmployer?.id === id) {
      setSelectedEmployer((prev) =>
        prev ? { ...prev, status: newStatus } : null
      )
    }
  }

  const handleApprove = (id: string) => updateStatus(id, 'Active')
  const handleReject = (id: string) => updateStatus(id, 'Rejected')

  const getStatusPillClass = (status: string) => {
    switch (status) {
      case 'Active':
        return styles.statusActive
      case 'Suspended':
        return styles.statusSuspended
      case 'Rejected':
        return styles.statusRejected
      default:
        return ''
    }
  }

  if (isLoading) {
    return (
      <main className={styles.pageContainer}>
        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading Employers...</div>
      </main>
    )
  }

  const BriefcaseBgIcon = ({ isWhite = false }: { isWhite?: boolean }) => (
    <svg 
      className={`${styles.bgIcon} ${isWhite ? styles.bgIconWhite : styles.bgIconBlue}`} 
      viewBox="0 0 64 64" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="3" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <rect x="10" y="24" width="44" height="30" rx="4" ry="4" />
      <path d="M42 24V14a2 2 0 0 0-2-2H24a2 2 0 0 0-2 2v10" />
      <line x1="10" y1="40" x2="54" y2="40" />
      <circle cx="32" cy="40" r="3" fill={isWhite ? "#ffffff" : "currentColor"} />
    </svg>
  )

  const DocumentsBgIcon = ({ isWhite = false }: { isWhite?: boolean }) => (
    <svg 
      className={`${styles.bgIcon} ${isWhite ? styles.bgIconWhite : styles.bgIconBlue}`} 
      viewBox="0 0 64 64" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="3" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M40 56H22a4 4 0 0 1-4-4V16a4 4 0 0 1 4-4h12l10 10v30a4 4 0 0 1-4 4z" />
      <path d="M26 40h12" />
      <path d="M26 48h12" />
      <path d="M52 56h-8V26l-10-10H30V12a4 4 0 0 1 4-4h12l10 10v34a4 4 0 0 1-4 4z" />
      <path d="M38 32h12" />
      <path d="M38 40h12" />
    </svg>
  )

  return (
    <main className={styles.pageContainer}>
      {/* Hero Header */}
      <header className={styles.heroHeader}>
        <img src={headerImage} alt="" className={styles.heroBgImage} />
        <div className={styles.heroOverlay} />
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>Employer Management</h1>
          <p className={styles.heroSubtitle}>QCPESO Employer Records & Opportunities</p>
        </div>
      </header>

      {/* Main Section */}
      <section className={styles.mainContent}>
        {/* Stats Cards */}
        <div className={styles.summaryGrid}>
          <div className={`${styles.summaryCard} ${styles.cardBlue}`}>
            <h3 className={styles.cardTitle}>Active Employers</h3>
            <p className={styles.cardValue}>{activeCount}</p>
            <BriefcaseBgIcon isWhite={false} />
          </div>
          <div className={`${styles.summaryCard} ${styles.cardBlue}`}>
            <h3 className={styles.cardTitle}>Total Opportunities</h3>
            <p className={styles.cardValue}>{totalOpportunities}</p>
            <DocumentsBgIcon isWhite={false} />
          </div>
          <div className={`${styles.summaryCard} ${styles.cardBlue}`}>
            <h3 className={styles.cardTitle}>Pending Applications</h3>
            <p className={styles.cardValue}>{pendingCount}</p>
            <DocumentsBgIcon isWhite={false} />
          </div>
        </div>

        {/* Search + Filter Toolbar */}
        <div className={styles.toolbarRow}>
          <div className={styles.filterGroup}>
            <div className={styles.searchBox}>
              <Search size={16} color="#160e6f" />
              <input
                type="text"
                placeholder="Search Employers..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
              />
            </div>
          </div>

          <div className={styles.filterGroup}>
            <select
              className={styles.filterSelect}
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value)
                setCurrentPage(1)
              }}
            >
              <option value="All">Filter</option>
              <option value="Active">Active</option>
              <option value="Pending">Pending</option>
              <option value="Suspended">Suspended</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className={styles.tableCard}>
          {displayedEmployers.length === 0 ? (
            <div className={styles.noData}>
              No employers found matching your filter criteria.
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Company Name</th>
                  <th>Representative Name</th>
                  <th>Email Address</th>
                  <th>Active Opportunities</th>
                  <th>Account Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {displayedEmployers.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong style={{ color: '#160e6f' }}>{item.name}</strong>
                    </td>
                    <td>{item.rep}</td>
                    <td>{item.email}</td>
                    <td>
                      <span className={styles.opportunitiesBadge}>
                        {item.opportunities}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`${styles.statusPill} ${getStatusPillClass(
                          item.status
                        )}`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className={styles.actionBtn}
                        onClick={() => setSelectedEmployer(item)}
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

        {/* Pagination */}
        <div className={styles.toolbarRow}>
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
              type="button"
              className={styles.pageBtn}
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              aria-label="Previous Page"
            >
              <ChevronLeft size={18} />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                type="button"
                className={`${styles.pageBtn} ${pageNum === currentPage ? styles.active : ''}`}
                onClick={() => setCurrentPage(pageNum)}
              >
                {pageNum}
              </button>
            ))}

            <button
              type="button"
              className={styles.pageBtn}
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Next Page"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* Detail Modal */}
      <EmployerReviewModal
        employer={selectedEmployer}
        isOpen={!!selectedEmployer}
        onClose={() => setSelectedEmployer(null)}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </main>
  )
}

export default ManageEmployersPage
