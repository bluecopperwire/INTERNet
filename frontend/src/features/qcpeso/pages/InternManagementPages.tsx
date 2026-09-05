import { ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, Eye, Search, SlidersHorizontal, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { AttendanceHistoryView } from '../../../components/AttendanceHistoryView'
import QCPesoHero from '../components/QCPesoHero'
import { qcpesoApiService } from '../services/qcpeso-api.service'
import { todayDateOnly } from '../../../utils/date-only'
import attendanceStyles from '../../employer/pages/AttendanceMonitoringPage.module.css'
import attendanceDetailStyles from '../../employer/pages/AttendanceInternshipDetailsPage.module.css'
import internshipStyles from '../../employer/pages/MonitorInternshipPage.module.css'
import detailStyles from '../../employer/pages/MonitorInternshipDetailsPage.module.css'

const PAGE_SIZES = [5, 10, 15]
const ALL_STATUSES = ['pending', 'ongoing', 'complete_company', 'complete_student', 'withdrawn', 'cancelled', 'finalized']
const LABELS: Record<string, string> = { pending: 'Pending', ongoing: 'Ongoing', complete_company: 'Complete (Company)', complete_student: 'Complete (Student)', withdrawn: 'Withdrawn', cancelled: 'Cancelled', finalized: 'Finalized', present: 'Present', absent: 'Absent', incomplete: 'Incomplete' }
type Meta = { page: number; limit: number; total: number; totalPages: number }
const EMPTY_META: Meta = { page: 1, limit: 5, total: 0, totalPages: 0 }
const duration = (value: unknown) => `${(Number(value || 0) / 60).toFixed(2)} hours (${Number(value || 0).toLocaleString()} minutes)`
const dateValue = (value: unknown) => value ? String(value).slice(0, 10) : '—'
const statusLabel = (value: unknown) => LABELS[String(value)] || String(value || '—')
const daysLabel = (days: unknown) => Array.isArray(days) ? days.map((d) => ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][Number(d)]).join(', ') : '—'

function SummaryCard({ label, value, styles }: { label: string; value: number | string; styles: Record<string, string> }) {
  return <article className={styles.summaryCard}><h2>{label}</h2><p>{String(value)}</p></article>
}
function StatusPill({ value, styles }: { value: string; styles: Record<string, string> }) {
  const key = value.replaceAll('_', '').replaceAll(' ', '').toLowerCase()
  return <span className={`${styles.statusPill} ${styles[key] || ''}`}>{statusLabel(value)}</span>
}
function Pager({ meta, limit, setLimit, setPage, styles, noun = 'Students' }: { meta: Meta; limit: number; setLimit: (n: number) => void; setPage: (n: number) => void; styles: Record<string, string>; noun?: string }) {
  return <div className={styles.paginationRow}><div className={styles.leftControls ?? styles.perPage}><span>View</span><span className={styles.viewSelectBox ?? styles.selectWrap}><select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1) }}>{PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}</select></span><span>{noun} per page</span></div><div className={styles.pagination}><button type="button" aria-label="Previous page" disabled={meta.page <= 1} onClick={() => setPage(meta.page - 1)}><ChevronLeft size={18} /></button><button type="button" className={styles.active ?? styles.currentPage}>{meta.page}</button><button type="button" aria-label="Next page" disabled={meta.page >= Math.max(meta.totalPages, 1)} onClick={() => setPage(meta.page + 1)}><ChevronRight size={18} /></button></div></div>
}
function InternshipTable({ rows, onView, onDelete }: { rows: any[]; onView: (id: number) => void; onDelete?: (id: number) => void }) {
  return <div className={internshipStyles.tableCard}><div className={internshipStyles.tableScroller}><table className={internshipStyles.table}><thead><tr><th>Student Name</th><th>Company</th><th>Job Title</th><th>Program / Strand</th><th>Status</th><th>Action</th></tr></thead><tbody>{rows.map((row) => <tr key={row.internshipAssignmentId}><td><strong>{row.studentFullName}</strong></td><td>{row.companyName}</td><td>{row.jobTitle}</td><td>{row.strandProgram || '—'}</td><td><StatusPill value={row.assignmentStatus} styles={internshipStyles} /></td><td><button type="button" className={internshipStyles.viewButton} onClick={() => onView(row.internshipAssignmentId)}><Eye size={16} />View</button>{onDelete && row.assignmentStatus === 'finalized' && <button type="button" className={internshipStyles.viewButton} onClick={() => onDelete(row.internshipAssignmentId)}><Trash2 size={16} />Delete</button>}</td></tr>)}</tbody></table></div>{rows.length === 0 && <p className={internshipStyles.emptyState}>No internship assignments match the selected filters.</p>}</div>
}
function InternshipToolbar({ search, setSearch, status, setStatus, statuses, reset }: any) {
  return <div className={internshipStyles.toolbar}><label className={internshipStyles.searchBox}><Search size={17} /><input value={search} onChange={(e) => { setSearch(e.target.value); reset() }} placeholder="Search students, companies, or job titles..." /></label><label className={internshipStyles.statusFilter}><SlidersHorizontal size={16} /><select value={status} onChange={(e) => { setStatus(e.target.value); reset() }}><option value="">All Statuses</option>{statuses.map((s: string) => <option key={s} value={s}>{statusLabel(s)}</option>)}</select></label></div>
}

export function QCPesoManageInternshipPage() {
  const navigate = useNavigate(); const [summary, setSummary] = useState<any>({}); const [rows, setRows] = useState<any[]>([]); const [meta, setMeta] = useState<Meta>(EMPTY_META)
  const [search, setSearch] = useState(''); const [status, setStatus] = useState(''); const [page, setPage] = useState(1); const [limit, setLimit] = useState(5)
  useEffect(() => { void qcpesoApiService.getFinalizationSummary().then(setSummary) }, [])
  useEffect(() => { void qcpesoApiService.getFinalizationQueue({ search: search || undefined, status: status || undefined, page, limit }).then((r) => { setRows(r.data); setMeta(r.meta) }) }, [search, status, page, limit])
  return <main className={internshipStyles.page}><QCPesoHero title="Finalize Internships" subtitle="Review ended internships and complete QC PESO finalization." /><section className={internshipStyles.content}><div className={internshipStyles.summaryGrid}><SummaryCard styles={internshipStyles} label="Awaiting Finalization" value={summary.awaitingFinalization || 0} /><SummaryCard styles={internshipStyles} label="Completed Internships" value={summary.completedInternships || 0} /><SummaryCard styles={internshipStyles} label="Withdrawal Internships" value={summary.withdrawalInternships || 0} /><SummaryCard styles={internshipStyles} label="Cancelled Internships" value={summary.cancelledInternships || 0} /></div><InternshipToolbar search={search} setSearch={setSearch} status={status} setStatus={setStatus} statuses={['complete_student', 'withdrawn', 'cancelled']} reset={() => setPage(1)} /><InternshipTable rows={rows} onView={(id) => navigate(`/qcpeso/manage-interns/internships/${id}`)} /><Pager meta={meta} limit={limit} setLimit={setLimit} setPage={setPage} styles={internshipStyles} /></section></main>
}

export function QCPesoInternshipHistoryPage() {
  const navigate = useNavigate(); const [summary, setSummary] = useState<any>({}); const [rows, setRows] = useState<any[]>([]); const [meta, setMeta] = useState<Meta>(EMPTY_META)
  const [search, setSearch] = useState(''); const [status, setStatus] = useState(''); const [page, setPage] = useState(1); const [limit, setLimit] = useState(5)
  const load = () => qcpesoApiService.getInternshipHistory({ search: search || undefined, status: status || undefined, page, limit }).then((r) => { setRows(r.data); setMeta(r.meta) })
  useEffect(() => { void qcpesoApiService.getInternshipHistorySummary().then(setSummary) }, [])
  useEffect(() => { void load() }, [search, status, page, limit])
  const remove = async (id: number) => { if (!window.confirm('Delete this finalized internship from your QC PESO history?')) return; await qcpesoApiService.hideFinalizedInternship(id); await Promise.all([load(), qcpesoApiService.getInternshipHistorySummary().then(setSummary)]) }
  return <main className={internshipStyles.page}><QCPesoHero title="Internship History" subtitle="Review all internship assignment states and finalized records." /><section className={internshipStyles.content}><div className={internshipStyles.summaryGrid}><SummaryCard styles={internshipStyles} label="Total Internships" value={summary.totalInternships || 0} /><SummaryCard styles={internshipStyles} label="Active Internships" value={summary.activeInternships || 0} /><SummaryCard styles={internshipStyles} label="Closed Internships" value={summary.closedInternships || 0} /></div><InternshipToolbar search={search} setSearch={setSearch} status={status} setStatus={setStatus} statuses={ALL_STATUSES} reset={() => setPage(1)} /><InternshipTable rows={rows} onView={(id) => navigate(`/qcpeso/manage-interns/history/${id}`)} onDelete={remove} /><Pager meta={meta} limit={limit} setLimit={setLimit} setPage={setPage} styles={internshipStyles} /></section></main>
}

export function QCPesoInternshipDetailsPage({ history = false }: { history?: boolean }) {
  const { id } = useParams(); const navigate = useNavigate(); const [data, setData] = useState<any>(null); const [modal, setModal] = useState(false); const [busy, setBusy] = useState(false)
  useEffect(() => { if (id) void (history ? qcpesoApiService.getInternshipHistoryDetail(Number(id)) : qcpesoApiService.getFinalizationDetail(Number(id))).then(setData) }, [id, history])
  if (!data) return <main className={detailStyles.feedback}>Loading internship details...</main>
  const a = data.assignment; const i = data.intern; const effective = data.status.effectiveStatus
  const fields: Array<[string, string]> = [['Student Name', i.studentFullName], ['Company', a.companyName], ['Job Title', a.jobTitle], ['Program / Strand', i.strandProgram || '—'], ['Working Days', daysLabel(a.workingDays)], ['Start Date', dateValue(a.startDate)], [a.endDate || a.endedAt ? 'Actual End Date' : 'Expected End Date', dateValue(a.endDate || a.endedAt || a.expectedEndDate)], ['Shift Start', String(a.startShift || '—').slice(0, 5)], ['Shift End', String(a.endShift || '—').slice(0, 5)], ['Required Hours', duration(a.requiredMinutes)], ['Rendered Hours', duration(i.renderedMinutes)], ['Remaining Hours', duration(i.remainingMinutes)], ['Assignment Status', statusLabel(data.status.assignmentStatus)]]
  const finalize = async () => { setBusy(true); await qcpesoApiService.finalizeInternship(Number(id)); navigate('/qcpeso/manage-interns/internships') }
  return <main className={detailStyles.page}><div className={detailStyles.wrap}><button className={detailStyles.backButton} onClick={() => navigate(history ? '/qcpeso/manage-interns/history' : '/qcpeso/manage-interns/internships')}><ArrowLeft size={19} />Back</button><section className={detailStyles.studentSummary}><div><h1>{a.jobTitle} at {a.companyName}</h1><p>{i.studentFullName}</p></div></section><section className={detailStyles.detailCard}><header className={detailStyles.cardHeader}><div><h2>Internship Details</h2><p>Read-only assignment and lifecycle information.</p></div></header><div className={detailStyles.formGrid}>{fields.map(([label, value]) => <ReadonlyField key={label} label={label} value={value} />)}</div></section><RemarkSections data={data} effective={effective} />{history && <div className={detailStyles.footer}><button type="button" className={detailStyles.completeButton} onClick={() => navigate(`/qcpeso/manage-interns/attendance/${id}`, { state: { attendanceHistoryBackPath: `/qcpeso/manage-interns/history/${id}` } })}>View Attendance History</button></div>}{!history && data.status.canFinalize && <div className={detailStyles.footer}><button type="button" className={detailStyles.completeButton} onClick={() => setModal(true)}>Finalize Internship</button></div>}</div>{modal && <div className={detailStyles.modalBackdrop}><div className={detailStyles.modal} role="dialog" aria-modal="true"><h2>Finalize Internship</h2><p>This moves the internship to finalized history while preserving all attendance, remarks, and reviews.</p><div className={detailStyles.modalActions}><button type="button" className={detailStyles.cancelButton} disabled={busy} onClick={() => setModal(false)}>Close</button><button type="button" className={detailStyles.completeButton} disabled={busy} onClick={finalize}>Finalize Internship</button></div></div></div>}</main>
}
function RemarkSections({ data, effective }: any) {
  const sections: Array<[string, string]> = []
  if (effective === 'withdrawn') sections.push(['Student Withdrawal Remark', data.remarks.studentWithdrawalRemark || '—'])
  if (effective === 'cancelled') sections.push(['Company Cancellation Remark', data.remarks.companyCancellationRemark || '—'])
  if (effective === 'complete_company' || effective === 'complete_student') sections.push(['Company Review of the Student', data.remarks.companyReviewOfStudent || '—'])
  if (effective === 'complete_student') { const review = data.remarks.studentReviewOfCompany; sections.push(['Student Review of the Company', review ? `${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)} — ${review.remark} (${dateValue(review.reviewedAt)})` : '—']) }
  if (!sections.length) return null
  return <section className={detailStyles.statusCard}><header className={detailStyles.statusHeader}><h2>Remarks and Reviews</h2></header><div className={detailStyles.statusGrid}>{sections.map(([label, value]) => <ReadonlyField key={label} label={label} value={value} />)}</div></section>
}
function ReadonlyField({ label, value }: { label: string; value: string }) { return <label className={detailStyles.field}><span>{label}</span><input readOnly value={value} /></label> }

export function QCPesoAttendancePage() {
  const navigate = useNavigate(); const [summary, setSummary] = useState<any>({}); const [rows, setRows] = useState<any[]>([]); const [meta, setMeta] = useState<Meta>(EMPTY_META)
  const [search, setSearch] = useState(''); const [status, setStatus] = useState(''); const [date, setDate] = useState(todayDateOnly()); const [page, setPage] = useState(1); const [limit, setLimit] = useState(5)
  useEffect(() => { void qcpesoApiService.getInternshipAttendanceSummary(date).then(setSummary) }, [date])
  useEffect(() => { void qcpesoApiService.getInternshipAttendance({ date, search: search || undefined, status: status || undefined, page, limit }).then((r) => { setRows(r.data); setMeta(r.meta) }) }, [date, search, status, page, limit])
  return <main className={attendanceStyles.pageContainer}><QCPesoHero title="Monitor Attendance" subtitle="Monitor daily attendance using each assignment's historical lifecycle." /><section className={attendanceStyles.mainContent}><div className={attendanceStyles.summaryGrid}><SummaryCard styles={attendanceStyles} label="Ongoing Interns" value={summary.ongoingInterns || 0} /><SummaryCard styles={attendanceStyles} label="Present Interns" value={summary.presentInterns || 0} /><SummaryCard styles={attendanceStyles} label="Absent Interns" value={summary.absentInterns || 0} /></div><div className={attendanceStyles.toolbar}><label className={attendanceStyles.searchBox}><Search size={16} /><input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} placeholder="Search student, company, or job..." /></label><label className={attendanceStyles.statusFilter}><SlidersHorizontal size={16} /><select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}><option value="">All Statuses</option><option value="pending">Pending</option><option value="present">Present</option><option value="absent">Absent</option><option value="incomplete">Incomplete</option></select></label><label className={attendanceStyles.dateFilter}><CalendarDays size={16} /><input type="date" max={todayDateOnly()} value={date} onChange={(e) => { setDate(e.target.value); setPage(1) }} /></label></div><div className={attendanceStyles.tableCard}><div className={attendanceStyles.tableScroller}><table className={attendanceStyles.table}><thead><tr><th>Student Name</th><th>Company</th><th>Job Title</th><th>Program / Strand</th><th>Status</th><th>Action</th></tr></thead><tbody>{rows.map((row) => <tr key={row.internshipAssignmentId}><td><strong>{row.studentFullName}</strong></td><td>{row.companyName}</td><td>{row.jobTitle}</td><td>{row.strandProgram || '—'}</td><td><StatusPill value={row.status} styles={attendanceStyles} /></td><td><button className={attendanceStyles.actionBtn} onClick={() => navigate(`/qcpeso/manage-interns/attendance/${row.internshipAssignmentId}`, { state: { attendanceHistoryBackPath: '/qcpeso/manage-interns/attendance' } })}><Eye size={14} />View</button></td></tr>)}</tbody></table></div>{rows.length === 0 && <p className={attendanceStyles.noData}>No scheduled interns match the selected date and filters.</p>}</div><Pager meta={meta} limit={limit} setLimit={setLimit} setPage={setPage} styles={attendanceStyles} /></section></main>
}

export function QCPesoAttendanceDetailsPage() {
  const { id } = useParams(); const location = useLocation(); const navigate = useNavigate(); const [data, setData] = useState<any>(null); const [status, setStatus] = useState(''); const [date, setDate] = useState(''); const [page, setPage] = useState(1); const [limit, setLimit] = useState(5)
  useEffect(() => { if (id) void qcpesoApiService.getInternshipAttendanceHistory(Number(id), { status: status || undefined, date: date || undefined, page, limit }).then(setData) }, [id, status, date, page, limit])
  if (!data) return <main className={attendanceDetailStyles.feedback}>Loading attendance history...</main>
  const historyDetailsPath = `/qcpeso/manage-interns/history/${id}`
  const backRoutes: Record<string, string> = { '/qcpeso/manage-interns/attendance': 'Back to Monitor Attendance', [historyDetailsPath]: 'Back to Internship Details' }
  const requestedBackPath = (location.state as { attendanceHistoryBackPath?: string } | null)?.attendanceHistoryBackPath
  const backPath = requestedBackPath && backRoutes[requestedBackPath] ? requestedBackPath : '/qcpeso/manage-interns/attendance'
  return <AttendanceHistoryView backLabel={backRoutes[backPath]} onBack={() => navigate(backPath)} profile={data.header} summary={data.summary} records={data.history.data.map((row: any) => ({ id: row.attendanceRecordId, date: row.date, timeIn: row.timeIn, timeOut: row.timeOut, renderedMinutes: row.renderedMinutes, status: row.attendanceStatus }))} date={date} status={status} onDateChange={(value) => { setDate(value); setPage(1) }} onStatusChange={(value) => { setStatus(value); setPage(1) }} page={page} limit={limit} totalPages={data.history.meta.totalPages} pageSizes={PAGE_SIZES} onPageChange={setPage} onLimitChange={(value) => { setLimit(value); setPage(1) }} />
}
