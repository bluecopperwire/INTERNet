import { useEffect, useMemo, useState } from 'react'
import { Eye, Filter, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PageHero } from '../../../components/PageHero'
import { TablePagination } from '../../../components/TablePagination'
import peopleIcon from '../../../assets/people.svg'
import { adminService } from '../services/admin.service'
import type { StudentRecord } from '../types/admin.types'
import styles from './ManageStudentsPage.module.css'

export function ManageStudentsPage() {
  const [students, setStudents] = useState<StudentRecord[]>([])
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('All Statuses')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const navigate = useNavigate()

  useEffect(() => { adminService.getStudentRecords().then(setStudents) }, [])

  const filteredStudents = useMemo(() => students.filter((student) => {
    const term = query.trim().toLowerCase()
    const matchesQuery = !term || student.fullName.toLowerCase().includes(term) || student.email.toLowerCase().includes(term)
    return matchesQuery && (status === 'All Statuses' || student.status === status)
  }), [students, query, status])
  const currentStudents = filteredStudents.slice((page - 1) * pageSize, page * pageSize)

  const statusClass = (value: StudentRecord['status']) => value === 'Active' ? styles.active : value === 'Deactivated' ? styles.deactivated : styles.inactive
  const accountSummary = {
    total: students.length,
    active: students.filter((student) => student.status === 'Active').length,
    suspended: students.filter((student) => student.status === 'Suspended').length,
    deactivated: students.filter((student) => student.status === 'Deactivated').length,
  }

  return <main className={styles.pageContainer}>
    <PageHero title="Manage Students" subtitle="View, update, and manage student accounts." />

    <section className={styles.mainContent}>
      <div className={styles.summaryGrid}>
        <SummaryCard label="Total Student Accounts" value={String(accountSummary.total)} />
        <SummaryCard label="Active Student Accounts" value={String(accountSummary.active)} />
        <SummaryCard label="Suspended Student Accounts" value={String(accountSummary.suspended)} />
        <SummaryCard label="Deactivated Student Accounts" value={String(accountSummary.deactivated)} />
      </div>

      <section className={styles.managementCard}>
        <div className={styles.toolbar}>
          <label className={styles.searchBox}><Search size={19} aria-hidden="true" /><span className={styles.srOnly}>Search students</span><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} placeholder="Search students..." /></label>
          <label className={styles.statusFilter}><Filter size={17} aria-hidden="true" /><span className={styles.srOnly}>Account status</span><select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }}><option>All Statuses</option><option>Active</option><option>Suspended</option><option>Deactivated</option></select></label>
        </div>
        <div className={styles.tableWrap}><table><thead><tr><th>Student Name</th><th>Email</th><th>Date Registered</th><th>Status</th><th>Action</th></tr></thead><tbody>
          {currentStudents.map((student) => <tr key={student.id}><td><strong>{student.fullName}</strong></td><td>{student.email}</td><td>{student.dateCreated}</td><td><span className={`${styles.statusBadge} ${statusClass(student.status)}`}>{student.status}</span></td><td><button type="button" className={styles.manageButton} onClick={() => navigate(`/admin/manage-students/${student.id}`)}><Eye size={16} aria-hidden="true" />View</button></td></tr>)}
          {!currentStudents.length && <tr><td className={styles.empty} colSpan={5}>No students match the selected filters.</td></tr>}
        </tbody></table></div>
      </section>
      <TablePagination page={page} pageSize={pageSize} totalRecords={filteredStudents.length} onPageChange={setPage} onPageSizeChange={(value) => { setPageSize(value); setPage(1) }} />
    </section>
  </main>
}

function SummaryCard({ label, value }: { label: string; value: string }) { return <article className={styles.summaryCard}><h2>{label}</h2><p>{value}</p><img src={peopleIcon} alt="" /></article> }
export default ManageStudentsPage
