import { useMemo, useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Eye, Search } from 'lucide-react'
import headerImage from '../../../assets/requirements-header-image.png'
import InternDetailModal from '../components/InternDetailModal'
import { qcpesoService } from '../services/qcpeso.service'
import type { InternItem } from '../types/qcpeso.types'
import styles from './MonitorInternsPage.module.css'

export function MonitorInternsPage() {
  const [interns, setInterns] = useState<InternItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [itemsPerPage, setItemsPerPage] = useState<number>(7)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('All')
  const [selectedIntern, setSelectedIntern] = useState<InternItem | null>(null)

  useEffect(() => {
    qcpesoService.getInterns().then((data) => {
      setInterns(data)
      setIsLoading(false)
    })
  }, [])

  // Filtering
  const filteredInterns = useMemo(() => {
    return interns.filter((item) => {
      const matchesSearch =
        item.studentName.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        item.matchedEmployer.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        item.acceptedRole.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        item.email.toLowerCase().includes(searchQuery.toLowerCase().trim())

      const matchesStatus =
        selectedStatus === 'All' || item.status === selectedStatus

      return matchesSearch && matchesStatus
    })
  }, [interns, searchQuery, selectedStatus])

  // Pagination
  const totalPages = Math.ceil(filteredInterns.length / itemsPerPage) || 1
  const displayedInterns = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredInterns.slice(start, start + itemsPerPage)
  }, [filteredInterns, currentPage, itemsPerPage])

  const getStatusPillClass = (status: string) => {
    switch (status) {
      case 'Completed':
        return styles.completed
      case 'Paused':
        return styles.paused
      default:
        return ''
    }
  }

  if (isLoading) {
    return (
      <main className={styles.pageContainer}>
        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading Interns...</div>
      </main>
    )
  }

  return (
    <main className={styles.pageContainer}>
      {/* Hero Header matching design spec */}
      <header className={styles.heroHeader}>
        <img src={headerImage} alt="" className={styles.heroBgImage} />
        <div className={styles.heroOverlay} />
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>Monitor User</h1>
          <p className={styles.heroSubtitle}>QCPESO Intern Monitoring</p>
        </div>
      </header>

      {/* Main Section */}
      <section className={styles.mainContent}>
        {/* Controls Toolbar */}
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

            <div className={styles.filterGroup}>
              <select
                className={styles.filterSelect}
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value)
                  setCurrentPage(1)
                }}
              >
                <option value="All">All Statuses</option>
                <option value="Ongoing">Ongoing</option>
                <option value="Completed">Completed</option>
                <option value="Paused">Paused</option>
              </select>
            </div>
          </div>

          <div className={styles.filterGroup}>
            <div className={styles.searchBox}>
              <Search size={16} color="#160e6f" />
              <input
                type="text"
                placeholder="Search intern or employer..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
              />
            </div>

            {/* Pagination controls */}
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
        </div>

        {/* Table Container */}
        <div className={styles.tableCard}>
          {displayedInterns.length === 0 ? (
            <div className={styles.noData}>
              No active interns found matching your filter criteria.
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Matched Employer</th>
                  <th>Accepted Role</th>
                  <th>Placement Date</th>
                  <th>Rendered Hours</th>
                  <th>Internship Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {displayedInterns.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong style={{ color: '#160e6f' }}>{item.studentName}</strong>
                      <br />
                      <small style={{ color: '#64748b' }}>{item.email}</small>
                    </td>
                    <td>{item.matchedEmployer}</td>
                    <td>{item.acceptedRole}</td>
                    <td>{item.dateOfPlacement}</td>
                    <td>
                      <span className={styles.hoursText}>
                        {item.renderedHours} / {item.targetHours} hrs
                      </span>
                    </td>
                    <td>
                      <span className={`${styles.statusPill} ${getStatusPillClass(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={styles.actionBtn}
                        onClick={() => setSelectedIntern(item)}
                      >
                        <Eye size={14} />
                        <span>View Details</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Expand / Pop-up Detail Modal */}
      <InternDetailModal
        intern={selectedIntern}
        onClose={() => setSelectedIntern(null)}
      />
    </main>
  )
}

export default MonitorInternsPage
