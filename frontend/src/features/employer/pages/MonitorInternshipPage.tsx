import { ChevronLeft, ChevronRight, Eye, Search, SlidersHorizontal } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EmployerHero } from '../components/EmployerHero'
import { employerService } from '../services/employer.service'
import type { EmployerInternshipDetails } from '../types/employer.types'
import styles from './MonitorInternshipPage.module.css'

export function MonitorInternshipPage() {
  const navigate = useNavigate()
  const [internships, setInternships] = useState<EmployerInternshipDetails[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('All')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(7)

  useEffect(() => { employerService.getAllInternshipDetails().then(setInternships) }, [])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return internships.filter((internship) => (
      (!query || `${internship.studentName} ${internship.jobTitle}`.toLowerCase().includes(query))
      && (status === 'All' || internship.status === status)
    ))
  }, [internships, search, status])
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const displayed = filtered.slice((page - 1) * perPage, page * perPage)
  const resetPage = () => setPage(1)

  return <main className={styles.page}>
    <EmployerHero title="Manage Internship" subtitle="Manage and monitor your active interns" comfortableSpacing />
    <section className={styles.content}>
      <div className={styles.summaryGrid}>
        <SummaryCard label="Total Interns" value={internships.length} />
        <SummaryCard label="On Going Interns" value={internships.filter((item) => item.status === 'On Going').length} />
        <SummaryCard label="Completed Interns" value={internships.filter((item) => item.status === 'Completed').length} />
        <SummaryCard label="Awaiting Completion" value={internships.filter((item) => item.status === 'Awaiting Completion').length} />
      </div>

      <div className={styles.toolbar}>
        <label className={styles.searchBox}><Search size={17} /><span className={styles.srOnly}>Search interns</span><input value={search} onChange={(event) => { setSearch(event.target.value); resetPage() }} placeholder="Search interns..." /></label>
        <label className={styles.statusFilter}><SlidersHorizontal size={16} /><span className={styles.srOnly}>Filter internship status</span><select value={status} onChange={(event) => { setStatus(event.target.value); resetPage() }}><option value="All">All Statuses</option><option value="On Going">On Going</option><option value="Completed">Completed</option><option value="Awaiting Completion">Awaiting Completion</option><option value="Withdrawn by Student">Withdrawn by Student</option><option value="Cancelled">Cancelled</option></select></label>
      </div>

      <div className={styles.tableCard}>
        <div className={styles.tableScroller}>
          <table className={styles.table}><thead><tr><th>Student Name</th><th>Job Title</th><th>Remaining Hours</th><th>Status</th><th>Action</th></tr></thead><tbody>{displayed.map((internship) => <tr key={internship.applicantId}><td><strong>{internship.studentName}</strong></td><td>{internship.jobTitle}</td><td>{Math.max(internship.requiredHours - internship.renderedHours, 0)} hrs</td><td><span className={`${styles.statusPill} ${styles[internship.status.replaceAll(' ', '').toLowerCase()]}`}>{internship.status}</span></td><td><button type="button" className={styles.viewButton} onClick={() => navigate(`/employer/manage-internship/${internship.applicantId}`)}><Eye size={16} />View</button></td></tr>)}</tbody></table>
        </div>
        {displayed.length === 0 && <p className={styles.emptyState}>No interns match the selected filters.</p>}
      </div>

      <div className={styles.paginationRow}>
        <div className={styles.perPage}><span>View</span><span className={styles.selectWrap}><select value={perPage} onChange={(event) => { setPerPage(Number(event.target.value)); resetPage() }}><option value={7}>7</option><option value={10}>10</option><option value={15}>15</option></select></span><span>Students per page</span></div>
        <div className={styles.pagination}><button type="button" disabled={page === 1} onClick={() => setPage((current) => current - 1)}><ChevronLeft size={18} /></button><button type="button" className={styles.currentPage}>{page}</button><button type="button" disabled={page === totalPages} onClick={() => setPage((current) => current + 1)}><ChevronRight size={18} /></button></div>
      </div>
    </section>
  </main>
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return <article className={styles.summaryCard}><h2>{label}</h2><p>{String(value).padStart(2, '0')}</p></article>
}
