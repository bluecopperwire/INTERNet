import { useEffect, useMemo, useState } from 'react'
import { Eye, Filter, Plus, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PageHero } from '../../../components/PageHero'
import { DataTable, TABLE_COLUMN_WIDTHS, type DataTableColumn } from '../../../components/DataTable'
import { StatusBadge, TableActions, TableCellStack } from '../../../components/TablePrimitives'
import { TablePagination } from '../../../components/TablePagination'
import { adminService } from '../services/admin.service'
import type { EmployerRecord } from '../types/admin.types'
import styles from './ManageStudentsPage.module.css'

export function ManageEmployersPage() {
  const [employers, setEmployers] = useState<EmployerRecord[]>([])
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('All Statuses')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [retryKey, setRetryKey] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    adminService.getEmployerRecords()
      .then((records) => { setEmployers(records); setError('') })
      .catch(() => { setEmployers([]); setError('Employer accounts could not be loaded.') })
      .finally(() => setIsLoading(false))
  }, [retryKey])

  const filtered = useMemo(() => {
    return employers.filter((employer) => {
      const term = query.trim().toLowerCase()
      const matchesTerm =
        !term ||
        employer.accountCode?.toLowerCase().includes(term) ||
        employer.companyName.toLowerCase().includes(term) ||
        employer.email.toLowerCase().includes(term)
      const matchesStatus = status === 'All Statuses' || employer.status === status
      return matchesTerm && matchesStatus
    })
  }, [employers, query, status])

  const records = filtered.slice((page - 1) * pageSize, page * pageSize)

  const summary = {
    total: employers.length,
    active: employers.filter((record) => record.status === 'Active').length,
    suspended: employers.filter((record) => record.status === 'Suspended').length,
    deactivated: employers.filter((record) => record.status === 'Deactivated').length,
  }

  const summaryItems = [
    { label: 'Total Employers', value: summary.total },
    { label: 'Active Employers', value: summary.active },
    { label: 'Suspended Employers', value: summary.suspended },
    { label: 'Deactivated Employers', value: summary.deactivated },
  ]
  const columns: DataTableColumn<EmployerRecord>[] = [
    { key: 'employer', header: 'Employer', minWidth: TABLE_COLUMN_WIDTHS.identity, render: (employer) => <TableCellStack primary={employer.companyName} secondary={employer.industry} truncateSecondary /> },
    { key: 'account', header: 'Account', minWidth: TABLE_COLUMN_WIDTHS.account, render: (employer) => <TableCellStack primary={employer.email} secondary={employer.accountCode} code /> },
    { key: 'registered', header: 'Registered', width: TABLE_COLUMN_WIDTHS.registered, minWidth: TABLE_COLUMN_WIDTHS.registered, noWrap: true, render: (employer) => employer.dateCreated },
    { key: 'status', header: 'Status', width: TABLE_COLUMN_WIDTHS.status, align: 'center', render: (employer) => <StatusBadge value={employer.status} /> },
    { key: 'actions', header: 'Actions', width: TABLE_COLUMN_WIDTHS.actions, align: 'center', headerAlign: 'center', render: (employer) => <TableActions><button type="button" className={styles.manageButton} onClick={() => navigate(`/admin/manage-employers/${employer.id}`)} aria-label={`View ${employer.companyName}`}><Eye size={16} aria-hidden="true" />View</button></TableActions> },
  ]

  return (
    <main className={styles.pageContainer}>
      <PageHero title="Manage Employers" subtitle="View, update, and manage employer accounts." />

      <section className={styles.mainContent}>
        <div className={styles.summaryGrid}>
          {summaryItems.map((item) => (
            <article className={styles.summaryCard} key={item.label}>
              <h2>{item.label}</h2>
              <p>{String(item.value).padStart(2, '0')}</p>
            </article>
          ))}
        </div>

        <section className={styles.managementCard}>
          <div className={styles.toolbar}>
            <label className={styles.searchBox}>
              <Search size={19} aria-hidden="true" />
              <span className={styles.srOnly}>Search employers</span>
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setPage(1)
                }}
                placeholder="Search employers..."
              />
            </label>

            <div className={styles.toolbarActions}><label className={styles.statusFilter}>
              <Filter size={17} aria-hidden="true" />
              <span className={styles.srOnly}>Account status</span>
              <select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value)
                  setPage(1)
                }}
              >
                <option>All Statuses</option>
                <option>Active</option>
                <option>Suspended</option>
                <option>Deactivated</option>
              </select>
            </label><button type="button" className={styles.createButton} onClick={() => navigate('/admin/manage-employers/create')} aria-label="Create employer"><Plus size={20} /></button></div>
          </div>

          <DataTable ariaLabel="Employer accounts" columns={columns} rows={records} rowKey={(employer) => employer.id} minWidth={1040} loading={isLoading} error={error} onRetry={() => { setIsLoading(true); setError(''); setRetryKey((value) => value + 1) }} emptyMessage="No employer accounts are available yet." filteredEmptyMessage="No employers match the selected filters." hasActiveFilters={Boolean(query.trim()) || status !== 'All Statuses'} footer={<TablePagination page={page} pageSize={pageSize} totalRecords={filtered.length} onPageChange={setPage} onPageSizeChange={(value) => { setPageSize(value); setPage(1) }} />} />
        </section>
      </section>
    </main>
  )
}

export default ManageEmployersPage
