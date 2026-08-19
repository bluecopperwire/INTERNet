import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Eye, Search, SlidersHorizontal } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { EmployerHero } from '../components/EmployerHero'
import { employerService } from '../services/employer.service'
import type { EmployerAttendanceRecord } from '../types/employer.types'
import styles from './AttendanceMonitoringPage.module.css'

const pageSizes = [7, 10, 15]
const localDate = () => {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10)
}

export function AttendanceMonitoringPage() {
  const navigate = useNavigate()
  const [records, setRecords] = useState<EmployerAttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('All')
  const [date, setDate] = useState(localDate)
  const [perPage, setPerPage] = useState(7)
  const [page, setPage] = useState(1)

  useEffect(() => { employerService.getAttendanceRecords().then(setRecords).finally(() => setLoading(false)) }, [])

  const summary = useMemo(() => {
    const dateRecords = records.filter((record) => record.date === date)
    return { active: new Set(records.map((record) => record.applicantId)).size, present: dateRecords.filter((record) => record.status === 'Present').length, absent: dateRecords.filter((record) => record.status === 'Absent').length, late: dateRecords.filter((record) => record.status === 'Late').length }
  }, [records, date])
  const filtered = useMemo(() => records.filter((record) => {
    const query = search.trim().toLowerCase()
    return (!query || `${record.studentName} ${record.role}`.toLowerCase().includes(query)) && (status === 'All' || record.status === status) && record.date === date
  }), [records, search, status, date])
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const displayed = filtered.slice((page - 1) * perPage, page * perPage)
  const resetPage = () => setPage(1)

  if (loading) return <main className={styles.loading}>Loading attendance records...</main>

  return <main className={styles.pageContainer}>
    <EmployerHero title="Attendance Monitoring" subtitle="Monitor attendance of your active interns" comfortableSpacing />
    <section className={styles.mainContent}>
      <div className={styles.summaryGrid}>
        <SummaryCard label="Total Active Interns" value={summary.active} /><SummaryCard label="Present" value={summary.present} /><SummaryCard label="Absent" value={summary.absent} /><SummaryCard label="Late" value={summary.late} />
      </div>
      <div className={styles.toolbar}>
        <label className={styles.searchBox}><Search size={16} /><span className={styles.srOnly}>Search attendance records</span><input value={search} onChange={(event) => { setSearch(event.target.value); resetPage() }} placeholder="Search intern or role..." /></label>
        <label className={styles.statusFilter}><SlidersHorizontal size={16} /><span className={styles.srOnly}>Filter by status</span><select value={status} onChange={(event) => { setStatus(event.target.value); resetPage() }}><option value="All">All Statuses</option><option value="Present">Present</option><option value="Absent">Absent</option><option value="Late">Late</option></select></label>
        <label className={styles.dateFilter}><CalendarDays size={16} /><span className={styles.srOnly}>Filter by date</span><input type="date" value={date} max={localDate()} onChange={(event) => { setDate(event.target.value); resetPage() }} /></label>
      </div>
      <div className={styles.tableCard}><div className={styles.tableScroller}><table className={styles.table}><thead><tr><th>Student Name</th><th>Role</th><th>Company</th><th>Date</th><th>Time In</th><th>Time Out</th><th>Status</th><th>Total Hours</th><th><span className={styles.srOnly}>Action</span></th></tr></thead><tbody>{displayed.map((record) => <tr key={record.id}><td><strong>{record.studentName}</strong></td><td>{record.role}</td><td>{record.company}</td><td>{record.date}</td><td>{record.timeIn}</td><td>{record.timeOut}</td><td><span className={`${styles.statusPill} ${styles[record.status.toLowerCase()]}`}>{record.status}</span></td><td>{record.hoursRendered} hrs</td><td><button className={styles.actionBtn} onClick={() => navigate(`/employer/applicants/${record.applicantId}`)}><Eye size={14} />View</button></td></tr>)}</tbody></table></div>{displayed.length === 0 && <p className={styles.noData}>No attendance records match the selected filters.</p>}</div>
      <div className={styles.paginationRow}><div className={styles.leftControls}><span>View</span><div className={styles.viewSelectBox}><select value={perPage} onChange={(event) => { setPerPage(Number(event.target.value)); resetPage() }}>{pageSizes.map((size) => <option key={size}>{size}</option>)}</select></div><span>Students per page</span></div><div className={styles.pagination}><button disabled={page === 1} onClick={() => setPage(page - 1)}><ChevronLeft size={18} /></button>{Array.from({ length: totalPages }, (_, index) => index + 1).map((item) => <button key={item} className={item === page ? styles.active : ''} onClick={() => setPage(item)}>{item}</button>)}<button disabled={page === totalPages} onClick={() => setPage(page + 1)}><ChevronRight size={18} /></button></div></div>
    </section>
  </main>
}

function SummaryCard({ label, value }: { label: string; value: number }) { return <article className={styles.summaryCard}><h2>{label}</h2><p>{String(value).padStart(2, '0')}</p></article> }

export default AttendanceMonitoringPage
