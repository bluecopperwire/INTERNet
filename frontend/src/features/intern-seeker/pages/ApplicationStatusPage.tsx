import { useEffect, useState } from 'react'
import { Building2, Check, ChevronRight, MapPin, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useApplications } from '../hooks/useApplications'
import type { ApplicationDisplayStatus, ApplicationProgress, InterviewDetails, UserApplication } from '../types/application.types'
import styles from './ApplicationStatusPage.module.css'
import { useToastStore } from '../../../stores/useToastStore'
import { applicationsService } from '../services/applications.service'
import { getErrorMessage } from '../../../utils/error-message'
import { ConfirmDeleteModal } from '../../../components/feedback/ConfirmDeleteModal'

type DialogState =
  | { type: 'remark'; title: string; remark: string }
  | { type: 'interview'; companyName: string; interview: InterviewDetails }
  | { type: 'student-decision'; application: UserApplication }
  | { type: 'withdraw'; application: UserApplication }
  | null

function ApplicationStatusPage() {
  const { applications, isLoading, error, withdrawApplication, respondToOffer, deleteApplication } = useApplications()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dialog, setDialog] = useState<DialogState>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<UserApplication | null>(null)
  const [detailResult, setDetailResult] = useState<{
    id: string
    application: UserApplication | null
    error: string | null
  } | null>(null)
  const showSuccessToast = useToastStore((state) => state.success)
  const showErrorToast = useToastStore((state) => state.error)
  const validSelectedId = selectedId && applications.some((application) => application.id === selectedId)
    ? selectedId
    : applications[0]?.id ?? null
  const selectedSummary = applications.find((application) => application.id === validSelectedId)
  const selectedApplicationId = selectedSummary?.id
  const selectedApplication = detailResult && detailResult.id === selectedApplicationId ? detailResult.application : null
  const detailError = detailResult && detailResult.id === selectedApplicationId ? detailResult.error : null
  const isLoadingDetail = Boolean(selectedSummary) && detailResult?.id !== selectedApplicationId

  useEffect(() => {
    const applicationId = selectedApplicationId
    if (!applicationId) return
    let active = true
    applicationsService.getApplication(applicationId)
      .then((application) => {
        if (active) setDetailResult({ id: applicationId, application, error: null })
      })
      .catch((error: unknown) => {
        if (active) {
          const message = getErrorMessage(error, 'Unable to load application status.')
          setDetailResult({ id: applicationId, application: null, error: message })
          showErrorToast(message)
        }
      })
    return () => { active = false }
  }, [selectedApplicationId, showErrorToast])

  const performUpdate = async (action: () => Promise<unknown>, successMessage: string) => {
    setIsUpdating(true)
    try {
      const updated = await action()
      if (updated && typeof updated === 'object' && 'id' in updated) {
        const application = updated as UserApplication
        setDetailResult({ id: application.id, application, error: null })
      }
      setDialog(null)
      showSuccessToast(successMessage)
    } catch (error: unknown) {
      showErrorToast(getErrorMessage(error, 'The application could not be updated. Please try again.'))
    } finally {
      setIsUpdating(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setIsUpdating(true)
    try {
      await deleteApplication(deleteTarget.id)
      const nextSelection = applications.find((application) => application.id !== deleteTarget.id)?.id ?? null
      setDeleteTarget(null)
      setSelectedId(nextSelection)
      setDetailResult(null)
      showSuccessToast('Application deleted.')
    } catch (error: unknown) {
      showErrorToast(getErrorMessage(error, 'The application could not be deleted. Please try again.'))
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <>
      {error && <p className={styles.feedback} role="alert">{error}</p>}
      {isLoading && <p className={styles.feedback}>Loading applications...</p>}
      {!isLoading && (
        <div className={styles.applicationLayout}>
          <section className={styles.applicationListPanel} aria-labelledby="applications-heading">
            <header className={styles.listHeader}>
              <div><h2 id="applications-heading">My Applications</h2><p>Track your internship applications.</p></div>
              <Link to="/intern-seeker/search">Apply to Company <span>+</span></Link>
            </header>
            <div className={styles.applicationList}>
              {applications.map((application) => <ApplicationListItem key={application.id} application={application} isSelected={application.id === selectedSummary?.id} onSelect={() => setSelectedId(application.id)} />)}
              {applications.length === 0 && <div className={styles.emptyState}><h3>No applications yet</h3><p>There are currently no applications to track.</p></div>}
            </div>
          </section>

          {!selectedSummary && <section className={`${styles.progressPanel} ${styles.emptyProgress}`}><h2>Application Progress</h2><p>Select an application after you apply to view its progress.</p></section>}
          {isLoadingDetail && <section className={styles.progressPanel}><p className={styles.feedback}>Loading application status...</p></section>}
          {!isLoadingDetail && selectedApplication && <ApplicationProgress application={selectedApplication} isUpdating={isUpdating} onWithdraw={() => setDialog({ type: 'withdraw', application: selectedApplication })} onDelete={() => setDeleteTarget(selectedApplication)} onOpenDialog={setDialog} />}
          {!isLoadingDetail && detailError && <section className={styles.progressPanel}><p className={styles.feedback} role="alert">{detailError}</p></section>}
        </div>
      )}

      {dialog && <ApplicationDialog dialog={dialog} isUpdating={isUpdating} onClose={() => setDialog(null)} onDecision={(decision) => void performUpdate(() => respondToOffer(dialog.type === 'student-decision' ? dialog.application.id : '', decision), decision === 'accept' ? 'Internship offer accepted.' : 'Internship offer declined.')} onWithdraw={() => void performUpdate(() => withdrawApplication(dialog.type === 'withdraw' ? dialog.application.id : ''), 'Application withdrawn.')} />}
      {deleteTarget && <ConfirmDeleteModal subject={`your ${deleteTarget.position} application`} isDeleting={isUpdating} onClose={() => setDeleteTarget(null)} onConfirm={() => void confirmDelete()} />}
    </>
  )
}

function ApplicationListItem({ application, isSelected, onSelect }: { application: UserApplication; isSelected: boolean; onSelect: () => void }) {
  return (
    <div className={`${styles.applicationItem} ${isSelected ? styles.selectedItem : ''}`}>
      <button className={styles.applicationSelectButton} type="button" onClick={onSelect}>
        <span className={styles.applicationIcon} aria-hidden="true">
          <Building2 />
          {application.companyLogoUrl && <img src={application.companyLogoUrl} alt="" onError={(event) => { event.currentTarget.style.display = 'none' }} />}
        </span>
        <span className={styles.applicationInfo}><strong>{application.position}</strong><span>{application.companyName}</span></span>
        <span className={styles.applicationMeta}><StatusBadge status={application.status} /><small>Applied: {application.appliedDate}</small></span>
        <ChevronRight className={styles.chevron} />
      </button>
    </div>
  )
}

function StatusBadge({ status }: { status: ApplicationDisplayStatus }) {
  const statusClass = status === 'Accepted' ? styles.accepted : ['Rejected', 'Withdrawn', 'Expired', 'Offer Declined'].includes(status) ? styles.rejected : status.includes('For Review') ? styles.forReview : styles.inProgress
  return <span className={`${styles.statusBadge} ${statusClass}`}>{status}</span>
}

function ApplicationProgress({ application, isUpdating, onWithdraw, onDelete, onOpenDialog }: { application: UserApplication; isUpdating: boolean; onWithdraw: () => void; onDelete: () => void; onOpenDialog: (dialog: DialogState) => void }) {
  const canWithdraw = application.canWithdraw
  const canDelete = application.canHide

  return (
    <section className={styles.progressPanel} aria-labelledby="progress-heading">
      <header className={styles.progressHeader}><div><h2 id="progress-heading">Application Progress</h2><p>{application.companyName} - {application.position}</p></div></header>
      <div className={styles.timeline}>
        {application.progress.map((step, index) => <ProgressStep key={step.stage} step={step} isLast={index === application.progress.length - 1} onOpenDialog={onOpenDialog} application={application} />)}
      </div>
      <div className={styles.withdrawArea}>
        {(canWithdraw || canDelete) && <button type="button" className={canDelete ? styles.deleteApplicationButton : styles.withdrawButton} disabled={isUpdating} onClick={canDelete ? onDelete : onWithdraw}>{isUpdating ? 'Updating...' : canDelete ? 'Delete Application' : 'Withdraw Application'}</button>}
      </div>
    </section>
  )
}

function ProgressStep({ step, isLast, application, onOpenDialog }: { step: ApplicationProgress; isLast: boolean; application: UserApplication; onOpenDialog: (dialog: DialogState) => void }) {
  const dialog = step.interview
    ? { type: 'interview' as const, companyName: application.companyName, interview: step.interview }
    : step.remark
      ? { type: 'remark' as const, title: 'Application Rejection Remark', remark: step.remark }
      : step.stage === 'Student Decision' && step.state === 'current' && application.canRespondToOffer
        ? { type: 'student-decision' as const, application }
        : null
  const isClickable = Boolean(dialog)
  const clickLabel = step.stage === 'Student Decision' ? 'Respond to offer' : step.interview ? 'View interview details' : 'View remark'

  return (
    <div className={`${styles.timelineStep} ${styles[step.state]} ${isClickable ? styles.clickableStep : ''}`}>
      <div className={styles.indicatorColumn}>
        <span className={styles.indicator}>{step.state === 'completed' ? <Check /> : ['rejected', 'withdrawn', 'expired'].includes(step.state) ? <X /> : <i />}</span>
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

function ApplicationDialog({ dialog, isUpdating, onClose, onDecision, onWithdraw }: { dialog: Exclude<DialogState, null>; isUpdating: boolean; onClose: () => void; onDecision: (decision: 'accept' | 'reject') => void; onWithdraw: () => void }) {
  const isInterview = dialog.type === 'interview'
  const isDecision = dialog.type === 'student-decision'
  const isWithdraw = dialog.type === 'withdraw'
  const title = isInterview ? 'Interview Details' : isDecision ? 'Respond to Internship Offer' : isWithdraw ? 'Withdraw Application' : dialog.title

  return (
    <div className={styles.modalBackdrop} role="presentation" onMouseDown={onClose}>
      <section className={styles.applicationModal} role="dialog" aria-modal="true" aria-labelledby="application-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className={styles.closeButton} type="button" aria-label="Close" onClick={onClose}><X /></button>
        <h2 id="application-dialog-title">{title}</h2>
        {isInterview && <InterviewContent interview={dialog.interview} companyName={dialog.companyName} />}
        {dialog.type === 'remark' && <p className={styles.remarkText}>{dialog.remark}</p>}
        {isDecision && <><p className={styles.decisionText}>Would you like to accept this internship offer from {dialog.application.companyName}?</p><div className={styles.decisionActions}><button type="button" className={styles.rejectButton} disabled={isUpdating} onClick={() => onDecision('reject')}>Reject Offer</button><button type="button" className={styles.acceptButton} disabled={isUpdating} onClick={() => onDecision('accept')}>{isUpdating ? 'Updating...' : 'Accept Offer'}</button></div></>}
        {isWithdraw && <><p className={styles.decisionText}>Are you sure you want to withdraw your application for {dialog.application.position}?</p><div className={styles.decisionActions}><button type="button" className={styles.rejectButton} disabled={isUpdating} onClick={onClose}>Cancel</button><button type="button" className={styles.acceptButton} disabled={isUpdating} onClick={onWithdraw}>{isUpdating ? 'Withdrawing...' : 'Withdraw Application'}</button></div></>}
      </section>
    </div>
  )
}

function InterviewContent({ companyName, interview }: { companyName: string; interview: InterviewDetails }) {
  return <><p className={styles.modalSubtitle}>{companyName} has scheduled an interview.</p><dl className={styles.interviewDetails}><div><dt>Date</dt><dd>{interview.date}</dd></div><div><dt>Time</dt><dd>{interview.time}</dd></div><div><dt>Interview Mode</dt><dd>{interview.mode === 'online' ? 'Online' : 'Physical'}</dd></div>{interview.mode === 'online' && interview.meetingUrl && <div><dt>Meeting URL</dt><dd><a href={interview.meetingUrl} target="_blank" rel="noreferrer">{interview.meetingUrl}</a></dd></div>}{interview.mode === 'physical' && interview.location && <div><dt><MapPin size={16} />Physical Location</dt><dd>{interview.location}</dd></div>}</dl>{interview.remark && <div className={styles.remarkBox}><strong>Remark</strong><p>{interview.remark}</p></div>}</>
}

export default ApplicationStatusPage
