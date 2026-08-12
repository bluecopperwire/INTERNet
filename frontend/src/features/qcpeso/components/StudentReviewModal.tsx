import { useEffect } from 'react'
import { CheckCircle2, FileText, Flag, X, XCircle } from 'lucide-react'
import type { StudentApplication } from '../types/qcpeso.types'
import styles from './StudentReviewModal.module.css'

interface StudentReviewModalProps {
  isOpen: boolean
  onClose: () => void
  student: StudentApplication | null
  onApprove?: (id: string) => void
  onFlag?: (id: string) => void
  onReject?: (id: string) => void
}

export function StudentReviewModal({ isOpen, onClose, student, onApprove, onFlag, onReject }: StudentReviewModalProps) {
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !student) return null

  const statusClass = student.status === 'Verified'
    ? styles.statusVerified
    : student.status === 'Rejected'
      ? styles.statusRejected
      : styles.statusPending

  return (
    <div className={styles.overlay} onClick={onClose}>
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-review-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button className={styles.closeBtn} type="button" aria-label="Close student review" onClick={onClose}>
          <X aria-hidden="true" />
        </button>

        <header className={styles.header}>
          <div className={styles.studentInfo}>
            <h2 id="student-review-title">{student.name}</h2>
            <p>{student.email}</p>
            <p>{student.phone}</p>
          </div>
        </header>

        <div className={styles.gridCards}>
          <article className={styles.card}><h3>School</h3><p>{student.school}</p></article>
          <article className={styles.card}><h3>Program</h3><p>{student.program}</p></article>
          <article className={styles.card}><h3>Date Submitted</h3><p>{student.date}</p></article>
          <article className={styles.card}><h3>GWA</h3><p>{student.gwa}</p></article>
        </div>

        <div className={styles.applicationSummary}>
          <section className={styles.sectionGroup}>
            <h4>Application Status</h4>
            <span className={`${styles.statusPill} ${statusClass}`}>{student.status}</span>
          </section>
          <section className={`${styles.sectionGroup} ${styles.appliedForGroup}`}>
            <h4>Applied For</h4>
            <span className={styles.appliedForPill}>{student.appliedFor}</span>
          </section>
        </div>

        <section className={styles.sectionGroup}>
          <h4>Submitted Documents</h4>
          <div className={styles.pillGroup}>
            {student.submittedDocuments?.map((document) => (
              <span className={styles.docPill} key={document}>
                <FileText size={14} aria-hidden="true" />
                {document}
              </span>
            ))}
          </div>
        </section>

        <div className={styles.actions}>
          <button className={styles.btnApprove} type="button" onClick={() => onApprove?.(student.id)}>
            <CheckCircle2 size={18} aria-hidden="true" />
            <span>Approve</span>
          </button>
          <button className={styles.btnFlag} type="button" onClick={() => onFlag?.(student.id)}>
            <Flag size={18} aria-hidden="true" />
            <span>Flag for Review</span>
          </button>
          <button className={styles.btnReject} type="button" onClick={() => onReject?.(student.id)}>
            <XCircle size={18} aria-hidden="true" />
            <span>Reject</span>
          </button>
        </div>
      </section>
    </div>
  )
}
