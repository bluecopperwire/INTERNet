import { useState, type ReactNode } from 'react'
import type { StudentInternshipDto } from '../../../types/api'
import { assignmentHasEnded, formatAssignmentDate, formatMinutes, formatShift, formatWorkingDays, studentAssignmentStatus } from '../utils/internship-display'
import styles from './StudentInternshipDetails.module.css'

type WorkflowModal = 'remark' | 'review' | 'withdraw' | null

interface StudentInternshipDetailsProps {
  assignment: StudentInternshipDto
  interactive?: boolean
  onWithdraw?: (remark: string) => Promise<void>
  onReview?: (rating: number, remark: string) => Promise<void>
}

export function StudentInternshipDetails({ assignment, interactive = false, onWithdraw, onReview }: StudentInternshipDetailsProps) {
  const [modal, setModal] = useState<WorkflowModal>(null)
  const [remark, setRemark] = useState('')
  const [rating, setRating] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const statusLabel = studentAssignmentStatus(assignment.assignmentStatus)
  const hasEnded = assignmentHasEnded(assignment.assignmentStatus)
  const canReview = assignment.assignmentStatus === 'complete_company'
  const canWithdraw = ['pending', 'ongoing'].includes(assignment.assignmentStatus)
  const workflowRemark = resolveWorkflowRemark(assignment)

  const closeModal = () => {
    if (isSubmitting) return
    setModal(null)
    setRemark('')
    setRating(0)
  }

  const submitWithdrawal = async () => {
    if (!onWithdraw || !remark.trim()) return
    setIsSubmitting(true)
    try {
      await onWithdraw(remark.trim())
      setModal(null)
      setRemark('')
    } catch {
      // The parent reports standardized API errors through the global toast.
    } finally {
      setIsSubmitting(false)
    }
  }

  const submitReview = async () => {
    if (!onReview || rating < 1 || rating > 5 || !remark.trim()) return
    setIsSubmitting(true)
    try {
      await onReview(rating, remark.trim())
      setModal(null)
      setRemark('')
      setRating(0)
    } catch {
      // The parent reports standardized API errors through the global toast.
    } finally {
      setIsSubmitting(false)
    }
  }

  const detailFields = [
    ['Company', assignment.companyName],
    ['Job Title', assignment.jobTitle],
    ['Working Days', formatWorkingDays(assignment.workingDays)],
    ['Start Date', formatAssignmentDate(assignment.startDate)],
    [hasEnded ? 'End Date' : 'Expected End Date', formatAssignmentDate(hasEnded ? assignment.endedAt : assignment.expectedEndDate)],
    ['Shift Start', formatShift(assignment.startShift)],
    ['Shift End', formatShift(assignment.endShift)],
  ]

  const statusFields = [
    ['Required Hours', formatMinutes(assignment.requiredMinutes)],
    ['Rendered Duration', formatMinutes(assignment.renderedMinutes)],
    ['Remaining Duration', formatMinutes(assignment.remainingMinutes)],
  ]

  return (
    <div className={styles.pageContent}>
      <section className={styles.hero} aria-labelledby="student-internship-title">
        <div>
          <p>{interactive ? 'Current Internship' : 'Internship Record'}</p>
          <h1 id="student-internship-title">
            {assignment.jobTitle} at {assignment.companyName}
          </h1>
        </div>
        <div className={styles.statusArea}>
          <span className={styles.statusTag}>{statusLabel}</span>
          {workflowRemark && (
            <button className={styles.remarkLink} type="button" onClick={() => setModal('remark')}>
              See Remark
            </button>
          )}
        </div>
      </section>

      <section className={styles.card} aria-labelledby="internship-details-heading">
        <header className={styles.cardHeader}>
          <h2 id="internship-details-heading">Internship Details</h2>
          <p>Your internship assignment and approved work schedule.</p>
        </header>
        <div className={styles.cardBody}>
          <DetailGrid fields={detailFields} />
        </div>
      </section>

      <section className={styles.card} aria-labelledby="internship-status-heading">
        <header className={styles.cardHeader}>
          <h2 id="internship-status-heading">Internship Status</h2>
          <p>Track progress using the authoritative minute-based duration.</p>
        </header>
        <div className={styles.cardBody}>
          <DetailGrid fields={statusFields} />
          {interactive && (
            <div className={styles.workflowActions}>
              <button className={styles.primaryButton} type="button" disabled={!canReview} onClick={() => setModal('review')}>
                {assignment.assignmentStatus === 'complete_student' ? 'Review Submitted' : 'Review Company'}
              </button>
              <button className={styles.secondaryButton} type="button" disabled={!canWithdraw} onClick={() => setModal('withdraw')}>
                Withdraw Internship
              </button>
            </div>
          )}
        </div>
      </section>

      {modal === 'remark' && workflowRemark && (
        <WorkflowDialog title={workflowRemark.title} onClose={closeModal}>
          <p className={styles.readOnlyRemark}>{workflowRemark.remark}</p>
          <div className={styles.modalActions}>
            <button className={styles.secondaryButton} type="button" onClick={closeModal}>
              Close
            </button>
          </div>
        </WorkflowDialog>
      )}

      {modal === 'withdraw' && (
        <WorkflowDialog title="Withdraw Internship" onClose={closeModal}>
          <label className={styles.formField}>
            <span>Reason for Withdrawal</span>
            <textarea rows={5} value={remark} onChange={(event) => setRemark(event.target.value)} />
          </label>
          <div className={styles.modalActions}>
            <button className={styles.dangerButton} type="button" disabled={!remark.trim() || isSubmitting} onClick={() => void submitWithdrawal()}>
              {isSubmitting ? 'Withdrawing...' : 'Withdraw Internship'}
            </button>
            <button className={styles.secondaryButton} type="button" disabled={isSubmitting} onClick={closeModal}>
              Close
            </button>
          </div>
        </WorkflowDialog>
      )}

      {modal === 'review' && (
        <WorkflowDialog title="Review Company" onClose={closeModal}>
          <fieldset className={styles.ratingField}>
            <legend>Rating</legend>
            <div className={styles.stars} aria-label="Company rating">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  className={value <= rating ? styles.selectedStar : ''}
                  type="button"
                  aria-label={`${value} ${value === 1 ? 'star' : 'stars'}`}
                  aria-pressed={value === rating}
                  key={value}
                  onClick={() => setRating(value)}
                >
                  ★
                </button>
              ))}
            </div>
          </fieldset>
          <label className={styles.formField}>
            <span>Remark</span>
            <textarea rows={5} value={remark} onChange={(event) => setRemark(event.target.value)} />
          </label>
          <div className={styles.modalActions}>
            <button className={styles.primaryButton} type="button" disabled={rating === 0 || !remark.trim() || isSubmitting} onClick={() => void submitReview()}>
              {isSubmitting ? 'Submitting...' : 'Submit Review'}
            </button>
            <button className={styles.secondaryButton} type="button" disabled={isSubmitting} onClick={closeModal}>
              Close
            </button>
          </div>
        </WorkflowDialog>
      )}
    </div>
  )
}

export function EmptyInternshipState() {
  return (
    <div className={styles.pageContent}>
      <section className={styles.hero} aria-labelledby="student-internship-title">
        <div>
          <p>Current Internship</p>
          <h1 id="student-internship-title">No active internship</h1>
        </div>
        <span className={styles.statusTag}>No Active Internship</span>
      </section>
      {['Internship Details', 'Internship Status'].map((heading) => (
        <section className={styles.card} key={heading}>
          <header className={styles.cardHeader}>
            <h2>{heading}</h2>
          </header>
          <div className={styles.emptyState}>
            <h3>No active internship yet</h3>
            <p>There is currently no active internship to track.</p>
          </div>
        </section>
      ))}
    </div>
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

function WorkflowDialog({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className={styles.backdrop} role="presentation" onMouseDown={onClose}>
      <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="workflow-modal-title" onMouseDown={(event) => event.stopPropagation()}>
        <h2 id="workflow-modal-title">{title}</h2>
        {children}
      </section>
    </div>
  )
}

function resolveWorkflowRemark(assignment: StudentInternshipDto) {
  if (assignment.companyCancellationRemark) {
    return {
      title: 'Internship Cancellation Remark',
      remark: assignment.companyCancellationRemark,
    }
  }
  if (assignment.studentWithdrawalRemark) {
    return {
      title: 'Student Withdrawal Remark',
      remark: assignment.studentWithdrawalRemark,
    }
  }
  if (assignment.companyCompletionRemark) {
    return {
      title: 'Internship Completion Remark',
      remark: assignment.companyCompletionRemark,
    }
  }
  return null
}
