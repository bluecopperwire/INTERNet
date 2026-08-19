import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Eye, Search, SlidersHorizontal } from 'lucide-react'
import QCPesoHero from '../components/QCPesoHero'
import InternDetailModal from '../components/InternDetailModal'
import { qcpesoService } from '../services/qcpeso.service'
import type { DTRLog, InternItem } from '../types/qcpeso.types'
import styles from './MonitorAttendancePage.module.css'

interface AttendanceRow {
  id: string
  intern: InternItem
  log: DTRLog
}

const PAGE_SIZES = [7, 10, 15]

const getLocalDate = () => {
  const now = new Date()
  const offset = now.getTimezoneOffset()
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10)
}

export function MonitorAttendancePage() {
  const [interns, setInterns] = useState<InternItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('All')
  const [selectedDate, setSelectedDate] = useState(getLocalDate)
  const [itemsPerPage, setItemsPerPage] = useState(PAGE_SIZES[0])
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedIntern, setSelectedIntern] = useState<InternItem | null>(null)

  useEffect(() => {
    qcpesoService.getInterns()
      .then(setInterns)
      .finally(() => setIsLoading(false))
  }, [])

  const attendanceRows = useMemo<AttendanceRow[]>(() => (
    interns.filter(({ status }) => status === 'Ongoing').flatMap((intern) => intern.dtrLogs.map((log) => ({
      id: `${intern.id}-${log.id}`,
      intern,
      log,
    })))
  ), [interns])

  const summary = useMemo(() => {
    const activeInterns = interns.filter(({ status }) => status === 'Ongoing')
    const selectedDateLogs = activeInterns
      .map((intern) => intern.dtrLogs.find((log) => log.date === selectedDate))
      .filter(Boolean)

    return {
      activeInterns: activeInterns.length,
      present: selectedDateLogs.filter((log) => log?.status === 'Present').length,
      absent: selectedDateLogs.filter((log) => log?.status === 'Absent').length,
      late: selectedDateLogs.filter((log) => log?.status === 'Late').length,
    }
  }, [interns, selectedDate])

  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return attendanceRows.filter(({ intern, log }) => {
      const matchesSearch = !query || [intern.studentName, intern.acceptedRole, intern.matchedEmployer]
        .some((value) => value.toLowerCase().includes(query))
      const matchesStatus = selectedStatus === 'All' || log.status === selectedStatus
      const matchesDate = log.date === selectedDate
      return matchesSearch && matchesStatus && matchesDate
    })
  }, [attendanceRows, searchQuery, selectedDate, selectedStatus])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / itemsPerPage))
  const displayedRows = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredRows.slice(start, start + itemsPerPage)
  }, [currentPage, filteredRows, itemsPerPage])

  if (isLoading) return <main className={styles.loading}>Loading attendance records...</main>

  return (
    <main className={styles.pageContainer}>
      <QCPesoHero title="Attendance Monitoring" subtitle="Monitoring list of attendance of active interns" />

      <section className={styles.mainContent}>
        <div className={styles.summaryGrid} aria-label="Attendance summary">
          <SummaryCard label="Total Active Interns" value={summary.activeInterns} />
          <SummaryCard label="Present" value={summary.present} />
          <SummaryCard label="Absent" value={summary.absent} />
          <SummaryCard label="Late" value={summary.late} />
        </div>

        <div className={styles.toolbarRow}>
          <label className={styles.searchBox}>
            <Search size={16} aria-hidden="true" />
            <span className={styles.srOnly}>Search attendance records</span>
            <input type="search" placeholder="Search intern or employer..." value={searchQuery} onChange={(event) => { setSearchQuery(event.target.value); setCurrentPage(1) }} />
          </label>
          <label className={styles.filterControl}>
            <SlidersHorizontal size={16} aria-hidden="true" />
            <span className={styles.srOnly}>Filter by attendance status</span>
            <select value={selectedStatus} onChange={(event) => { setSelectedStatus(event.target.value); setCurrentPage(1) }}>
              <option value="All">All Statuses</option>
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
              <option value="Late">Late</option>
            </select>
          </label>
          <label className={styles.dateFilter}>
            <CalendarDays size={16} aria-hidden="true" />
            <span className={styles.srOnly}>Filter by date</span>
            <input
              type="date"
              value={selectedDate}
              max={getLocalDate()}
              onChange={(event) => {
                setSelectedDate(event.target.value)
                setCurrentPage(1)
              }}
            />
          </label>
        </div>

        <div className={styles.tableCard}>
          <div className={styles.tableScroller}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Student Name</th><th>Role</th><th>Company</th><th>Date</th><th>Time In</th><th>Time Out</th><th>Status</th><th>Total Hours</th><th><span className={styles.srOnly}>Action</span></th>
                </tr>
              </thead>
              <tbody>
                {displayedRows.map(({ id, intern, log }) => (
                  <tr key={id}>
                    <td><strong>{intern.studentName}</strong></td><td>{intern.acceptedRole}</td><td>{intern.matchedEmployer}</td><td>{log.date}</td><td>{log.timeIn}</td><td>{log.timeOut}</td>
                    <td><span className={`${styles.statusPill} ${styles[log.status.toLowerCase()]}`}>{log.status}</span></td><td>{log.hoursRendered} hrs</td>
                    <td><button type="button" className={styles.actionBtn} onClick={() => setSelectedIntern(intern)}><Eye size={14} aria-hidden="true" /><span>View</span></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {displayedRows.length === 0 && <p className={styles.noData}>No attendance records match the selected filters.</p>}
        </div>

        <div className={styles.paginationRow}>
          <div className={styles.leftControls}>
            <span className={styles.viewLabel}>View</span>
            <div className={styles.viewSelectBox}>
              <select className={styles.viewSelect} value={itemsPerPage} onChange={(event) => { setItemsPerPage(Number(event.target.value)); setCurrentPage(1) }}>
                {PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
              </select>
            </div>
            <span className={styles.perPageLabel}>Students per page</span>
          </div>
          <div className={styles.pagination}>
            <button type="button" className={styles.pageBtn} disabled={currentPage === 1} onClick={() => setCurrentPage((page) => page - 1)} aria-label="Previous page"><ChevronLeft size={18} /></button>
            {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => <button key={page} type="button" className={`${styles.pageBtn} ${page === currentPage ? styles.active : ''}`} onClick={() => setCurrentPage(page)}>{page}</button>)}
            <button type="button" className={styles.pageBtn} disabled={currentPage === totalPages} onClick={() => setCurrentPage((page) => page + 1)} aria-label="Next page"><ChevronRight size={18} /></button>
          </div>
        </div>
      </section>

      <InternDetailModal intern={selectedIntern} onClose={() => setSelectedIntern(null)} />
    </main>
  )
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return <article className={styles.summaryCard}><h2>{label}</h2><p>{String(value).padStart(2, '0')}</p></article>
}

export default MonitorAttendancePage
