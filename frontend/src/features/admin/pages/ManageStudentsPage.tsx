import { useEffect, useMemo, useState } from 'react'
import { Eye, Filter, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PageHero } from '../../../components/PageHero'
import { DataTable, TABLE_COLUMN_WIDTHS, type DataTableColumn } from '../../../components/DataTable'
import { StatusBadge, TableActions, TableCellStack } from '../../../components/TablePrimitives'
import { TablePagination } from '../../../components/TablePagination'
import { adminService } from '../services/admin.service'
import type { StudentRecord } from '../types/admin.types'
import styles from './ManageStudentsPage.module.css'

export function ManageStudentsPage() {
  const [students, setStudents] = useState<StudentRecord[]>([])
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('All Statuses')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [retryKey, setRetryKey] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    adminService.getStudentRecords()
      .then((records) => { setStudents(records); setError('') })
      .catch(() => { setStudents([]); setError('Student accounts could not be loaded.') })
      .finally(() => setIsLoading(false))
  }, [retryKey])

  const filteredStudents = useMemo(() => students.filter((student) => {
    const term = query.trim().toLowerCase()
    const matchesQuery = !term || student.accountCode?.toLowerCase().includes(term) || student.fullName.toLowerCase().includes(term) || student.email.toLowerCase().includes(term)
    return matchesQuery && (status === 'All Statuses' || student.status === status)
  }), [students, query, status])
  const currentStudents = filteredStudents.slice((page - 1) * pageSize, page * pageSize)

  const accountSummary = {
    total: students.length,
    active: students.filter((student) => student.status === 'Active').length,
    suspended: students.filter((student) => student.status === 'Suspended').length,
    deactivated: students.filter((student) => student.status === 'Deactivated').length,
  }
  const columns: DataTableColumn<StudentRecord>[] = [
    { key: 'student', header: 'Student', minWidth: TABLE_COLUMN_WIDTHS.identity, render: (student) => <TableCellStack primary={student.fullName} secondary={student.programStrand} truncateSecondary /> },
    { key: 'account', header: 'Account', minWidth: TABLE_COLUMN_WIDTHS.account, render: (student) => <TableCellStack primary={student.email} secondary={student.accountCode} code /> },
    { key: 'registered', header: 'Registered', width: TABLE_COLUMN_WIDTHS.registered, minWidth: TABLE_COLUMN_WIDTHS.registered, noWrap: true, render: (student) => student.dateCreated },
    { key: 'status', header: 'Status', width: TABLE_COLUMN_WIDTHS.status, align: 'center', render: (student) => <StatusBadge value={student.status} /> },
    { key: 'actions', header: 'Actions', width: TABLE_COLUMN_WIDTHS.actions, align: 'center', headerAlign: 'center', render: (student) => <TableActions><button type="button" className={styles.manageButton} onClick={() => navigate(`/admin/manage-students/${student.id}`)} aria-label={`View ${student.fullName}`}><Eye size={16} aria-hidden="true" />View</button></TableActions> },
  ]

  return <main className={styles.pageContainer}>
    <PageHero title="Manage Students" subtitle="View, update, and manage student accounts." />

    <section className={styles.mainContent}>
      <div className={styles.summaryGrid}>
        <SummaryCard label="Total Students" value={accountSummary.total} />
        <SummaryCard label="Active Students" value={accountSummary.active} />
        <SummaryCard label="Suspended Students" value={accountSummary.suspended} />
        <SummaryCard label="Deactivated Students" value={accountSummary.deactivated} />
      </div>

      <section className={styles.managementCard}>
        <div className={styles.toolbar}>
          <label className={styles.searchBox}><Search size={19} aria-hidden="true" /><span className={styles.srOnly}>Search students</span><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} placeholder="Search students..." /></label>
          <label className={styles.statusFilter}><Filter size={17} aria-hidden="true" /><span className={styles.srOnly}>Account status</span><select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }}><option>All Statuses</option><option>Active</option><option>Suspended</option><option>Deactivated</option></select></label>
        </div>
        <DataTable ariaLabel="Student accounts" columns={columns} rows={currentStudents} rowKey={(student) => student.id} minWidth={1040} loading={isLoading} error={error} onRetry={() => { setIsLoading(true); setError(''); setRetryKey((value) => value + 1) }} emptyMessage="No student accounts are available yet." filteredEmptyMessage="No students match the selected filters." hasActiveFilters={Boolean(query.trim()) || status !== 'All Statuses'} footer={<TablePagination page={page} pageSize={pageSize} totalRecords={filteredStudents.length} onPageChange={setPage} onPageSizeChange={(value) => { setPageSize(value); setPage(1) }} />} />
      </section>
    </section>
  </main>
}

function SummaryCard({ label, value }: { label: string; value: number }) { return <article className={styles.summaryCard}><h2>{label}</h2><p>{String(value).padStart(2, '0')}</p></article> }
export default ManageStudentsPage
