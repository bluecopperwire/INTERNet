import { useEffect, useMemo, useState } from 'react'
import { Eye, Search, SlidersHorizontal } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import QCPesoHero from '../components/QCPesoHero'
import { TablePagination } from '../../../components/TablePagination'
import { qcpesoService } from '../services/qcpeso.service'
import type { MonitoredCompanyUser, MonitoredStudentUser, MonitorUserStatus } from '../types/qcpeso.types'
import styles from './MonitorUsersPage.module.css'

type MonitorUsersKind = 'students' | 'companies'
type MonitorUser = MonitoredStudentUser | MonitoredCompanyUser

interface MonitorUsersPageProps {
  kind: MonitorUsersKind
}

export function MonitorUsersPage({ kind }: MonitorUsersPageProps) {
  const navigate = useNavigate()
  const [users, setUsers] = useState<MonitorUser[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<'All' | MonitorUserStatus>('All')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)
  const isStudents = kind === 'students'
  const routeSegment = isStudents ? 'students' : 'employers'
  const title = isStudents ? 'Monitor Students' : 'Monitor Employers'
  const subtitle = isStudents ? 'Monitor student accounts and registration status.' : 'Monitor company accounts and registration status.'

  const summary = useMemo(() => ({
    total: users.length,
    active: users.filter((user) => user.status === 'Active').length,
    suspended: users.filter((user) => user.status === 'Suspended').length,
  }), [users])

  useEffect(() => {
    if (isStudents) {
      qcpesoService.getMonitoredStudents().then(setUsers)
      return
    }

    qcpesoService.getMonitoredCompanies().then(setUsers)
  }, [isStudents])

  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return users.filter((user) => {
      const name = isStudent(user) ? user.studentName : user.companyName
      const matchesSearch = !query || name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query)
      return matchesSearch && (selectedStatus === 'All' || user.status === selectedStatus)
    })
  }, [searchQuery, selectedStatus, users])

  const displayedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  return (
    <main className={styles.page}>
      <QCPesoHero title={title} subtitle={subtitle} />
      <section className={styles.content}>
        <div className={styles.summaryGrid}>
          {[
            [`Total ${isStudents ? 'Students' : 'Employers'}`, summary.total],
            [`Active ${isStudents ? 'Students' : 'Employers'}`, summary.active],
            [`Suspended ${isStudents ? 'Students' : 'Employers'}`, summary.suspended],
          ].map(([label, value]) => (
            <article className={styles.summaryCard} key={label}>
              <h2>{label}</h2>
              <p>{String(value).padStart(2, '0')}</p>
            </article>
          ))}
        </div>

        <div className={styles.controls}>
          <label className={styles.searchField}>
            <Search size={19} aria-hidden="true" />
            <span className={styles.srOnly}>Search {isStudents ? 'students' : 'companies'}</span>
            <input value={searchQuery} onChange={(event) => { setSearchQuery(event.target.value); setCurrentPage(1) }} placeholder={`Search ${isStudents ? 'students' : 'companies'}...`} />
          </label>
          <label className={styles.statusFilter}>
            <SlidersHorizontal size={16} aria-hidden="true" />
            <span className={styles.srOnly}>Filter by account status</span>
            <select value={selectedStatus} onChange={(event) => { setSelectedStatus(event.target.value as 'All' | MonitorUserStatus); setCurrentPage(1) }}>
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Suspended">Suspended</option>
            </select>
          </label>
          {!isStudents && <button className={styles.addEmployerButton} type="button" aria-label="Create employer" onClick={() => navigate('/qcpeso/monitor-users/employers/create')}>+</button>}
        </div>

        <div className={styles.tableCard}>
          <div className={styles.tableScroller}>
            <table className={styles.table}>
              <thead><tr><th>{isStudents ? 'Student Name' : 'Company Name'}</th><th>Email</th><th>Date Registered</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {displayedUsers.map((user) => {
                  const name = isStudent(user) ? user.studentName : user.companyName
                  return <tr key={user.id}>
                    <td>{name}</td>
                    <td>{user.email}</td>
                    <td>{user.dateRegistered}</td>
                    <td><StatusPill status={user.status} /></td>
                    <td><button className={styles.viewButton} type="button" onClick={() => navigate(`/qcpeso/monitor-users/${routeSegment}/${user.id}`)}><Eye size={16} />View</button></td>
                  </tr>
                })}
              </tbody>
            </table>
          </div>
          {!displayedUsers.length && <p className={styles.noData}>No {isStudents ? 'students' : 'companies'} match your search criteria.</p>}
        </div>

        <TablePagination page={currentPage} pageSize={itemsPerPage} totalRecords={filteredUsers.length} onPageChange={setCurrentPage} onPageSizeChange={(value) => { setItemsPerPage(value); setCurrentPage(1) }} />
      </section>
    </main>
  )
}

function isStudent(user: MonitorUser): user is MonitoredStudentUser {
  return 'studentName' in user
}

function StatusPill({ status }: { status: MonitorUserStatus }) {
  return <span className={`${styles.statusPill} ${status === 'Active' ? styles.active : styles.suspended}`}>{status}</span>
}
