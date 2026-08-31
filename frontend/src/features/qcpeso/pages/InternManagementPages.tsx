import { ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, Clock3, Eye, Search, SlidersHorizontal, UserRound } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import QCPesoHero from '../components/QCPesoHero'
import { qcpesoService } from '../services/qcpeso.service'
import type { QCPesoAttendanceRecord, QCPesoInternshipRecord } from '../types/qcpeso.types'
import attendanceStyles from '../../employer/pages/AttendanceMonitoringPage.module.css'
import attendanceDetailStyles from '../../employer/pages/AttendanceInternshipDetailsPage.module.css'
import internshipStyles from '../../employer/pages/MonitorInternshipPage.module.css'
import internshipDetailStyles from '../../employer/pages/MonitorInternshipDetailsPage.module.css'
import { todayDateOnly } from '../../../utils/date-only'

function AttendanceSummaryCard({ label, value }: { label: string; value: number }) {
  return <article className={attendanceStyles.summaryCard}><h2>{label}</h2><p>{String(value).padStart(2, '0')}</p></article>
}

function InternshipSummaryCard({ label, value }: { label: string; value: number }) {
  return <article className={internshipStyles.summaryCard}><h2>{label}</h2><p>{String(value).padStart(2, '0')}</p></article>
}

function AttendanceStatusPill({ value }: { value: QCPesoAttendanceRecord['status'] }) {
  return <span className={`${attendanceStyles.statusPill} ${attendanceStyles[value.toLowerCase()]}`}>{value}</span>
}

export function QCPesoAttendancePage() {
  const navigate = useNavigate()
  const [records, setRecords] = useState<QCPesoAttendanceRecord[]>([])
  const [internships, setInternships] = useState<QCPesoInternshipRecord[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('All')
  const [date, setDate] = useState(() => todayDateOnly())
  const [page, setPage] = useState(1)
  const perPage = 7

  useEffect(() => {
    qcpesoService.getInternships().then(setInternships)
  }, [])

  useEffect(() => {
    qcpesoService
      .getAttendanceRecords({
        date,
        status: status !== 'All' ? status : undefined,
        search: search.trim() || undefined,
        limit: 100,
      })
      .then(setRecords)
  }, [date, status, search])

  const filtered = useMemo(() => {
    return records.filter((record) => {
      const matchesSearch = !search || `${record.studentName} ${record.company} ${record.jobTitle}`.toLowerCase().includes(search.toLowerCase())
      const matchesStatus = status === 'All' || record.status === status
      const matchesDate = !date || record.date === date
      return matchesSearch && matchesStatus && matchesDate
    })
  }, [records, search, status, date])

  const displayed = filtered.slice((page - 1) * perPage, page * perPage)
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))

  const activeInternsCount = internships.filter((i) => i.status === 'On Going').length || internships.length
  const dateRecords = records.filter((record) => !date || record.date === date)
  const presentCount = dateRecords.filter((record) => record.status === 'Present').length
  const lateCount = dateRecords.filter((record) => record.status === 'Late').length
  const absentCount = Math.max(0, activeInternsCount - presentCount - lateCount)

  const summary = {
    active: activeInternsCount,
    present: presentCount,
    absent: absentCount,
    late: lateCount,
  }

  return (
    <main className={attendanceStyles.pageContainer}>
      <QCPesoHero title="Monitor Attendance" subtitle="Monitor daily attendance records of active interns." />
      <section className={attendanceStyles.mainContent}>
        <div className={attendanceStyles.summaryGrid}>
          <AttendanceSummaryCard label="Total Active Interns" value={summary.active} />
          <AttendanceSummaryCard label="Present" value={summary.present} />
          <AttendanceSummaryCard label="Absent" value={summary.absent} />
          <AttendanceSummaryCard label="Late" value={summary.late} />
        </div>
        <div className={attendanceStyles.toolbar}>
          <label className={attendanceStyles.searchBox}>
            <Search size={16} />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder="Search student, company, or job title..."
            />
          </label>
          <label className={attendanceStyles.statusFilter}>
            <SlidersHorizontal size={16} />
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value)
                setPage(1)
              }}
            >
              <option value="All">All Statuses</option>
              <option>Present</option>
              <option>Absent</option>
              <option>Late</option>
            </select>
          </label>
          <label className={attendanceStyles.dateFilter}>
            <CalendarDays size={16} />
            <input
              type="date"
              value={date}
              max={todayDateOnly()}
              onChange={(event) => {
                setDate(event.target.value)
                setPage(1)
              }}
              aria-label="Filter attendance by date"
            />
          </label>
        </div>
        <div className={attendanceStyles.tableCard}>
          <div className={attendanceStyles.tableScroller}>
            <table className={attendanceStyles.table}>
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Company</th>
                  <th>Job Title</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {displayed.map((record) => (
                  <tr key={record.id}>
                    <td>
                      <strong>{record.studentName}</strong>
                    </td>
                    <td>{record.company}</td>
                    <td>{record.jobTitle}</td>
                    <td>{record.date}</td>
                    <td>
                      <AttendanceStatusPill value={record.status} />
                    </td>
                    <td>
                      <button
                        className={attendanceStyles.actionBtn}
                        onClick={() => navigate(`/qcpeso/manage-interns/attendance/${record.internshipId}`)}
                      >
                        <Eye size={14} />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {displayed.length === 0 && (
            <p className={attendanceStyles.noData}>No attendance records match the selected filters.</p>
          )}
        </div>
        <Pager styles={attendanceStyles} page={page} totalPages={totalPages} setPage={setPage} />
      </section>
    </main>
  )
}

export function QCPesoAttendanceDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [internship, setInternship] = useState<QCPesoInternshipRecord | null>(null)
  const [records, setRecords] = useState<QCPesoAttendanceRecord[]>([])

  useEffect(() => {
    if (id) {
      Promise.all([
        qcpesoService.getInternship(id),
        qcpesoService.getAssignmentAttendance(id),
      ]).then(([details, attendance]) => {
        setInternship(details)
        setRecords(attendance)
      })
    }
  }, [id])

  if (!internship) return <main className={attendanceDetailStyles.feedback}>Loading internship details...</main>
  const remaining = Math.max(internship.requiredHours - internship.renderedHours, 0)

  const overviewFields: Array<[string, string]> = [
    ['Student Name', internship.studentName],
    ['Company', internship.company],
    ['Job Title', internship.jobTitle],
    ['Start Date', internship.startDate],
    ['Expected End Date', internship.expectedEndDate],
    ['Total Hours Rendered', `${internship.renderedHours} hours`],
    ['Target Hours', `${internship.requiredHours} hours`],
    ['Remaining Hours', `${remaining} hours`],
  ]

  return (
    <main className={attendanceDetailStyles.page}>
      <div className={attendanceDetailStyles.wrap}>
        <button className={attendanceDetailStyles.backButton} onClick={() => navigate('/qcpeso/manage-interns/attendance')}>
          <ArrowLeft size={19} />
          Back to Monitor Attendance
        </button>
        <InternSummary styles={attendanceDetailStyles} internship={internship} remaining={remaining} />

        <section className={internshipDetailStyles.detailCard} style={{ marginBottom: 20 }}>
          <header className={internshipDetailStyles.cardHeader}>
            <div>
              <h2>Internship Overview</h2>
              <p>Student internship placement and hours tracking summary.</p>
            </div>
          </header>
          <div className={internshipDetailStyles.formGrid}>
            {overviewFields.map(([label, value]) => (
              <ReadonlyField key={label} styles={internshipDetailStyles} label={label} value={value} />
            ))}
          </div>
        </section>

        <section className={attendanceDetailStyles.detailCard}>
          <header className={attendanceDetailStyles.cardHeader}>
            <div>
              <h2>Attendance</h2>
              <p>Daily time records for this internship assignment.</p>
            </div>
          </header>
          <div className={attendanceDetailStyles.tableScroller}>
            <table className={attendanceDetailStyles.attendanceTable}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time In</th>
                  <th>Time In Status</th>
                  <th>Time Out</th>
                  <th>Rendered Hours</th>
                  <th>Rendered Hours Status</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id}>
                    <td>{record.date}</td>
                    <td>{record.timeIn}</td>
                    <td>
                      <DetailStatusPill value={record.status === 'Present' ? 'On Time' : record.status} />
                    </td>
                    <td>{record.timeOut}</td>
                    <td>{record.hoursRendered} hrs</td>
                    <td>
                      <DetailStatusPill value={renderedStatus(record)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {records.length === 0 && (
            <p className={attendanceDetailStyles.noRecords}>No attendance records are available for this intern.</p>
          )}
        </section>
      </div>
    </main>
  )
}

export function QCPesoManageInternshipPage() {
  const navigate = useNavigate()
  const [records, setRecords] = useState<QCPesoInternshipRecord[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('All')
  const [page, setPage] = useState(1)
  const perPage = 7
  useEffect(() => { qcpesoService.getInternships().then(setRecords) }, [])
  const filtered = useMemo(() => records.filter((record) => (!search || `${record.studentName} ${record.company} ${record.jobTitle}`.toLowerCase().includes(search.toLowerCase())) && (status === 'All' || record.status === status)), [records, search, status])
  const displayed = filtered.slice((page - 1) * perPage, page * perPage)
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  return <main className={internshipStyles.page}><QCPesoHero title="Manage Internship" subtitle="Manage and monitor active internship assignments." /><section className={internshipStyles.content}><div className={internshipStyles.summaryGrid}><InternshipSummaryCard label="Total Interns" value={records.length} /><InternshipSummaryCard label="On Going Interns" value={records.filter((item) => item.status === 'On Going').length} /><InternshipSummaryCard label="Completed Interns" value={records.filter((item) => item.status === 'Completed').length} /><InternshipSummaryCard label="Awaiting Completion" value={records.filter((item) => item.status === 'Awaiting Completion').length} /></div><div className={internshipStyles.toolbar}><label className={internshipStyles.searchBox}><Search size={17} /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Search students, companies, or job titles..." /></label><label className={internshipStyles.statusFilter}><SlidersHorizontal size={16} /><select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }}><option value="All">All Statuses</option><option>On Going</option><option>Completed</option><option>Awaiting Completion</option><option>Withdrawn by Student</option><option>Cancelled</option></select></label></div><div className={internshipStyles.tableCard}><div className={internshipStyles.tableScroller}><table className={internshipStyles.table}><thead><tr><th>Student Name</th><th>Company</th><th>Job Title</th><th>Remaining Hours</th><th>Status</th><th>Action</th></tr></thead><tbody>{displayed.map((record) => <tr key={record.id}><td><strong>{record.studentName}</strong></td><td>{record.company}</td><td>{record.jobTitle}</td><td>{Math.max(record.requiredHours - record.renderedHours, 0)} hrs</td><td><span className={`${internshipStyles.statusPill} ${internshipStyles[record.status.replaceAll(' ', '').toLowerCase()]}`}>{record.status}</span></td><td><button className={internshipStyles.viewButton} onClick={() => navigate(`/qcpeso/manage-interns/internships/${record.id}`)}><Eye size={16} />View</button></td></tr>)}</tbody></table></div>{displayed.length === 0 && <p className={internshipStyles.emptyState}>No interns match the selected filters.</p>}</div><Pager styles={internshipStyles} page={page} totalPages={totalPages} setPage={setPage} /></section></main>
}

export function QCPesoInternshipDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [internship, setInternship] = useState<QCPesoInternshipRecord | null>(null)
  useEffect(() => { if (id) qcpesoService.getInternship(id).then(setInternship) }, [id])
  if (!internship) return <main className={internshipDetailStyles.feedback}>Loading internship details...</main>
  const remaining = Math.max(internship.requiredHours - internship.renderedHours, 0)
  const fields: Array<[string, string]> = [['Company', internship.company], ['Job Title', internship.jobTitle], ['Working Days', internship.workingDays], ['Required Hours', `${internship.requiredHours} hours`], ['Start Date', internship.startDate], ['Expected End Date', internship.expectedEndDate], ['Shift Start Time', internship.shiftStartTime], ['Shift End Time', internship.shiftEndTime]]
  return <main className={internshipDetailStyles.page}><div className={internshipDetailStyles.wrap}><button className={internshipDetailStyles.backButton} onClick={() => navigate('/qcpeso/manage-interns/internships')}><ArrowLeft size={19} />Back to Manage Internship</button><InternSummary styles={internshipDetailStyles} internship={internship} remaining={remaining} /><section className={internshipDetailStyles.detailCard}><header className={internshipDetailStyles.cardHeader}><div><h2>Internship Details</h2><p>Current internship assignment and schedule.</p></div></header><div className={internshipDetailStyles.formGrid}>{fields.map(([label, value]) => <ReadonlyField key={label} styles={internshipDetailStyles} label={label} value={value} />)}</div></section><section className={internshipDetailStyles.statusCard}><header className={internshipDetailStyles.statusHeader}><h2>Internship Status</h2><p>Track the progress of this internship placement.</p></header><div className={internshipDetailStyles.statusGrid}><ReadonlyField styles={internshipDetailStyles} label="Status" value={internship.status} /><ReadonlyField styles={internshipDetailStyles} label="Target Hours" value={`${internship.requiredHours} hours`} /><ReadonlyField styles={internshipDetailStyles} label="Rendered Hours" value={`${internship.renderedHours} hours`} /><ReadonlyField styles={internshipDetailStyles} label="Remaining Hours" value={`${remaining} hours`} /></div></section></div></main>
}

function Pager({ styles, page, totalPages, setPage }: { styles: Record<string, string>; page: number; totalPages: number; setPage: (value: number) => void }) {
  return <div className={styles.paginationRow}><div className={styles.leftControls ?? styles.perPage}><span>View</span><span className={styles.viewSelectBox ?? styles.selectWrap}><select defaultValue="7"><option>7</option><option>10</option><option>15</option></select></span><span>Students per page</span></div><div className={styles.pagination}><button disabled={page === 1} onClick={() => setPage(page - 1)}><ChevronLeft size={18} /></button><button className={styles.active ?? styles.currentPage}>{page}</button><button disabled={page === totalPages} onClick={() => setPage(page + 1)}><ChevronRight size={18} /></button></div></div>
}

function InternSummary({ styles, internship, remaining }: { styles: Record<string, string>; internship: QCPesoInternshipRecord; remaining: number }) {
  return <section className={styles.studentSummary}><span className={styles.studentIcon}><UserRound size={28} /></span><div><h1>{internship.studentName}</h1><p>{internship.jobTitle} • {internship.company}</p></div><div className={styles.hoursSummary}><Clock3 size={19} /><div><strong>{internship.renderedHours} / {internship.requiredHours} hours</strong><span>{remaining} hours remaining</span></div></div></section>
}

function ReadonlyField({ styles, label, value }: { styles: Record<string, string>; label: string; value: string }) { return <label className={styles.field}><span>{label}</span><input value={value} readOnly /></label> }

function DetailStatusPill({ value }: { value: string }) { const className = value.replaceAll(' ', '').toLowerCase(); return <span className={`${attendanceDetailStyles.statusPill} ${attendanceDetailStyles[className] ?? ''}`}>{value}</span> }

function renderedStatus(record: QCPesoAttendanceRecord) { if (record.status === 'Absent' || record.hoursRendered === 0) return 'Incomplete'; if (record.hoursRendered < 8) return 'Undertime'; if (record.hoursRendered > 8) return 'Overtime'; return 'Complete' }
