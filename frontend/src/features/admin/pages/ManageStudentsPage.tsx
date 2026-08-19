import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Eye, Filter, Search } from 'lucide-react'
import headerImage from '../../../assets/requirements-header-image.png'
import peopleIcon from '../../../assets/people.svg'
import { ManageRecordModal } from '../components/ManageRecordModal'
import { adminService } from '../services/admin.service'
import type { StudentRecord } from '../types/admin.types'
import styles from './ManageStudentsPage.module.css'

export function ManageStudentsPage() {
  const [students, setStudents] = useState<StudentRecord[]>([])
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('All Statuses')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(7)
  const [selectedStudent, setSelectedStudent] = useState<StudentRecord | null>(null)

  useEffect(() => { adminService.getStudentRecords().then(setStudents) }, [])

  const filteredStudents = useMemo(() => students.filter((student) => {
    const term = query.trim().toLowerCase()
    const matchesQuery = !term || student.fullName.toLowerCase().includes(term) || student.email.toLowerCase().includes(term)
    return matchesQuery && (status === 'All Statuses' || student.status === status)
  }), [students, query, status])
  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize))
  const currentStudents = filteredStudents.slice((page - 1) * pageSize, page * pageSize)

  const statusClass = (value: StudentRecord['status']) => value === 'Active' ? styles.active : value === 'Deactivated' ? styles.deactivated : styles.inactive

  return <main className={styles.pageContainer}>
    <header className={styles.hero}>
      <img src={headerImage} alt="" className={styles.heroImage} />
      <div className={styles.heroOverlay} />
      <div className={styles.heroContent}><h1>User Management</h1><p>View, update, and manage student accounts.</p></div>
    </header>

    <section className={styles.mainContent}>
      <div className={styles.summaryGrid}>
        <SummaryCard label="Total Registered Students" value="1291" />
        <SummaryCard label="Active Student Accounts" value="1200" />
        <SummaryCard label="Deactivated Accounts" value="67" />
      </div>

      <section className={styles.managementCard}>
        <div className={styles.toolbar}>
          <label className={styles.searchBox}><Search size={19} aria-hidden="true" /><span className={styles.srOnly}>Search students</span><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} placeholder="Search students..." /></label>
          <label className={styles.statusFilter}><Filter size={17} aria-hidden="true" /><span className={styles.srOnly}>Account status</span><select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }}><option>All Statuses</option><option>Active</option><option>Inactive</option><option>Deactivated</option></select></label>
        </div>
        <div className={styles.tableWrap}><table><thead><tr><th>Student Name</th><th>School</th><th>Program</th><th>Date Registered</th><th>Account Status</th><th>Action</th></tr></thead><tbody>
          {currentStudents.map((student) => <tr key={student.id}><td><strong>{student.fullName}</strong></td><td>{student.schoolName}</td><td>{student.programStrand}</td><td>{student.dateCreated}</td><td><span className={`${styles.statusBadge} ${statusClass(student.status)}`}>{student.status}</span></td><td><button type="button" className={styles.manageButton} onClick={() => setSelectedStudent(student)}><Eye size={16} aria-hidden="true" />Manage</button></td></tr>)}
          {!currentStudents.length && <tr><td className={styles.empty} colSpan={6}>No students match the selected filters.</td></tr>}
        </tbody></table></div>
      </section>
      <nav className={styles.pagination} aria-label="Student pages"><label className={styles.pageSizeControl}><span>View</span><select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1) }}><option value={7}>7</option><option value={14}>14</option><option value={21}>21</option></select><span>Students per page</span></label><div><button type="button" aria-label="Previous page" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}><ChevronLeft size={18} /></button><span className={styles.currentPage}>{page}</span><button type="button" aria-label="Next page" disabled={page === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}><ChevronRight size={18} /></button></div></nav>
    </section>
    {selectedStudent && <ManageRecordModal recordId={selectedStudent.id} recordRole="Student" onClose={() => setSelectedStudent(null)} />}
  </main>
}

function SummaryCard({ label, value }: { label: string; value: string }) { return <article className={styles.summaryCard}><h2>{label}</h2><p>{value}</p><img src={peopleIcon} alt="" /></article> }
export default ManageStudentsPage
