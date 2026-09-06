import { useState, type ReactNode } from 'react'
import { Building2, CalendarDays, ChartNoAxesColumnIncreasing, User } from 'lucide-react'
import type { StudentInternshipDto } from '../../../types/api'
import { AttendanceProfileSummary } from '../../../components/AttendanceProfileSummary'
import { assignmentHasEnded, formatAssignmentDate, formatMinutes, formatShift, formatWorkingDays, studentAssignmentStatus } from '../utils/internship-display'
import styles from './StudentInternshipDetails.module.css'

type WorkflowModal = 'review' | 'withdraw' | null
type DetailField = readonly [label: string, value: string]

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
  const statusClass = statusLabel.toLowerCase()
  const hasEnded = assignmentHasEnded(assignment.assignmentStatus)
  const canReview = assignment.assignmentStatus === 'complete_company'
  const canWithdraw = ['pending', 'ongoing'].includes(assignment.assignmentStatus)
  const outcomeRemark = resolveOutcomeRemark(assignment)

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

  const internFields: DetailField[] = [
    ['Full Name', displayValue(assignment.studentFullName)],
    ['Program / Strand', displayValue(assignment.strandProgram)],
    ['Year Level', displayValue(assignment.yearLevel)],
    ['School', displayValue(assignment.schoolName)],
  ]

  const assignmentFields: DetailField[] = [
    ['Company', displayValue(assignment.companyName)],
    ['Job Title', displayValue(assignment.jobTitle)],
    ['Required Hours', formatMinutes(assignment.requiredMinutes)],
  ]

  const scheduleFields: DetailField[] = [
    ['Working Days', displayValue(formatWorkingDays(assignment.workingDays))],
    ['Start Date', formatAssignmentDate(assignment.startDate)],
    [hasEnded ? 'End Date' : 'Expected End Date', formatAssignmentDate(hasEnded ? (assignment.endDate ?? assignment.endedAt) : assignment.expectedEndDate)],
    ['Shift Start', formatShift(assignment.startShift)],
    ['Shift End', formatShift(assignment.endShift)],
  ]

  const statusFields: DetailField[] = [
    ['Status', statusLabel],
    ['Rendered Hours', formatMinutes(assignment.renderedMinutes)],
    ['Remaining Hours', formatMinutes(assignment.remainingMinutes)],
  ]

  return (
    <>
      <section className={styles.detailsShell} aria-labelledby="student-internship-title">
        <header className={styles.pageHeading}>
          <div>
            <h1 id="student-internship-title">Internship Details</h1>
            <p>View your internship assignment, approved schedule, and progress.</p>
          </div>
          <span className={`${styles.statusTag} ${styles[statusClass] ?? ''}`}>{statusLabel}</span>
        </header>

        <div className={styles.content}>
          <AttendanceProfileSummary profile={assignment} />

          <div className={styles.sectionStack}>
            <DetailSection icon={<User size={18} />} title="Intern Information" fields={internFields} />
            <DetailSection icon={<Building2 size={18} />} title="Assignment Information" fields={assignmentFields} />
            <DetailSection icon={<CalendarDays size={18} />} title="Schedule Information" fields={scheduleFields} />
            <DetailSection icon={<ChartNoAxesColumnIncreasing size={18} />} title="Status Information" fields={statusFields} />
            {outcomeRemark && (
              <section className={styles.infoCard} aria-labelledby="internship-remark-heading">
                <h2 className={styles.sectionTitle} id="internship-remark-heading">
                  <span>{outcomeRemark.icon}</span>
                  {outcomeRemark.title}
                </h2>
                <p className={styles.outcomeRemark}>{outcomeRemark.remark}</p>
              </section>
            )}
          </div>
        </div>
      </section>

      {interactive && (
        <footer className={styles.workflowActions}>
          <button className={styles.primaryButton} type="button" disabled={!canReview} onClick={() => setModal('review')}>
            {assignment.assignmentStatus === 'complete_student' ? 'Review Submitted' : 'Review Company'}
          </button>
          <button className={styles.secondaryButton} type="button" disabled={!canWithdraw} onClick={() => setModal('withdraw')}>
            Withdraw Internship
          </button>
        </footer>
      )}

      {modal === 'withdraw' && (
        <WorkflowDialog title="Withdraw Internship" onClose={closeModal}>
          <label className={styles.formField}>
            <span>Reason for Withdrawal</span>
            <textarea rows={5} value={remark} onChange={(event) => setRemark(event.target.value)} />
          </label>
          <div className={styles.modalActions}>
            <button className={styles.secondaryButton} type="button" disabled={isSubmitting} onClick={closeModal}>
              Close
            </button>
            <button className={styles.dangerButton} type="button" disabled={!remark.trim() || isSubmitting} onClick={() => void submitWithdrawal()}>
              {isSubmitting ? 'Withdrawing...' : 'Withdraw Internship'}
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
            <button className={styles.secondaryButton} type="button" disabled={isSubmitting} onClick={closeModal}>
              Close
            </button>
            <button
              className={styles.primaryButton}
              type="button"
              disabled={rating === 0 || !remark.trim() || isSubmitting}
              onClick={() => void submitReview()}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </WorkflowDialog>
      )}
    </>
  )
}

export function EmptyInternshipState() {
  return (
    <section className={styles.detailsShell} aria-labelledby="student-internship-title">
      <header className={styles.pageHeading}>
        <div>
          <h1 id="student-internship-title">Internship Details</h1>
          <p>View your internship assignment, approved schedule, and progress.</p>
        </div>
        <span className={`${styles.statusTag} ${styles.emptyStatus}`}>No Active Internship</span>
      </header>
      <div className={styles.emptyContent}>
        {['Intern Information', 'Assignment Information', 'Schedule Information', 'Status Information'].map((heading) => (
          <section className={styles.infoCard} key={heading}>
            <h2 className={styles.sectionTitle}>{heading}</h2>
            <div className={styles.emptyState}>
              <h3>No active internship yet</h3>
              <p>There is currently no active internship to track.</p>
            </div>
          </section>
        ))}
      </div>
    </section>
  )
}

function DetailSection({ icon, title, fields }: { icon: ReactNode; title: string; fields: DetailField[] }) {
  const headingId = `${title.toLowerCase().replaceAll(' ', '-')}-heading`
  return (
    <section className={styles.infoCard} aria-labelledby={headingId}>
      <h2 className={styles.sectionTitle} id={headingId}>
        <span>{icon}</span>
        {title}
      </h2>
      <dl className={styles.infoList}>
        {fields.map(([label, value]) => (
          <div className={styles.infoRow} key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
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

function resolveOutcomeRemark(assignment: StudentInternshipDto) {
  if (assignment.assignmentStatus === 'cancelled' || assignment.companyCancellationRemark) {
    return {
      title: 'Internship Cancellation Remark',
      remark: assignment.companyCancellationRemark || 'No cancellation remark was provided.',
      icon: <Building2 size={18} />,
    }
  }
  if (['complete_company', 'complete_student'].includes(assignment.assignmentStatus) || assignment.companyCompletionRemark) {
    return {
      title: 'Internship Completion Remark',
      remark: assignment.companyCompletionRemark || 'No completion remark was provided.',
      icon: <ChartNoAxesColumnIncreasing size={18} />,
    }
  }
  return null
}

function displayValue(value?: string | null): string {
  return value?.trim() || 'Not specified'
}
