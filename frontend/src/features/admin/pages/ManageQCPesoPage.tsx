import { useEffect, useMemo, useState } from 'react'
import { Eye, Filter, Plus, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PageHero } from '../../../components/PageHero'
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
  const navigate = useNavigate()
  useEffect(() => { adminService.getQCPesoRecords().then(setPersonnel) }, [])
  const filtered = useMemo(() => personnel.filter((record) => { const term = query.trim().toLowerCase(); return (!term || record.accountCode?.toLowerCase().includes(term) || record.fullName.toLowerCase().includes(term) || record.email.toLowerCase().includes(term)) && (status === 'All Statuses' || record.status === status) }), [personnel, query, status])
  const records = filtered.slice((page - 1) * pageSize, page * pageSize)
  const summary = { total: personnel.length, active: personnel.filter((record) => record.status === 'Active').length, suspended: personnel.filter((record) => record.status === 'Suspended').length, deactivated: personnel.filter((record) => record.status === 'Deactivated').length }
  const badge = (value: QCPesoRecord['status']) => value === 'Active' ? styles.active : value === 'Deactivated' ? styles.deactivated : styles.inactive
  return <main className={styles.pageContainer}>
    <PageHero title="Manage QC PESO" subtitle="View, update, and manage QC PESO personnel accounts." />
    <section className={styles.mainContent}>
      <div className={styles.summaryGrid}>{[['Total QC PESO', summary.total], ['Active QC PESO', summary.active], ['Suspended QC PESO', summary.suspended], ['Deactivated QC PESO', summary.deactivated]].map(([label, value]) => <article className={styles.summaryCard} key={String(label)}><h2>{label}</h2><p>{String(value).padStart(2, '0')}</p></article>)}</div>
      <section className={styles.managementCard}><div className={styles.toolbar}><label className={styles.searchBox}><Search size={19} /><span className={styles.srOnly}>Search personnel</span><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} placeholder="Search personnel..." /></label><div className={styles.toolbarActions}><label className={styles.statusFilter}><Filter size={17} /><span className={styles.srOnly}>Account status</span><select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }}><option>All Statuses</option><option>Active</option><option>Suspended</option><option>Deactivated</option></select></label><button type="button" className={styles.createButton} onClick={() => navigate('/admin/manage-qcpeso/create')} aria-label="Create QC PESO personnel"><Plus size={20} /></button></div></div><div className={styles.tableWrap}><table><thead><tr><th>User Code</th><th>Employee Name</th><th>Email</th><th>Date Registered</th><th>Status</th><th>Action</th></tr></thead><tbody>{records.map((record) => <tr key={record.id}><td>{record.accountCode || 'Not provided'}</td><td>{record.fullName}</td><td>{record.email}</td><td>{record.dateCreated}</td><td><span className={`${styles.statusBadge} ${badge(record.status)}`}>{record.status}</span></td><td><button type="button" className={styles.manageButton} onClick={() => navigate(`/admin/manage-qcpeso/${record.id}`)}><Eye size={16} />View</button></td></tr>)}{!records.length && <tr><td className={styles.empty} colSpan={6}>No personnel match the selected filters.</td></tr>}</tbody></table></div></section>
      <TablePagination page={page} pageSize={pageSize} totalRecords={filtered.length} onPageChange={setPage} onPageSizeChange={(value) => { setPageSize(value); setPage(1) }} />
    </section>
  </main>
}

export default ManageQCPesoPage
