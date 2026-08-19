import { useState } from 'react'
import { Check, ChevronRight, Info, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useApplications } from '../hooks/useApplications'
import type { ApplicationDisplayStatus, UserApplication } from '../types/application.types'
import styles from './ApplicationStatusPage.module.css'

function ApplicationStatusPage() {
  const { applications, isLoading, error } = useApplications()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selectedApplication = applications.find((application) => application.id === selectedId) ?? applications[0]

  return (
    <>
        {error && <p className={styles.feedback} role="alert">{error}</p>}
        {isLoading && <p className={styles.feedback}>Loading applications...</p>}
        {!isLoading && applications.length === 0 && <p className={styles.feedback}>You have not submitted any applications yet.</p>}

        {!isLoading && applications.length > 0 && (
          <div className={styles.applicationLayout}>
            <section className={styles.applicationListPanel} aria-labelledby="applications-heading">
              <header className={styles.listHeader}>
                <div><h2 id="applications-heading">My Applications</h2><p>Track your internship applications.</p></div>
                <Link to="/intern-seeker/search">Apply to Company <Plus /></Link>
              </header>
              <div className={styles.applicationList}>
                {applications.map((application) => (
                  <ApplicationListItem key={application.id} application={application} isSelected={application.id === selectedApplication?.id} onSelect={() => setSelectedId(application.id)} />
                ))}
              </div>
            </section>

            {selectedApplication && <ApplicationProgress application={selectedApplication} />}
          </div>
        )}
    </>
  )
}

function ApplicationListItem({ application, isSelected, onSelect }: { application: UserApplication; isSelected: boolean; onSelect: () => void }) {
  return (
    <button className={`${styles.applicationItem} ${isSelected ? styles.selectedItem : ''}`} type="button" onClick={onSelect}>
      <span className={styles.applicationIcon} aria-hidden="true" />
      <span className={styles.applicationInfo}><strong>{application.position}</strong><span>{application.companyName}</span><small>{application.industry}</small></span>
      <span className={styles.applicationMeta}><StatusBadge status={application.status} /><small>Applied: {application.appliedDate}</small></span>
      <ChevronRight className={styles.chevron} />
    </button>
  )
}

function StatusBadge({ status }: { status: ApplicationDisplayStatus }) {
  const statusClass = status === 'Accepted' ? styles.accepted : status === 'Rejected' ? styles.rejected : status.includes('For Review') ? styles.forReview : styles.inProgress
  return <span className={`${styles.statusBadge} ${statusClass}`}>{status}</span>
}

function ApplicationProgress({ application }: { application: UserApplication }) {
  return (
    <section className={styles.progressPanel} aria-labelledby="progress-heading">
      <header className={styles.progressHeader}>
        <div>
          <h2 id="progress-heading">Application Progress</h2>
          <p>{application.companyName} - {application.position}</p>
        </div>
      </header>
      <div className={styles.timeline}>
        {application.progress.map((step, index) => (
          <div className={`${styles.timelineStep} ${styles[step.status.toLowerCase()]}`} key={step.stage}>
            <div className={styles.indicatorColumn}>
              <span className={styles.indicator}>{step.status === 'Completed' ? <Check /> : <i />}</span>
              {index < application.progress.length - 1 && <span className={styles.timelineLine} />}
            </div>
            <div className={styles.stepContent}><h3>{step.stage}</h3><p>{step.timestamp ?? 'Pending'}</p>{step.notes && <small>{step.notes}</small>}</div>
          </div>
        ))}
      </div>
      <div className={styles.notice}><Info /><strong>We will notify you once there is an update on your application</strong></div>
    </section>
  )
}

export default ApplicationStatusPage
