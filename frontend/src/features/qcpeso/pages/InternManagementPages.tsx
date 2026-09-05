import { ArrowLeft, Building2, CalendarDays, ChartNoAxesColumnIncreasing, ChevronLeft, ChevronRight, Eye, Search, SlidersHorizontal, Star, Trash2, User } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { AttendanceHistoryView } from '../../../components/AttendanceHistoryView'
import { AttendanceProfileSummary } from '../../../components/AttendanceProfileSummary'
import { ConfirmDeleteModal } from '../../../components/feedback/ConfirmDeleteModal'
import { useToastStore } from '../../../stores/useToastStore'
import { getErrorMessage } from '../../../utils/error-message'
import QCPesoHero from '../components/QCPesoHero'
import { qcpesoApiService } from '../services/qcpeso-api.service'
import { todayDateOnly } from '../../../utils/date-only'
import attendanceStyles from '../../employer/pages/AttendanceMonitoringPage.module.css'
import attendanceDetailStyles from '../../employer/pages/AttendanceInternshipDetailsPage.module.css'
import internshipStyles from '../../employer/pages/MonitorInternshipPage.module.css'
import detailStyles from '../../employer/pages/MonitorInternshipDetailsPage.module.css'
import studentDetailStyles from '../../intern-seeker/components/StudentInternshipDetails.module.css'

const PAGE_SIZES = [5, 10, 15]
const ALL_STATUSES = ['pending', 'ongoing', 'complete_company', 'complete_student', 'withdrawn', 'cancelled', 'finalized']
const LABELS: Record<string, string> = { active: 'Active', closed: 'Closed', pending: 'Pending', ongoing: 'Ongoing', complete_company: 'Complete (Company)', complete_student: 'Complete (Student)', withdrawn: 'Withdrawn', cancelled: 'Cancelled', finalized: 'Finalized', present: 'Present', absent: 'Absent', incomplete: 'Incomplete' }
type Meta = { page: number; limit: number; total: number; totalPages: number }
const EMPTY_META: Meta = { page: 1, limit: 5, total: 0, totalPages: 0 }
const statusLabel = (value: unknown) => LABELS[String(value)] || String(value || '—')
const daysLabel = (days: unknown) => Array.isArray(days) ? days.map((d) => ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][Number(d)]).join(', ') : '—'

function SummaryCard({ label, value, styles }: { label: string; value: number | string; styles: Record<string, string> }) {
  return <article className={styles.summaryCard}><h2>{label}</h2><p>{String(value).padStart(2, '0')}</p></article>
}
function StatusPill({ value, styles }: { value: string; styles: Record<string, string> }) {
  const key = value.replaceAll('_', '').replaceAll(' ', '').toLowerCase()
  return <span className={`${styles.statusPill} ${styles[key] || ''}`}>{statusLabel(value)}</span>
}
function Pager({ meta, limit, setLimit, setPage, styles, noun = 'Students' }: { meta: Meta; limit: number; setLimit: (n: number) => void; setPage: (n: number) => void; styles: Record<string, string>; noun?: string }) {
  return <div className={styles.paginationRow}><div className={styles.leftControls ?? styles.perPage}><span>View</span><span className={styles.viewSelectBox ?? styles.selectWrap}><select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1) }}>{PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}</select></span><span>{noun} per page</span></div><div className={styles.pagination}><button type="button" aria-label="Previous page" disabled={meta.page <= 1} onClick={() => setPage(meta.page - 1)}><ChevronLeft size={18} /></button><button type="button" className={styles.active ?? styles.currentPage}>{meta.page}</button><button type="button" aria-label="Next page" disabled={meta.page >= Math.max(meta.totalPages, 1)} onClick={() => setPage(meta.page + 1)}><ChevronRight size={18} /></button></div></div>
}
function InternshipTable({ rows, onView, onDelete, wideStudentName = false }: { rows: any[]; onView: (id: number) => void; onDelete?: (row: any) => void; wideStudentName?: boolean }) {
  return <div className={internshipStyles.tableCard}><div className={internshipStyles.tableScroller}><table className={`${internshipStyles.table} ${internshipStyles.qcpesoInternshipTable} ${wideStudentName ? internshipStyles.wideStudentNameTable : ''}`}><thead><tr><th>Student Name</th><th>Company</th><th>Job Title</th><th>Program / Strand</th><th>Status</th><th>Action</th></tr></thead><tbody>{rows.map((row) => <tr key={row.internshipAssignmentId}><td>{row.studentFullName}</td><td>{row.companyName}</td><td>{row.jobTitle}</td><td>{row.strandProgram || '—'}</td><td><StatusPill value={row.assignmentStatus} styles={internshipStyles} /></td><td><div className={internshipStyles.rowActions}><button type="button" className={internshipStyles.viewButton} onClick={() => onView(row.internshipAssignmentId)}><Eye size={16} />View</button>{onDelete && row.assignmentStatus === 'finalized' && <button type="button" className={internshipStyles.deleteButton} onClick={() => onDelete(row)}><Trash2 size={16} />Delete</button>}</div></td></tr>)}</tbody></table></div>{rows.length === 0 && <p className={internshipStyles.emptyState}>No internship assignments match the selected filters.</p>}</div>
}
function InternshipToolbar({ search, setSearch, status, setStatus, statuses, reset }: any) {
  return <div className={internshipStyles.toolbar}><label className={internshipStyles.searchBox}><Search size={17} /><input value={search} onChange={(e) => { setSearch(e.target.value); reset() }} placeholder="Search students, companies, or job titles..." /></label><label className={internshipStyles.statusFilter}><SlidersHorizontal size={16} /><select value={status} onChange={(e) => { setStatus(e.target.value); reset() }}><option value="">All</option>{statuses.map((s: string) => <option key={s} value={s}>{statusLabel(s)}</option>)}</select></label></div>
}

export function QCPesoManageInternshipPage() {
  const navigate = useNavigate(); const [summary, setSummary] = useState<any>({}); const [rows, setRows] = useState<any[]>([]); const [meta, setMeta] = useState<Meta>(EMPTY_META)
  const [search, setSearch] = useState(''); const [status, setStatus] = useState(''); const [page, setPage] = useState(1); const [limit, setLimit] = useState(5)
  useEffect(() => { void qcpesoApiService.getFinalizationSummary().then(setSummary) }, [])
  useEffect(() => { void qcpesoApiService.getFinalizationQueue({ search: search || undefined, status: status || undefined, page, limit }).then((r) => { setRows(r.data); setMeta(r.meta) }) }, [search, status, page, limit])
  return <main className={internshipStyles.page}><QCPesoHero title="Finalize Internships" subtitle="Review ended internships and complete QC PESO finalization." /><section className={internshipStyles.content}><div className={internshipStyles.summaryGrid}><SummaryCard styles={internshipStyles} label="Awaiting Finalization" value={summary.awaitingFinalization || 0} /><SummaryCard styles={internshipStyles} label="Completed Internships" value={summary.completedInternships || 0} /><SummaryCard styles={internshipStyles} label="Withdrawn Internships" value={summary.withdrawalInternships || 0} /><SummaryCard styles={internshipStyles} label="Cancelled Internships" value={summary.cancelledInternships || 0} /></div><InternshipToolbar search={search} setSearch={setSearch} status={status} setStatus={setStatus} statuses={['complete_student', 'withdrawn', 'cancelled']} reset={() => setPage(1)} /><InternshipTable rows={rows} wideStudentName onView={(id) => navigate(`/qcpeso/manage-interns/internships/${id}`)} /><Pager meta={meta} limit={limit} setLimit={setLimit} setPage={setPage} styles={internshipStyles} /></section></main>
}

export function QCPesoInternshipHistoryPage() {
  const navigate = useNavigate(); const toast = useToastStore(); const [summary, setSummary] = useState<any>({}); const [rows, setRows] = useState<any[]>([]); const [meta, setMeta] = useState<Meta>(EMPTY_META)
  const [search, setSearch] = useState(''); const [status, setStatus] = useState(''); const [page, setPage] = useState(1); const [limit, setLimit] = useState(5)
  const [deleteTarget, setDeleteTarget] = useState<any>(null); const [deleting, setDeleting] = useState(false)
  const load = () => qcpesoApiService.getInternshipHistory({ search: search || undefined, status: status || undefined, page, limit }).then((r) => { setRows(r.data); setMeta(r.meta) })
  useEffect(() => { void qcpesoApiService.getInternshipHistorySummary().then(setSummary) }, [])
  useEffect(() => { void load() }, [search, status, page, limit])
  const remove = async () => { if (!deleteTarget || deleting) return; setDeleting(true); try { await qcpesoApiService.hideFinalizedInternship(deleteTarget.internshipAssignmentId); await Promise.all([load(), qcpesoApiService.getInternshipHistorySummary().then(setSummary)]); toast.success('Internship record hidden from QC PESO history.'); setDeleteTarget(null) } catch (error: unknown) { toast.error(getErrorMessage(error, 'Failed to hide internship record.')) } finally { setDeleting(false) } }
  return <><main className={internshipStyles.page}><QCPesoHero title="Internship History" subtitle="Review all internship assignment states and finalized records." /><section className={internshipStyles.content}><div className={`${internshipStyles.summaryGrid} ${internshipStyles.historySummaryGrid}`}><SummaryCard styles={internshipStyles} label="Total Internships" value={summary.totalInternships || 0} /><SummaryCard styles={internshipStyles} label="Active Internships" value={summary.activeInternships || 0} /><SummaryCard styles={internshipStyles} label="Closed Internships" value={summary.closedInternships || 0} /></div><InternshipToolbar search={search} setSearch={setSearch} status={status} setStatus={setStatus} statuses={['active', 'closed', ...ALL_STATUSES]} reset={() => setPage(1)} /><InternshipTable rows={rows} onView={(id) => navigate(`/qcpeso/manage-interns/history/${id}`)} onDelete={setDeleteTarget} /><Pager meta={meta} limit={limit} setLimit={setLimit} setPage={setPage} styles={internshipStyles} /></section></main>{deleteTarget && <ConfirmDeleteModal subject={`${deleteTarget.studentFullName}'s finalized internship record`} isDeleting={deleting} onClose={() => { if (!deleting) setDeleteTarget(null) }} onConfirm={remove} />}</>
}

type QcInternshipDetail = {
  intern: {
    studentFullName: string
    studentContactEmail?: string | null
    studentContactNumber?: string | null
    studentAddress?: string | null
    studentPhotoFilePath?: string | null
    studentProfileUpdatedAt?: string | null
    strandProgram?: string | null
    yearLevel?: string | null
    schoolName?: string | null
    renderedMinutes: number
    remainingMinutes: number
  }
  assignment: {
    internshipAssignmentId: number
    companyName: string
    jobTitle: string
    workingDays: number[]
    requiredMinutes: number
    startDate: string
    expectedEndDate?: string | null
    endDate?: string | null
    endedAt?: string | null
    startShift?: string | null
    endShift?: string | null
  }
  status: {
    assignmentStatus: string
    effectiveStatus?: string | null
    canFinalize: boolean
    canDelete: boolean
  }
  remarks: {
    studentWithdrawalRemark?: string | null
    companyCancellationRemark?: string | null
    companyReviewOfStudent?: string | null
    studentReviewOfCompany?: { rating: number; remark?: string | null } | null
  }
}

type QcDetailField = readonly [label: string, value: ReactNode]

export function QCPesoInternshipDetailsPage({ history = false }: { history?: boolean }) {
  const { id } = useParams()
  const assignmentId = Number(id)
  const navigate = useNavigate()
  const toast = useToastStore()
  const [data, setData] = useState<QcInternshipDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(false)
  const [busy, setBusy] = useState(false)
  const [deleteModal, setDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!Number.isInteger(assignmentId)) return
    const request = history
      ? qcpesoApiService.getInternshipHistoryDetail(assignmentId)
      : qcpesoApiService.getFinalizationDetail(assignmentId)
    void request
      .then(setData)
      .catch((requestError: unknown) => setError(getErrorMessage(requestError, 'Unable to load internship details.')))
      .finally(() => setLoading(false))
  }, [assignmentId, history])

  if (!Number.isInteger(assignmentId)) return <main className={detailStyles.feedback} role="alert">Internship assignment not found.</main>
  if (loading) return <main className={detailStyles.feedback}>Loading internship details...</main>
  if (error || !data) return <main className={detailStyles.feedback} role="alert">{error || 'Internship assignment not found.'}</main>

  const assignment = data.assignment
  const intern = data.intern
  const assignmentStatus = data.status.assignmentStatus
  const effectiveStatus = data.status.effectiveStatus || assignmentStatus
  const displayStatus = statusLabel(assignmentStatus)
  const statusClass = ['complete_company', 'complete_student'].includes(assignmentStatus) ? 'completed' : assignmentStatus
  const hasEnded = !['pending', 'ongoing'].includes(assignmentStatus)

  const internFields: QcDetailField[] = [
    ['Full Name', displayValue(intern.studentFullName)],
    ['Program / Strand', displayValue(intern.strandProgram)],
    ['Year Level', displayValue(intern.yearLevel)],
    ['School', displayValue(intern.schoolName)],
  ]
  const assignmentFields: QcDetailField[] = [
    ['Company', displayValue(assignment.companyName)],
    ['Job Title', displayValue(assignment.jobTitle)],
    ['Required Hours', formatDetailMinutes(assignment.requiredMinutes)],
  ]
  const scheduleFields: QcDetailField[] = [
    ['Working Days', displayValue(daysLabel(assignment.workingDays))],
    ['Start Date', formatAssignmentDate(assignment.startDate)],
    [hasEnded ? 'End Date' : 'Expected End Date', formatAssignmentDate(hasEnded ? (assignment.endDate || assignment.endedAt || assignment.expectedEndDate) : assignment.expectedEndDate)],
    ['Shift Start', formatClockTime(assignment.startShift)],
    ['Shift End', formatClockTime(assignment.endShift)],
  ]
  const statusFields: QcDetailField[] = [
    ['Status', displayStatus],
    ['Rendered Hours', formatDetailMinutes(intern.renderedMinutes)],
    ['Remaining Hours', formatDetailMinutes(intern.remainingMinutes)],
  ]

  const finalize = async () => {
    if (busy || !data.status.canFinalize) return
    setBusy(true)
    try {
      await qcpesoApiService.finalizeInternship(assignmentId)
      toast.success('Internship finalized successfully.')
      navigate('/qcpeso/manage-interns/internships')
    } catch (requestError: unknown) {
      toast.error(getErrorMessage(requestError, 'Failed to finalize internship.'))
    } finally {
      setBusy(false)
    }
  }

  const deleteRecord = async () => {
    if (deleting || !data.status.canDelete) return
    setDeleting(true)
    try {
      await qcpesoApiService.hideFinalizedInternship(assignmentId)
      toast.success('Internship record hidden from QC PESO history.')
      navigate('/qcpeso/manage-interns/history')
    } catch (requestError: unknown) {
      toast.error(getErrorMessage(requestError, 'Failed to hide internship record.'))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <main className={detailStyles.page}>
      <div className={detailStyles.wrap}>
        <button type="button" className={detailStyles.backButton} onClick={() => navigate(history ? '/qcpeso/manage-interns/history' : '/qcpeso/manage-interns/internships')}>
          <ArrowLeft size={19} />{history ? 'Back to Internship History' : 'Back to Finalize Internships'}
        </button>

        <section className={`${studentDetailStyles.detailsShell} ${detailStyles.detailsShell}`} aria-labelledby="qcpeso-internship-title">
          <header className={studentDetailStyles.pageHeading}>
            <div>
              <h1 id="qcpeso-internship-title">Internship Details</h1>
              <p>Review the intern's assignment, approved schedule, progress, and outcome.</p>
            </div>
            <span className={`${studentDetailStyles.statusTag} ${studentDetailStyles[statusClass] ?? ''}`}>{displayStatus}</span>
          </header>

          <div className={studentDetailStyles.content}>
            <AttendanceProfileSummary profile={{
              studentFullName: intern.studentFullName,
              studentContactEmail: intern.studentContactEmail,
              studentContactNumber: intern.studentContactNumber,
              studentAddress: intern.studentAddress,
              studentPhotoFilePath: intern.studentPhotoFilePath,
              studentProfileUpdatedAt: intern.studentProfileUpdatedAt,
              jobTitle: assignment.jobTitle,
              companyName: assignment.companyName,
            }} />

            <div className={studentDetailStyles.sectionStack}>
              <QcDetailSection icon={<User size={18} />} title="Intern Information" fields={internFields} />
              <QcDetailSection icon={<Building2 size={18} />} title="Assignment Information" fields={assignmentFields} />
              <QcDetailSection icon={<CalendarDays size={18} />} title="Schedule Information" fields={scheduleFields} />
              <QcDetailSection icon={<ChartNoAxesColumnIncreasing size={18} />} title="Status Information" fields={statusFields} />
              <QcOutcomeSections data={data} effectiveStatus={effectiveStatus} />
            </div>
          </div>
        </section>

        {history && (
          <footer className={detailStyles.companyActions}>
            <button type="button" className={detailStyles.completeButton} onClick={() => navigate(`/qcpeso/manage-interns/attendance/${assignmentId}`, { state: { attendanceHistoryBackPath: `/qcpeso/manage-interns/history/${assignmentId}` } })}>
              View Attendance History
            </button>
          </footer>
        )}
        {history && data.status.canDelete && (
          <footer className={detailStyles.companyActions}>
            <button type="button" className={detailStyles.deleteRecordButton} onClick={() => setDeleteModal(true)}>
              Delete
            </button>
          </footer>
        )}
        {!history && (
          <footer className={detailStyles.companyActions}>
            <button type="button" className={detailStyles.completeButton} disabled={!data.status.canFinalize || busy} onClick={() => setModal(true)}>
              Finalize Internship
            </button>
          </footer>
        )}
      </div>

      {modal && (
        <div className={detailStyles.modalBackdrop} role="presentation" onMouseDown={() => { if (!busy) setModal(false) }}>
          <section className={detailStyles.modal} role="dialog" aria-modal="true" aria-labelledby="qcpeso-finalize-title" onMouseDown={(event) => event.stopPropagation()}>
            <h2 id="qcpeso-finalize-title">Finalize Internship</h2>
            <p>This moves the internship to finalized history while preserving all attendance, remarks, and reviews.</p>
            <div className={detailStyles.modalActions}>
              <button type="button" className={detailStyles.cancelButton} disabled={busy} onClick={() => setModal(false)}>Close</button>
              <button type="button" className={detailStyles.completeButton} disabled={busy} onClick={() => void finalize()}>{busy ? 'Finalizing...' : 'Finalize Internship'}</button>
            </div>
          </section>
        </div>
      )}
      {deleteModal && (
        <ConfirmDeleteModal
          subject={`${intern.studentFullName}'s finalized internship record`}
          isDeleting={deleting}
          onClose={() => { if (!deleting) setDeleteModal(false) }}
          onConfirm={() => void deleteRecord()}
        />
      )}
    </main>
  )
}

function QcDetailSection({ icon, title, fields }: { icon: ReactNode; title: string; fields: QcDetailField[] }) {
  const headingId = `qcpeso-${title.toLowerCase().replaceAll(' ', '-')}-heading`
  return (
    <section className={studentDetailStyles.infoCard} aria-labelledby={headingId}>
      <h2 className={studentDetailStyles.sectionTitle} id={headingId}><span>{icon}</span>{title}</h2>
      <dl className={studentDetailStyles.infoList}>
        {fields.map(([label, value]) => <div className={studentDetailStyles.infoRow} key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl>
    </section>
  )
}

function QcOutcomeSections({ data, effectiveStatus }: { data: QcInternshipDetail; effectiveStatus: string }) {
  if (effectiveStatus === 'withdrawn') {
    return <QcRemarkCard icon={<User size={18} />} title="Internship Withdrawal Remark" remark={data.remarks.studentWithdrawalRemark} />
  }
  if (effectiveStatus === 'cancelled') {
    return <QcRemarkCard icon={<Building2 size={18} />} title="Internship Cancellation Remark" remark={data.remarks.companyCancellationRemark} />
  }
  if (effectiveStatus === 'complete_company') {
    return <QcRemarkCard icon={<ChartNoAxesColumnIncreasing size={18} />} title="Company Review about the Student" remark={data.remarks.companyReviewOfStudent} />
  }
  if (effectiveStatus === 'complete_student') {
    return <>
      <QcRemarkCard icon={<ChartNoAxesColumnIncreasing size={18} />} title="Company Review about the Student" remark={data.remarks.companyReviewOfStudent} />
      <QcStudentReviewCard review={data.remarks.studentReviewOfCompany} />
    </>
  }
  return null
}

function QcRemarkCard({ icon, title, remark }: { icon: ReactNode; title: string; remark?: string | null }) {
  const headingId = `qcpeso-${title.toLowerCase().replaceAll(' ', '-')}-heading`
  return <section className={studentDetailStyles.infoCard} aria-labelledby={headingId}>
    <h2 className={studentDetailStyles.sectionTitle} id={headingId}><span>{icon}</span>{title}</h2>
    <p className={studentDetailStyles.outcomeRemark}>{remark?.trim() || 'No remark was provided.'}</p>
  </section>
}

function QcStudentReviewCard({ review }: { review?: { rating: number; remark?: string | null } | null }) {
  const rating = Math.min(5, Math.max(0, Math.round(Number(review?.rating) || 0)))
  return <section className={studentDetailStyles.infoCard} aria-labelledby="qcpeso-student-review-heading">
    <h2 className={studentDetailStyles.sectionTitle} id="qcpeso-student-review-heading"><span><Star size={18} /></span>Student Review about the Company</h2>
    <div className={detailStyles.reviewContent}>
      <div className={detailStyles.reviewLine}>
        <strong className={detailStyles.reviewLabel}>Star Rating:</strong>
        <div className={detailStyles.reviewStars} aria-label={`${rating} out of 5 stars`}>
          {[1, 2, 3, 4, 5].map((star) => <span className={star <= rating ? detailStyles.selectedReviewStar : ''} key={star} aria-hidden="true">★</span>)}
        </div>
      </div>
      <p className={detailStyles.reviewRemark}><strong className={detailStyles.reviewLabel}>Remark:</strong> {review?.remark?.trim() || 'No review remark was provided.'}</p>
    </div>
  </section>
}

function formatDetailMinutes(value: unknown): string {
  const minutes = Math.max(0, Math.round(Number(value) || 0))
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  if (remainder === 0) return `${hours} ${hours === 1 ? 'hour' : 'hours'}`
  if (hours === 0) return `${remainder} ${remainder === 1 ? 'minute' : 'minutes'}`
  return `${hours} ${hours === 1 ? 'hour' : 'hours'}, ${remainder} ${remainder === 1 ? 'minute' : 'minutes'}`
}

function formatAssignmentDate(value?: string | null): string {
  if (!value) return 'Not specified'
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value)
  const parsed = new Date(dateOnly ? `${value}T00:00:00+08:00` : value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', month: 'long', day: 'numeric', year: 'numeric' }).format(parsed)
}

function formatClockTime(value?: string | null): string {
  if (!value) return 'Not specified'
  const [hourValue, minuteValue] = value.split(':')
  const hour = Number(hourValue)
  if (!Number.isInteger(hour) || minuteValue === undefined) return value
  const period = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${minuteValue} ${period}`
}

function displayValue(value?: string | null): string {
  return value?.trim() || 'Not specified'
}

export function QCPesoAttendancePage() {
  const navigate = useNavigate(); const [summary, setSummary] = useState<any>({}); const [rows, setRows] = useState<any[]>([]); const [meta, setMeta] = useState<Meta>(EMPTY_META)
  const [search, setSearch] = useState(''); const [status, setStatus] = useState(''); const [date, setDate] = useState(todayDateOnly()); const [page, setPage] = useState(1); const [limit, setLimit] = useState(5)
  useEffect(() => { void qcpesoApiService.getInternshipAttendanceSummary(date).then(setSummary) }, [date])
  useEffect(() => { void qcpesoApiService.getInternshipAttendance({ date, search: search || undefined, status: status || undefined, page, limit }).then((r) => { setRows(r.data); setMeta(r.meta) }) }, [date, search, status, page, limit])
  return <main className={attendanceStyles.pageContainer}><QCPesoHero title="Monitor Attendance" subtitle="Monitor daily attendance using each assignment's historical lifecycle." /><section className={attendanceStyles.mainContent}><div className={`${attendanceStyles.summaryGrid} ${attendanceStyles.threeCards}`}><SummaryCard styles={attendanceStyles} label="Ongoing Interns" value={summary.ongoingInterns || 0} /><SummaryCard styles={attendanceStyles} label="Present Interns" value={summary.presentInterns || 0} /><SummaryCard styles={attendanceStyles} label="Absent Interns" value={summary.absentInterns || 0} /></div><div className={attendanceStyles.toolbar}><label className={attendanceStyles.searchBox}><Search size={16} /><input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} placeholder="Search student, company, or job..." /></label><label className={attendanceStyles.statusFilter}><SlidersHorizontal size={16} /><select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}><option value="">All</option><option value="pending">Pending</option><option value="present">Present</option><option value="absent">Absent</option><option value="incomplete">Incomplete</option></select></label><label className={attendanceStyles.dateFilter}><CalendarDays size={16} /><input type="date" max={todayDateOnly()} value={date} onChange={(e) => { setDate(e.target.value); setPage(1) }} /></label></div><div className={attendanceStyles.tableCard}><div className={attendanceStyles.tableScroller}><table className={`${attendanceStyles.table} ${attendanceStyles.qcpesoAttendanceTable}`}><thead><tr><th>Student Name</th><th>Company</th><th>Job Title</th><th>Program / Strand</th><th>Status</th><th>Action</th></tr></thead><tbody>{rows.map((row) => <tr key={row.internshipAssignmentId}><td>{row.studentFullName}</td><td>{row.companyName}</td><td>{row.jobTitle}</td><td>{row.strandProgram || '—'}</td><td><StatusPill value={row.status} styles={attendanceStyles} /></td><td><button className={attendanceStyles.actionBtn} onClick={() => navigate(`/qcpeso/manage-interns/attendance/${row.internshipAssignmentId}`, { state: { attendanceHistoryBackPath: '/qcpeso/manage-interns/attendance' } })}><Eye size={14} />View</button></td></tr>)}</tbody></table></div>{rows.length === 0 && <p className={attendanceStyles.noData}>No scheduled interns match the selected date and filters.</p>}</div><Pager meta={meta} limit={limit} setLimit={setLimit} setPage={setPage} styles={attendanceStyles} /></section></main>
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
