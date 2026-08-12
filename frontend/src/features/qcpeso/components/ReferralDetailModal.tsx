import { useEffect } from 'react'
import { CheckCircle2, FileText, X, XCircle } from 'lucide-react'
import type { ReferralItem } from '../types/qcpeso.types'
import styles from './ReferralDetailModal.module.css'

interface ReferralDetailModalProps {
  referral: ReferralItem | null
  onClose: () => void
  onApprove: (id: string) => void
  onReject: (id: string) => void
}

export function ReferralDetailModal({
  referral,
  onClose,
  onApprove,
  onReject,
}: ReferralDetailModalProps) {
  useEffect(() => {
    if (!referral) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [referral, onClose])

  if (!referral) return null

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'Approved':
        return styles.approved
      case 'Endorsed to Employer':
        return styles.endorsed
      case 'Rejected':
        return styles.rejected
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
        aria-labelledby="referral-modal-title"
      >
        {/* Close Button */}
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
          <h2 id="referral-modal-title" className={styles.candidateName}>
            {referral.studentName}
          </h2>
          <p className={styles.candidateDetail}>{referral.email}</p>
          <p className={styles.candidateDetail}>{referral.phone}</p>
        </div>

        {/* Referral Details */}
        <div className={styles.metaGrid}>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Target Employer</span>
            <span>{referral.targetEmployer}</span>
          </div>
          {referral.school && (
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>School</span>
              <span>{referral.school}</span>
            </div>
          )}
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Position</span>
            <span>{referral.position}</span>
          </div>
          {referral.course && (
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Course</span>
              <span>{referral.course}</span>
            </div>
          )}
        </div>

        {/* Referral Status Section */}
        <div className={styles.sectionGroup}>
          <span className={styles.sectionLabel}>Referral Status</span>
          <div className={`${styles.statusPill} ${getStatusClass(referral.status)}`}>
            <span>{referral.status}</span>
          </div>
        </div>

        {/* Submitted Documents Section */}
        <div className={styles.sectionGroup}>
          <span className={styles.sectionLabel}>Submitted Documents</span>
          <div className={styles.documentPills}>
            {referral.submittedDocuments.map((doc) => (
              <div key={doc} className={styles.docPill} title={`View ${doc}`}>
                <FileText size={14} />
                <span>{doc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className={styles.actionRow}>
          <button
            type="button"
            className={styles.approveBtn}
            onClick={() => onApprove(referral.id)}
          >
            <CheckCircle2 size={18} />
            <span>Approve</span>
          </button>
          <button
            type="button"
            className={styles.rejectBtn}
            onClick={() => onReject(referral.id)}
          >
            <XCircle size={18} />
            <span>Reject</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default ReferralDetailModal
