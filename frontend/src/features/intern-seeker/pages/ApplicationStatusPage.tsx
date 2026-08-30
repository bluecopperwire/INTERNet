import { useState } from 'react'
import { Check, ChevronRight, MapPin, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useApplications } from '../hooks/useApplications'
import type { ApplicationDisplayStatus, ApplicationProgress, InterviewDetails, UserApplication } from '../types/application.types'
import styles from './ApplicationStatusPage.module.css'

type DialogState =
  | { type: 'remark'; title: string; remark: string }
  | { type: 'interview'; companyName: string; interview: InterviewDetails }
  | { type: 'student-decision'; application: UserApplication }
  | null

function ApplicationStatusPage() {
  const { applications, isLoading, error, withdrawApplication, respondToOffer, deleteApplication } = useApplications()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dialog, setDialog] = useState<DialogState>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const selectedApplication = applications.find((application) => application.id === selectedId) ?? applications[0]

  const performUpdate = async (action: () => Promise<unknown>) => {
    setIsUpdating(true)
    try {
      await action()
      setDialog(null)
    } finally {
      setIsUpdating(false)
    }
  }

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
              <Link to="/intern-seeker/search">Apply to Company <span>+</span></Link>
            </header>
            <div className={styles.applicationList}>
              {applications.map((application) => <ApplicationListItem key={application.id} application={application} isSelected={application.id === selectedApplication?.id} onSelect={() => setSelectedId(application.id)} />)}
            </div>
          </section>

          {selectedApplication && <ApplicationProgress application={selectedApplication} isUpdating={isUpdating} onWithdraw={() => void performUpdate(() => withdrawApplication(selectedApplication.id))} onDelete={() => void performUpdate(() => deleteApplication(selectedApplication.id))} onOpenDialog={setDialog} />}
        </div>
      )}

      {dialog && <ApplicationDialog dialog={dialog} isUpdating={isUpdating} onClose={() => setDialog(null)} onDecision={(decision) => void performUpdate(() => respondToOffer(dialog.type === 'student-decision' ? dialog.application.id : '', decision))} />}
    </>
  )
}

function ApplicationListItem({ application, isSelected, onSelect }: { application: UserApplication; isSelected: boolean; onSelect: () => void }) {
  return (
    <button className={`${styles.applicationItem} ${isSelected ? styles.selectedItem : ''}`} type="button" onClick={onSelect}>
      <span className={styles.applicationIcon} aria-hidden="true" />
      <span className={styles.applicationInfo}><strong>{application.position}</strong><span>{application.companyName}</span></span>
      <span className={styles.applicationMeta}><StatusBadge status={application.status} /><small>Applied: {application.appliedDate}</small></span>
      <ChevronRight className={styles.chevron} />
    </button>
  )
}

function StatusBadge({ status }: { status: ApplicationDisplayStatus }) {
  const statusClass = status === 'Accepted' ? styles.accepted : status === 'Rejected' || status === 'Withdrawn' ? styles.rejected : status.includes('For Review') ? styles.forReview : styles.inProgress
  return <span className={`${styles.statusBadge} ${statusClass}`}>{status}</span>
}

function ApplicationProgress({ application, isUpdating, onWithdraw, onDelete, onOpenDialog }: { application: UserApplication; isUpdating: boolean; onWithdraw: () => void; onDelete: () => void; onOpenDialog: (dialog: DialogState) => void }) {
  const studentDecision = application.progress.find((step) => step.stage === 'Student Decision')
  const canWithdraw = studentDecision?.state !== 'completed' && studentDecision?.state !== 'rejected' && studentDecision?.state !== 'withdrawn'
  const canDelete = application.status === 'Rejected' || application.status === 'Withdrawn'

  return (
    <section className={styles.progressPanel} aria-labelledby="progress-heading">
      <header className={styles.progressHeader}><div><h2 id="progress-heading">Application Progress</h2><p>{application.companyName} - {application.position}</p></div></header>
      <div className={styles.timeline}>
        {application.progress.map((step, index) => <ProgressStep key={step.stage} step={step} isLast={index === application.progress.length - 1} onOpenDialog={onOpenDialog} application={application} />)}
      </div>
      <div className={styles.withdrawArea}>
        <button type="button" className={canDelete ? styles.deleteApplicationButton : styles.withdrawButton} disabled={(!canWithdraw && !canDelete) || isUpdating} onClick={canDelete ? onDelete : onWithdraw}>{isUpdating ? 'Updating...' : canDelete ? 'Delete Application' : 'Withdraw Application'}</button>
      </div>
    </section>
  )
}

function ProgressStep({ step, isLast, application, onOpenDialog }: { step: ApplicationProgress; isLast: boolean; application: UserApplication; onOpenDialog: (dialog: DialogState) => void }) {
  const dialog = step.interview
    ? { type: 'interview' as const, companyName: application.companyName, interview: step.interview }
    : step.remark
      ? { type: 'remark' as const, title: `${step.stage} Remark`, remark: step.remark }
      : step.stage === 'Student Decision' && step.state === 'current'
        ? { type: 'student-decision' as const, application }
        : null
  const isClickable = Boolean(dialog)
  const clickLabel = step.stage === 'Student Decision' ? 'Respond to offer' : step.interview ? 'View interview details' : 'View remark'

  return (
    <div className={`${styles.timelineStep} ${styles[step.state]} ${isClickable ? styles.clickableStep : ''}`}>
      <div className={styles.indicatorColumn}>
        <span className={styles.indicator}>{step.state === 'completed' ? <Check /> : step.state === 'rejected' || step.state === 'withdrawn' ? <X /> : <i />}</span>
        {!isLast && <span className={styles.timelineLine} />}
      </div>
      <button className={styles.stepContent} type="button" disabled={!isClickable} onClick={() => dialog && onOpenDialog(dialog)}>
        <h3>{step.stage}</h3>
        <p>{step.message}</p>
        {isClickable && <span className={styles.clickHint}>{clickLabel} <ChevronRight aria-hidden="true" /></span>}
        {step.timestamp && <small>{step.timestamp}</small>}
      </button>
    </div>
  )
}

function ApplicationDialog({ dialog, isUpdating, onClose, onDecision }: { dialog: Exclude<DialogState, null>; isUpdating: boolean; onClose: () => void; onDecision: (decision: 'accept' | 'reject') => void }) {
  const isInterview = dialog.type === 'interview'
  const isDecision = dialog.type === 'student-decision'
  const title = isInterview ? 'Interview Details' : isDecision ? 'Respond to Internship Offer' : dialog.title

  return (
    <div className={styles.modalBackdrop} role="presentation" onMouseDown={onClose}>
      <section className={styles.applicationModal} role="dialog" aria-modal="true" aria-labelledby="application-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className={styles.closeButton} type="button" aria-label="Close" onClick={onClose}><X /></button>
        <h2 id="application-dialog-title">{title}</h2>
        {isInterview && <InterviewContent interview={dialog.interview} companyName={dialog.companyName} />}
        {dialog.type === 'remark' && <p className={styles.remarkText}>{dialog.remark}</p>}
        {isDecision && <><p className={styles.decisionText}>Would you like to accept this internship offer from {dialog.application.companyName}?</p><div className={styles.decisionActions}><button type="button" className={styles.rejectButton} disabled={isUpdating} onClick={() => onDecision('reject')}>Reject Offer</button><button type="button" className={styles.acceptButton} disabled={isUpdating} onClick={() => onDecision('accept')}>{isUpdating ? 'Updating...' : 'Accept Offer'}</button></div></>}
      </section>
    </div>
  )
}

function InterviewContent({ companyName, interview }: { companyName: string; interview: InterviewDetails }) {
  return <><p className={styles.modalSubtitle}>{companyName} has scheduled an interview.</p><dl className={styles.interviewDetails}><div><dt>Date</dt><dd>{interview.date}</dd></div><div><dt>Time</dt><dd>{interview.time}</dd></div><div><dt>Interview Mode</dt><dd>{interview.mode === 'online' ? 'Online' : 'In-person'}</dd></div>{interview.mode === 'online' && interview.meetingUrl && <div><dt>Meeting URL</dt><dd><a href={interview.meetingUrl} target="_blank" rel="noreferrer">{interview.meetingUrl}</a></dd></div>}{interview.mode === 'in-person' && interview.location && <div><dt><MapPin size={16} />Location</dt><dd>{interview.location}</dd></div>}</dl>{interview.remark && <div className={styles.remarkBox}><strong>Remark</strong><p>{interview.remark}</p></div>}</>
}

export default ApplicationStatusPage
