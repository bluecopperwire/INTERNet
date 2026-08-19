import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, Eye, Filter, Search } from 'lucide-react'
import headerImage from '../../../assets/requirements-header-image.png'
import peopleIcon from '../../../assets/people.svg'
import { ManageRecordModal } from '../components/ManageRecordModal'
import { adminService } from '../services/admin.service'
import type { QCPesoRecord } from '../types/admin.types'
import styles from './ManageStudentsPage.module.css'

export function ManageQCPesoPage() {
  const [personnel, setPersonnel] = useState<QCPesoRecord[]>([])
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('All Statuses')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(7)
  const [selectedPersonnel, setSelectedPersonnel] = useState<QCPesoRecord | null>(null)
  useEffect(() => { adminService.getQCPesoRecords().then(setPersonnel) }, [])
  const filtered = useMemo(() => personnel.filter((record) => { const term = query.trim().toLowerCase(); return (!term || record.fullName.toLowerCase().includes(term) || record.email.toLowerCase().includes(term) || record.position.toLowerCase().includes(term)) && (status === 'All Statuses' || record.status === status) }), [personnel, query, status])
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const records = filtered.slice((page - 1) * pageSize, page * pageSize)
  const badge = (value: QCPesoRecord['status']) => value === 'Active' ? styles.active : value === 'Deactivated' ? styles.deactivated : styles.inactive
  return <ManagementShell title="User Management" subtitle="View, update, and manage QC PESO personnel accounts." cards={[['Total Registered Personnel', '24'], ['Active Personnel Accounts', '22'], ['Deactivated Accounts', '2']]} icon={peopleIcon}>
    <section className={styles.managementCard}><div className={styles.toolbar}><label className={styles.searchBox}><Search size={19} /><span className={styles.srOnly}>Search QC PESO personnel</span><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} placeholder="Search personnel..." /></label><StatusSelect value={status} onChange={(value) => { setStatus(value); setPage(1) }} /></div>
      <div className={styles.tableWrap}><table><thead><tr><th>Personnel Name</th><th>Official Email</th><th>Assigned Role</th><th>Date Registered</th><th>Account Status</th><th>Action</th></tr></thead><tbody>{records.map((record) => <tr key={record.id}><td><strong>{record.fullName}</strong></td><td>{record.email}</td><td>{record.position}</td><td>{record.dateCreated}</td><td><span className={`${styles.statusBadge} ${badge(record.status)}`}>{record.status}</span></td><td><button type="button" className={styles.manageButton} onClick={() => setSelectedPersonnel(record)}><Eye size={16} />Manage</button></td></tr>)}{!records.length && <tr><td className={styles.empty} colSpan={6}>No personnel match the selected filters.</td></tr>}</tbody></table></div>
    </section><Pagination page={page} pages={pages} pageSize={pageSize} onPage={setPage} onPageSize={(value) => { setPageSize(value); setPage(1) }} />
    {selectedPersonnel && <ManageRecordModal recordId={selectedPersonnel.id} recordRole="QC PESO Personnel" onClose={() => setSelectedPersonnel(null)} />}
  </ManagementShell>
}

function ManagementShell({ title, subtitle, cards, icon, children }: { title: string; subtitle: string; cards: [string, string][]; icon: string; children: ReactNode }) { return <main className={styles.pageContainer}><header className={styles.hero}><img src={headerImage} alt="" className={styles.heroImage} /><div className={styles.heroOverlay} /><div className={styles.heroContent}><h1>{title}</h1><p>{subtitle}</p></div></header><section className={styles.mainContent}><div className={styles.summaryGrid}>{cards.map(([label, value]) => <article className={styles.summaryCard} key={label}><h2>{label}</h2><p>{value}</p><img src={icon} alt="" /></article>)}</div>{children}</section></main> }
function StatusSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) { return <label className={styles.statusFilter}><Filter size={17} /><span className={styles.srOnly}>Account status</span><select value={value} onChange={(event) => onChange(event.target.value)}><option>All Statuses</option><option>Active</option><option>Inactive</option><option>Deactivated</option></select></label> }
function Pagination({ page, pages, pageSize, onPage, onPageSize }: { page: number; pages: number; pageSize: number; onPage: (page: number) => void; onPageSize: (value: number) => void }) { return <nav className={styles.pagination}><label className={styles.pageSizeControl}><span>View</span><select value={pageSize} onChange={(event) => onPageSize(Number(event.target.value))}><option value={7}>7</option><option value={14}>14</option><option value={21}>21</option></select><span>Personnel per page</span></label><div><button type="button" disabled={page === 1} onClick={() => onPage(Math.max(1, page - 1))}><ChevronLeft size={18} /></button><span className={styles.currentPage}>{page}</span><button type="button" disabled={page === pages} onClick={() => onPage(Math.min(pages, page + 1))}><ChevronRight size={18} /></button></div></nav> }
export default ManageQCPesoPage
