import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Eye, Filter, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import headerImage from '../../../assets/requirements-header-image.png'
import peopleIcon from '../../../assets/people.svg'
import { adminService } from '../services/admin.service'
import type { QCPesoRecord } from '../types/admin.types'
import styles from './ManageStudentsPage.module.css'

export function ManageQCPesoPage() {
  const [personnel, setPersonnel] = useState<QCPesoRecord[]>([])
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('All Statuses')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(7)
  const navigate = useNavigate()
  useEffect(() => { adminService.getQCPesoRecords().then(setPersonnel) }, [])
  const filtered = useMemo(() => personnel.filter((record) => { const term = query.trim().toLowerCase(); return (!term || record.fullName.toLowerCase().includes(term) || record.email.toLowerCase().includes(term)) && (status === 'All Statuses' || record.status === status) }), [personnel, query, status])
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const records = filtered.slice((page - 1) * pageSize, page * pageSize)
  const summary = { total: personnel.length, active: personnel.filter((record) => record.status === 'Active').length, suspended: personnel.filter((record) => record.status === 'Suspended').length, deactivated: personnel.filter((record) => record.status === 'Deactivated').length }
  const badge = (value: QCPesoRecord['status']) => value === 'Active' ? styles.active : value === 'Deactivated' ? styles.deactivated : styles.inactive
  return <main className={styles.pageContainer}>
    <header className={styles.hero}><img src={headerImage} alt="" className={styles.heroImage} /><div className={styles.heroOverlay} /><div className={styles.heroContent}><h1>Manage QC PESO</h1><p>View, update, and manage QC PESO personnel accounts.</p></div></header>
    <section className={styles.mainContent}>
      <div className={styles.summaryGrid}>{[['Total QC PESO Accounts', summary.total], ['Active QC PESO Accounts', summary.active], ['Suspended QC PESO Accounts', summary.suspended], ['Deactivated QC PESO Accounts', summary.deactivated]].map(([label, value]) => <article className={styles.summaryCard} key={String(label)}><h2>{label}</h2><p>{value}</p><img src={peopleIcon} alt="" /></article>)}</div>
      <section className={styles.managementCard}><div className={styles.toolbar}><label className={styles.searchBox}><Search size={19} /><span className={styles.srOnly}>Search personnel</span><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} placeholder="Search personnel..." /></label><label className={styles.statusFilter}><Filter size={17} /><span className={styles.srOnly}>Account status</span><select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }}><option>All Statuses</option><option>Active</option><option>Suspended</option><option>Deactivated</option></select></label></div><div className={styles.tableWrap}><table><thead><tr><th>Employee Name</th><th>Date Registered</th><th>Account</th><th>Status</th><th>Action</th></tr></thead><tbody>{records.map((record) => <tr key={record.id}><td><strong>{record.fullName}</strong></td><td>{record.dateCreated}</td><td>{record.email}</td><td><span className={`${styles.statusBadge} ${badge(record.status)}`}>{record.status}</span></td><td><button type="button" className={styles.manageButton} onClick={() => navigate(`/admin/manage-qcpeso/${record.id}`)}><Eye size={16} />View</button></td></tr>)}{!records.length && <tr><td className={styles.empty} colSpan={5}>No personnel match the selected filters.</td></tr>}</tbody></table></div></section>
      <nav className={styles.pagination}><label className={styles.pageSizeControl}><span>View</span><select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1) }}><option value={7}>7</option><option value={14}>14</option><option value={21}>21</option></select><span>Personnel per page</span></label><div><button type="button" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}><ChevronLeft size={18} /></button><span className={styles.currentPage}>{page}</span><button type="button" disabled={page === pages} onClick={() => setPage((current) => Math.min(pages, current + 1))}><ChevronRight size={18} /></button></div></nav>
    </section>
  </main>
}

export default ManageQCPesoPage
