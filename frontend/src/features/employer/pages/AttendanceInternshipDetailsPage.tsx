import { ArrowLeft, Clock3, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { employerService } from '../services/employer.service'
import type { EmployerAttendanceRecord, EmployerInternshipDetails } from '../types/employer.types'
import styles from './AttendanceInternshipDetailsPage.module.css'

export function AttendanceInternshipDetailsPage() {
  const { applicantId } = useParams<{ applicantId: string }>()
  const navigate = useNavigate()
  const [details, setDetails] = useState<EmployerInternshipDetails | null>(null)
  const [records, setRecords] = useState<EmployerAttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!applicantId) {
      return
    }
    Promise.all([employerService.getInternshipDetails(applicantId), employerService.getAttendanceRecords()])
      .then(([internshipDetails, attendanceRecords]) => {
        setDetails(internshipDetails ?? null)
        setRecords(attendanceRecords.filter((record) => record.applicantId === applicantId))
      })
      .finally(() => setLoading(false))
  }, [applicantId])

  if (!applicantId) return <main className={styles.feedback}>Internship details not found.</main>
  if (loading) return <main className={styles.feedback}>Loading internship details...</main>
  if (!details) return <main className={styles.feedback}>Internship details not found.</main>

  const remainingHours = Math.max(details.requiredHours - details.renderedHours, 0)

  return <main className={styles.page}>
    <div className={styles.wrap}>
      <button type="button" className={styles.backButton} onClick={() => navigate('/employer/attendance')}><ArrowLeft size={19} />Back to Monitor Attendance</button>

      <section className={styles.studentSummary}>
        <span className={styles.studentIcon}><UserRound size={28} /></span>
        <div><h1>{details.studentName}</h1><p>{details.jobTitle}</p></div>
        <div className={styles.hoursSummary}><Clock3 size={19} /><div><strong>{details.renderedHours} / {details.requiredHours} hours</strong><span>{remainingHours} hours remaining</span></div></div>
      </section>

      <section className={styles.detailCard}>
        <header className={styles.cardHeader}>
          <div><h2>Attendance</h2><p>Daily time records for this internship assignment.</p></div>
        </header>
        <div className={styles.tableScroller}>
          <table className={styles.attendanceTable}>
            <thead><tr><th>Date</th><th>Clock In Time</th><th>Clock Out Time</th><th>Rendered Time</th><th>Attendance Status</th></tr></thead>
            <tbody>{records.map((record) => <tr key={record.id}>
              <td>{record.date}</td>
              <td>{record.timeIn}</td>
              <td>{record.timeOut}</td>
              <td>{record.hoursRendered} hrs</td>
              <td><StatusPill value={record.status} /></td>
            </tr>)}</tbody>
          </table>
        </div>
        {records.length === 0 && <p className={styles.noRecords}>No attendance records are available for this intern.</p>}
      </section>
    </div>
  </main>
}

function StatusPill({ value }: { value: string }) {
  const styleName = value.replaceAll(' ', '').toLowerCase()
  return <span className={`${styles.statusPill} ${styles[styleName] ?? ''}`}>{value}</span>
}
