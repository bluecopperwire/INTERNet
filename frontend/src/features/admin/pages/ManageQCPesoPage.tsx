import { useEffect, useMemo, useState } from 'react'
import { Eye, Filter, Plus, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PageHero } from '../../../components/PageHero'
import { DataTable, TABLE_COLUMN_WIDTHS, type DataTableColumn } from '../../../components/DataTable'
import { StatusBadge, TableActions, TableCellStack } from '../../../components/TablePrimitives'
import { TablePagination } from '../../../components/TablePagination'
import { adminService } from '../services/admin.service'
import type { QCPesoRecord } from '../types/admin.types'
import styles from './ManageStudentsPage.module.css'

export function ManageQCPesoPage() {
  const [personnel, setPersonnel] = useState<QCPesoRecord[]>([])
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('All Statuses')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [retryKey, setRetryKey] = useState(0)
  const navigate = useNavigate()
  useEffect(() => {
    adminService.getQCPesoRecords()
      .then((records) => { setPersonnel(records); setError('') })
      .catch(() => { setPersonnel([]); setError('QC PESO accounts could not be loaded.') })
      .finally(() => setIsLoading(false))
  }, [retryKey])
  const filtered = useMemo(() => personnel.filter((record) => { const term = query.trim().toLowerCase(); return (!term || record.accountCode?.toLowerCase().includes(term) || record.fullName.toLowerCase().includes(term) || record.email.toLowerCase().includes(term)) && (status === 'All Statuses' || record.status === status) }), [personnel, query, status])
  const records = filtered.slice((page - 1) * pageSize, page * pageSize)
  const summary = { total: personnel.length, active: personnel.filter((record) => record.status === 'Active').length, suspended: personnel.filter((record) => record.status === 'Suspended').length, deactivated: personnel.filter((record) => record.status === 'Deactivated').length }
  const columns: DataTableColumn<QCPesoRecord>[] = [
    { key: 'personnel', header: 'Personnel', minWidth: TABLE_COLUMN_WIDTHS.identity, render: (record) => <TableCellStack primary={record.fullName} secondary={record.position} /> },
    { key: 'account', header: 'Account', minWidth: TABLE_COLUMN_WIDTHS.account, render: (record) => <TableCellStack primary={record.email} secondary={record.accountCode} code /> },
    { key: 'registered', header: 'Registered', width: TABLE_COLUMN_WIDTHS.registered, minWidth: TABLE_COLUMN_WIDTHS.registered, noWrap: true, render: (record) => record.dateCreated },
    { key: 'status', header: 'Status', width: TABLE_COLUMN_WIDTHS.status, align: 'center', render: (record) => <StatusBadge value={record.status} /> },
    { key: 'actions', header: 'Actions', width: TABLE_COLUMN_WIDTHS.actions, align: 'center', headerAlign: 'center', render: (record) => <TableActions><button type="button" className={styles.manageButton} onClick={() => navigate(`/admin/manage-qcpeso/${record.id}`)} aria-label={`View ${record.fullName}`}><Eye size={16} aria-hidden="true" />View</button></TableActions> },
  ]
  return <main className={styles.pageContainer}>
    <PageHero title="Manage QC PESO" subtitle="View, update, and manage QC PESO personnel accounts." />
    <section className={styles.mainContent}>
      <div className={styles.summaryGrid}>{[['Total QC PESO', summary.total], ['Active QC PESO', summary.active], ['Suspended QC PESO', summary.suspended], ['Deactivated QC PESO', summary.deactivated]].map(([label, value]) => <article className={styles.summaryCard} key={String(label)}><h2>{label}</h2><p>{String(value).padStart(2, '0')}</p></article>)}</div>
      <section className={styles.managementCard}><div className={styles.toolbar}><label className={styles.searchBox}><Search size={19} /><span className={styles.srOnly}>Search personnel</span><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} placeholder="Search personnel..." /></label><div className={styles.toolbarActions}><label className={styles.statusFilter}><Filter size={17} /><span className={styles.srOnly}>Account status</span><select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }}><option>All Statuses</option><option>Active</option><option>Suspended</option><option>Deactivated</option></select></label><button type="button" className={styles.createButton} onClick={() => navigate('/admin/manage-qcpeso/create')} aria-label="Create QC PESO personnel"><Plus size={20} /></button></div></div><DataTable ariaLabel="QC PESO accounts" columns={columns} rows={records} rowKey={(record) => record.id} minWidth={1040} loading={isLoading} error={error} onRetry={() => { setIsLoading(true); setError(''); setRetryKey((value) => value + 1) }} emptyMessage="No QC PESO accounts are available yet." filteredEmptyMessage="No personnel match the selected filters." hasActiveFilters={Boolean(query.trim()) || status !== 'All Statuses'} footer={<TablePagination page={page} pageSize={pageSize} totalRecords={filtered.length} onPageChange={setPage} onPageSizeChange={(value) => { setPageSize(value); setPage(1) }} />} /></section>
    </section>
  </main>
}

export default ManageQCPesoPage
