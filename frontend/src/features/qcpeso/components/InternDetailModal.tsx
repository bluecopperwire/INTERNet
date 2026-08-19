import { useEffect } from 'react'
import { Clock, FileText, X } from 'lucide-react'
import type { InternItem } from '../types/qcpeso.types'
import styles from './InternDetailModal.module.css'

interface InternDetailModalProps {
  intern: InternItem | null
  onClose: () => void
}

export function InternDetailModal({ intern, onClose }: InternDetailModalProps) {
  useEffect(() => {
    if (!intern) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [intern, onClose])

  if (!intern) return null

  const progressPercentage = Math.min(
    100,
    Math.round((intern.renderedHours / intern.targetHours) * 100)
  )

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'Completed':
        return styles.completed
      case 'Paused':
        return styles.paused
      default:
        return ''
    }
  }

  return (
    <div className={styles.backdrop} onClick={onClose} role="presentation">
      <div
        className={styles.modalCard}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="intern-modal-title"
      >
        {/* Close Icon Button */}
        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Close detail modal"
        >
          <X size={20} />
        </button>

        {/* Candidate Information */}
        <div className={styles.candidateInfo}>
          <h2 id="intern-modal-title" className={styles.candidateName}>
            {intern.studentName}
          </h2>
          <p className={styles.candidateDetail}>{intern.email}</p>
          <p className={styles.candidateDetail}>{intern.phone}</p>
        </div>

        {/* Placement Details */}
        <div className={styles.metaGrid}>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Matched Employer</span>
            <span>{intern.matchedEmployer}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Accepted Role</span>
            <span>{intern.acceptedRole}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Placement Date</span>
            <span>{intern.dateOfPlacement}</span>
          </div>
          {intern.school && (
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>School</span>
              <span>{intern.school}</span>
            </div>
          )}
        </div>

        {/* Internship Status Section */}
        <div className={styles.sectionGroup}>
          <span className={styles.sectionLabel}>Internship Status</span>
          <div className={`${styles.statusPill} ${getStatusClass(intern.status)}`}>
            <span>{intern.status}</span>
          </div>
        </div>

        {/* DTR / Attendance Summary Visual Box */}
        <div className={styles.dtrSummaryBox}>
          <div className={styles.dtrHeaderRow}>
            <div className={styles.dtrHeading}>
              <Clock size={18} color="#160e6f" />
              <span className={styles.dtrTitle}>Daily Time Record (DTR) Overview</span>
            </div>
            <span className={styles.dtrHoursText}>
              {intern.renderedHours} / {intern.targetHours} Hours ({progressPercentage}%)
            </span>
          </div>

          <div className={styles.progressBarContainer}>
            <div
              className={styles.progressBarFill}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

        </div>

        {/* Submitted Documents Section */}
        <div className={styles.sectionGroup}>
          <span className={styles.sectionLabel}>Submitted Documents</span>
          <div className={styles.documentPills}>
            {intern.submittedDocuments.map((doc) => (
              <div key={doc} className={styles.docPill} title={`View ${doc}`}>
                <FileText size={14} />
                <span>{doc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default InternDetailModal
