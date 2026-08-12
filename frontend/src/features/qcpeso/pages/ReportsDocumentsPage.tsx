import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Eye, Search } from 'lucide-react'
import QCPesoHero from '../components/QCPesoHero'
import { StudentReviewModal } from '../components/StudentReviewModal'
import { qcpesoService } from '../services/qcpeso.service'
import type { StudentApplication } from '../types/qcpeso.types'
import styles from './ReportsDocumentsPage.module.css'

const reportStatuses = [
  { label: 'Pending Review', source: 'Pending', color: '#4b4395' },
  { label: 'Accepted', source: 'Verified', color: '#211578' },
  { label: 'Shortlisted', source: 'Flagged', color: '#ffb83e' },
  { label: 'Rejected', source: 'Rejected', color: '#dc0000' },
]

export function ReportsDocumentsPage() {
  const [applications, setApplications] = useState<StudentApplication[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('All')
  const [itemsPerPage, setItemsPerPage] = useState(7)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedApplication, setSelectedApplication] = useState<StudentApplication | null>(null)

  useEffect(() => {
    qcpesoService.getRecentStudents().then(setApplications)
  }, [])

  const statusData = useMemo(() => {
    const total = applications.length || 1
    return reportStatuses.map((status) => {
      const count = applications.filter((application) => application.status === status.source).length
      return { ...status, count, percentage: Math.round((count / total) * 100) }
    })
  }, [applications])

  const donutGradient = useMemo(() => {
    let start = 0
    const stops = statusData.map(({ color, percentage }) => {
      const end = start + percentage
      const stop = `${color} ${start}% ${end}%`
      start = end
      return stop
    })
    return applications.length ? `conic-gradient(${stops.join(', ')})` : '#eef0f4'
  }, [applications.length, statusData])

  const timeline = useMemo(() => {
    const counts = new Map<string, number>()
    applications.forEach((application) => {
      const date = new Date(application.date)
      if (Number.isNaN(date.getTime())) return
      const label = date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' })
      counts.set(label, (counts.get(label) ?? 0) + 1)
    })
    return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-7)
  }, [applications])

  const filteredApplications = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return applications.filter((application) => {
      const matchesSearch = !query || [application.name, application.school, application.program, application.email]
        .some((value) => value.toLowerCase().includes(query))
      const matchesStatus = selectedStatus === 'All' || application.status === selectedStatus
      return matchesSearch && matchesStatus
    })
  }, [applications, searchQuery, selectedStatus])

  const totalPages = Math.max(1, Math.ceil(filteredApplications.length / itemsPerPage))
  const displayedApplications = filteredApplications.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const updateStatus = (id: string, status: string) => {
    setApplications((current) => current.map((item) => item.id === id ? { ...item, status } : item))
    setSelectedApplication((current) => current?.id === id ? { ...current, status } : current)
  }

  const statusClass = (status: string) => {
    if (status === 'Verified') return styles.verified
    if (status === 'Rejected') return styles.rejected
    if (status === 'Flagged') return styles.flagged
    return ''
  }

  const maxTimelineValue = Math.max(4, ...timeline.map(([, count]) => count))
  const yAxisTicks = Array.from({ length: 5 }, (_, index) =>
    Math.round(maxTimelineValue - (maxTimelineValue * index) / 4)
  )
  const linePoints = timeline.map(([, count], index) => {
    const x = timeline.length === 1 ? 310 : 44 + (index * 532) / (timeline.length - 1)
    const y = 182 - (count / maxTimelineValue) * 142
    return `${x},${y}`
  }).join(' ')

  return (
    <main className={styles.pageContainer}>
      <QCPesoHero title="Reports and Documents" subtitle="QCPESO Reports and Documents Management" comfortableSpacing />

      <section className={styles.mainContent}>
        <div className={styles.chartsGrid}>
          <article className={styles.chartPanel}>
            <header className={styles.chartHeader}>
              <div><h2>Applicants by Status</h2><p>Current application distribution</p></div>
            </header>
            <div className={styles.chartBody}>
              <div className={styles.donut} style={{ background: donutGradient }} aria-label="Applicant status distribution">
                <div className={styles.donutHole} />
              </div>
              <div className={styles.legend}>
                {statusData.map((status) => (
                  <div className={styles.legendRow} key={status.label}>
                    <span className={styles.legendDot} style={{ background: status.color }} />
                    <span>{status.label}</span>
                    <strong>{status.percentage}%</strong>
                  </div>
                ))}
              </div>
            </div>
          </article>

          <article className={styles.chartPanel}>
            <header className={styles.chartHeader}>
              <div><h2>Applicants Over Time</h2><p>Daily application submissions</p></div>
            </header>
            <div className={`${styles.chartBody} ${styles.timelineBody}`}>
              <span className={styles.yAxisLabel}>Applicants</span>
              <div className={styles.lineChart}>
                <svg viewBox="0 0 600 220" role="img" aria-label="Applicants submitted over time">
                  {[40, 75, 110, 145, 180].map((y, index) => (
                    <g key={y}><text x="30" y={y + 4} className={styles.axisValue}>{yAxisTicks[index]}</text><line x1="44" x2="576" y1={y} y2={y} className={styles.gridLine} /></g>
                  ))}
                  {linePoints && <polyline points={linePoints} className={styles.chartLine} />}
                  {linePoints.split(' ').filter(Boolean).map((point) => { const [cx, cy] = point.split(','); return <circle key={point} cx={cx} cy={cy} r="4" className={styles.chartPoint} /> })}
                </svg>
                <div className={styles.axisLabels}>{timeline.map(([date]) => <span key={date}>{date}</span>)}</div>
                {!timeline.length && <p className={styles.emptyChart}>No application history available.</p>}
              </div>
            </div>
          </article>
        </div>

        <div className={styles.toolbarRow}>
          <div className={styles.searchBox}>
            <Search size={16} aria-hidden="true" />
            <input value={searchQuery} placeholder="Search User Application..." onChange={(event) => { setSearchQuery(event.target.value); setCurrentPage(1) }} />
          </div>
          <select className={styles.filterSelect} value={selectedStatus} onChange={(event) => { setSelectedStatus(event.target.value); setCurrentPage(1) }}>
            <option value="All">Filter</option>
            <option value="Pending">Pending</option>
            <option value="Verified">Verified</option>
            <option value="Flagged">Flagged</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>

        <div className={styles.tableCard}>
          <table className={styles.table}>
            <thead><tr><th>Student Name</th><th>School</th><th>Program</th><th>Date Submitted</th><th>Verification Status</th><th>Action</th></tr></thead>
            <tbody>
              {displayedApplications.map((application) => (
                <tr key={application.id}>
                  <td><strong>{application.name}</strong></td><td>{application.school}</td><td>{application.program}</td><td>{application.date}</td>
                  <td><span className={`${styles.statusPill} ${statusClass(application.status)}`}>{application.status}</span></td>
                  <td><button className={styles.actionBtn} type="button" onClick={() => setSelectedApplication(application)}><Eye size={14} /><span>Review</span></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!displayedApplications.length && <div className={styles.noData}>No applications found matching your filter criteria.</div>}
        </div>

        <div className={styles.toolbarRow}>
          <div className={styles.leftControls}>
            <span>View</span>
            <select className={styles.viewSelect} value={itemsPerPage} onChange={(event) => { setItemsPerPage(Number(event.target.value)); setCurrentPage(1) }}>
              <option value={7}>7</option><option value={10}>10</option><option value={15}>15</option>
            </select>
            <span>Students per page</span>
          </div>
          <div className={styles.pagination}>
            <button className={styles.pageBtn} disabled={currentPage === 1} onClick={() => setCurrentPage((page) => page - 1)} aria-label="Previous page"><ChevronLeft size={18} /></button>
            {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => <button key={page} className={`${styles.pageBtn} ${page === currentPage ? styles.active : ''}`} onClick={() => setCurrentPage(page)}>{page}</button>)}
            <button className={styles.pageBtn} disabled={currentPage === totalPages} onClick={() => setCurrentPage((page) => page + 1)} aria-label="Next page"><ChevronRight size={18} /></button>
          </div>
        </div>
      </section>

      <StudentReviewModal student={selectedApplication} isOpen={!!selectedApplication} onClose={() => setSelectedApplication(null)} onApprove={(id) => updateStatus(id, 'Verified')} onFlag={(id) => updateStatus(id, 'Flagged')} onReject={(id) => updateStatus(id, 'Rejected')} />
    </main>
  )
}

export default ReportsDocumentsPage
