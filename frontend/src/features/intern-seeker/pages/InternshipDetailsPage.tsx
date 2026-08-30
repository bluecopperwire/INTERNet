import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { TrackingDataProvider, useTrackingData } from '../components/TrackingDataContext'
import styles from './InternshipDetailsPage.module.css'

export function InternshipDetailsPage() {
  return (
    <TrackingDataProvider>
      <InternshipDetailsContent />
    </TrackingDataProvider>
  )
}

function InternshipDetailsContent() {
  const navigate = useNavigate()
  const { internshipDetails, isInitializing, attendanceError } = useTrackingData()

  if (isInitializing) return <main className={styles.feedback}>Loading internship details...</main>
  if (!internshipDetails) return <main className={styles.feedback}>{attendanceError ?? 'Internship details are unavailable.'}</main>

  const internshipFields = [
    ['Company', internshipDetails.companyName],
    ['Job Title', internshipDetails.jobTitle],
    ['Working Days', internshipDetails.workingDays],
    ['Required Hours', `${internshipDetails.requiredHours} hours`],
    ['Start Date', internshipDetails.startDate],
    ['Expected End Date', internshipDetails.expectedEndDate],
    ['Shift Start Time', internshipDetails.shiftStart],
    ['Shift End Time', internshipDetails.shiftEnd],
  ]

  const statusFields = [
    ['Status', internshipDetails.status],
    ['Target Hours', `${internshipDetails.targetHours} hours`],
    ['Rendered Hours', `${internshipDetails.renderedHours} hours`],
    ['Remaining Hours', `${internshipDetails.remainingHours} hours`],
  ]

  return (
    <main className={styles.page}>
      <button className={styles.backButton} type="button" onClick={() => navigate('/intern-seeker/attendance')}>
        <ArrowLeft size={20} aria-hidden="true" />
        Back to Attendance
      </button>

      <section className={styles.card} aria-labelledby="internship-details-heading">
        <header className={styles.cardHeader}>
          <h1 id="internship-details-heading">Internship Details</h1>
          <p>Your active internship assignment and schedule.</p>
        </header>
        <div className={styles.cardBody}>
          <DetailGrid fields={internshipFields} />
        </div>
      </section>

      <section className={styles.card} aria-labelledby="internship-status-heading">
        <header className={styles.cardHeader}>
          <h2 id="internship-status-heading">Internship Status</h2>
          <p>Track the progress of your required internship hours.</p>
        </header>
        <div className={styles.cardBody}>
          <DetailGrid fields={statusFields} />
          <button className={styles.withdrawButton} type="button">Withdraw Internship</button>
        </div>
      </section>
    </main>
  )
}

function DetailGrid({ fields }: { fields: string[][] }) {
  return (
    <dl className={styles.detailGrid}>
      {fields.map(([label, value]) => (
        <div className={styles.field} key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  )
}
