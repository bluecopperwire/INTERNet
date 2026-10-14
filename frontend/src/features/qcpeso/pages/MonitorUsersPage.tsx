import { useEffect, useMemo, useState } from 'react'
import { Eye, Search, SlidersHorizontal } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import QCPesoHero from '../components/QCPesoHero'
import { DataTable, TABLE_COLUMN_WIDTHS, type DataTableColumn } from '../../../components/DataTable'
import { StatusBadge, TableActions, TableCellStack } from '../../../components/TablePrimitives'
import { TablePagination } from '../../../components/TablePagination'
import { TableToolbar } from '../../../components/TableToolbar'
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
  const columns: DataTableColumn<MonitorUser>[] = isStudents
    ? [
        { key: 'student', header: 'Student', minWidth: TABLE_COLUMN_WIDTHS.identity, render: (user) => { const student = user as MonitoredStudentUser; return <TableCellStack primary={student.studentName} secondary={student.accountCode} code /> } },
        { key: 'academic', header: 'Academic Information', minWidth: TABLE_COLUMN_WIDTHS.academic, render: (user) => { const student = user as MonitoredStudentUser; return <TableCellStack primary={student.school} secondary={student.program} truncateSecondary /> } },
        { key: 'contact', header: 'Contact', minWidth: TABLE_COLUMN_WIDTHS.contact, render: (user) => { const student = user as MonitoredStudentUser; return <TableCellStack primary={student.email} secondary={student.mobileNumber} /> } },
        { key: 'registered', header: 'Registered', width: TABLE_COLUMN_WIDTHS.registered, minWidth: TABLE_COLUMN_WIDTHS.registered, noWrap: true, render: (user) => user.dateRegistered },
        { key: 'status', header: 'Status', width: TABLE_COLUMN_WIDTHS.status, align: 'center', render: (user) => <StatusBadge value={user.status} /> },
        { key: 'actions', header: 'Actions', width: TABLE_COLUMN_WIDTHS.actions, align: 'center', headerAlign: 'center', render: (user) => <TableActions><button className={styles.viewButton} type="button" onClick={() => navigate(`/qcpeso/monitor-users/${routeSegment}/${user.id}`)} aria-label={`View ${(user as MonitoredStudentUser).studentName}`}><Eye size={16} aria-hidden="true" />View</button></TableActions> },
      ]
    : [
        { key: 'employer', header: 'Employer', minWidth: TABLE_COLUMN_WIDTHS.identity, render: (user) => { const company = user as MonitoredCompanyUser; return <TableCellStack primary={company.companyName} secondary={company.accountCode} code /> } },
        { key: 'organization', header: 'Organization', minWidth: TABLE_COLUMN_WIDTHS.academic, render: (user) => { const company = user as MonitoredCompanyUser; return <TableCellStack primary={company.industry} secondary={company.companyType} /> } },
        { key: 'contact', header: 'Contact', minWidth: TABLE_COLUMN_WIDTHS.contact, render: (user) => { const company = user as MonitoredCompanyUser; return <TableCellStack primary={company.email} secondary={company.contactNumber} /> } },
        { key: 'registered', header: 'Registered', width: TABLE_COLUMN_WIDTHS.registered, minWidth: TABLE_COLUMN_WIDTHS.registered, noWrap: true, render: (user) => user.dateRegistered },
        { key: 'status', header: 'Status', width: TABLE_COLUMN_WIDTHS.status, align: 'center', render: (user) => <StatusBadge value={user.status} /> },
        { key: 'actions', header: 'Actions', width: TABLE_COLUMN_WIDTHS.actions, align: 'center', headerAlign: 'center', render: (user) => <TableActions><button className={styles.viewButton} type="button" onClick={() => navigate(`/qcpeso/monitor-users/${routeSegment}/${user.id}`)} aria-label={`View ${(user as MonitoredCompanyUser).companyName}`}><Eye size={16} aria-hidden="true" />View</button></TableActions> },
      ]

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

        <TableToolbar className={styles.controls} hasActiveFilters={Boolean(searchQuery.trim()) || selectedStatus !== 'All'} onClearFilters={() => { setSearchQuery(''); setSelectedStatus('All'); setCurrentPage(1) }}>
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
        </TableToolbar>

        <DataTable ariaLabel={isStudents ? 'Monitored student accounts' : 'Monitored employer accounts'} columns={columns} rows={displayedUsers} rowKey={(user) => user.id} minWidth={1320} emptyMessage={`No ${isStudents ? 'student' : 'employer'} accounts are available yet.`} filteredEmptyMessage={`No ${isStudents ? 'students' : 'employers'} match your search criteria.`} hasActiveFilters={Boolean(searchQuery.trim()) || selectedStatus !== 'All'} footer={<TablePagination page={currentPage} pageSize={itemsPerPage} totalRecords={filteredUsers.length} onPageChange={setCurrentPage} onPageSizeChange={(value) => { setItemsPerPage(value); setCurrentPage(1) }} />} />
      </section>
    </main>
  )
}

function isStudent(user: MonitorUser): user is MonitoredStudentUser {
  return 'studentName' in user
}
