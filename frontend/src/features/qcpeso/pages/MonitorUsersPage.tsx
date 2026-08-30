import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Eye, Search, SlidersHorizontal } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import QCPesoHero from '../components/QCPesoHero'
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
  const [itemsPerPage, setItemsPerPage] = useState(7)
  const isStudents = kind === 'students'
  const routeSegment = isStudents ? 'students' : 'employers'
  const title = isStudents ? 'Monitor Students' : 'Monitor Employers'
  const subtitle = isStudents ? 'Monitor student accounts and registration status.' : 'Monitor company accounts and registration status.'

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

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage))
  const displayedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  useEffect(() => {
    setCurrentPage(1)
  }, [itemsPerPage, searchQuery, selectedStatus])

  return (
    <main className={styles.page}>
      <QCPesoHero title={title} subtitle={subtitle} />
      <section className={styles.content}>
        <div className={styles.controls}>
          <label className={styles.searchField}>
            <Search size={19} aria-hidden="true" />
            <span className={styles.srOnly}>Search {isStudents ? 'students' : 'companies'}</span>
            <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder={`Search ${isStudents ? 'students' : 'companies'}...`} />
          </label>
          <label className={styles.statusFilter}>
            <SlidersHorizontal size={16} aria-hidden="true" />
            <span className={styles.srOnly}>Filter by account status</span>
            <select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value as 'All' | MonitorUserStatus)}>
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
                    <td className={styles.nameCell}>{name}</td>
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

        <div className={styles.pagination}>
          <div className={styles.pageSize}>
            <span>View</span>
            <span className={styles.pageSizeValue}><select value={itemsPerPage} onChange={(event) => setItemsPerPage(Number(event.target.value))} aria-label={`${isStudents ? 'Students' : 'Companies'} per page`}><option value={7}>7</option><option value={10}>10</option><option value={15}>15</option></select></span>
            <span>{isStudents ? 'Students' : 'Companies'} per page</span>
          </div>
          <div className={styles.paginationButtons}>
            <button type="button" aria-label="Previous page" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1}><ChevronLeft size={19} /></button>
            <button type="button" className={styles.currentPage}>{currentPage}</button>
            <button type="button" aria-label="Next page" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={currentPage === totalPages}><ChevronRight size={19} /></button>
          </div>
        </div>
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
