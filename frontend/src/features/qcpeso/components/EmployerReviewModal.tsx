import { useEffect } from 'react'
import { BriefcaseBusiness, CheckCircle2, X, XCircle } from 'lucide-react'
import type { EmployerOpportunity } from '../types/qcpeso.types'
import styles from './EmployerReviewModal.module.css'

interface EmployerReviewModalProps {
  isOpen: boolean
  onClose: () => void
  employer: EmployerOpportunity | null
  onApprove?: (id: string) => void
  onReject?: (id: string) => void
}

export function EmployerReviewModal({ isOpen, onClose, employer, onApprove, onReject }: EmployerReviewModalProps) {
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !employer) return null

  const employerStatusClass = employer.employerStatus === 'Approved' || employer.employerStatus === 'Active'
    ? styles.statusActive
    : employer.employerStatus === 'Rejected'
      ? styles.statusRejected
      : styles.statusPending

  return (
    <div className={styles.overlay} onClick={onClose}>
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="employer-review-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button className={styles.closeBtn} type="button" aria-label="Close employer review" onClick={onClose}>
          <X aria-hidden="true" />
        </button>

        <header className={styles.header}>
          <div className={styles.companyInfo}>
            <h2 id="employer-review-title">{employer.name}</h2>
            <p>{employer.email}</p>
            <p>{employer.phone}</p>
          </div>

        </header>

        <div className={styles.detailsGrid}>
          <article className={styles.detailItem}>
            <h3>Representative</h3>
            <p>{employer.rep}</p>
          </article>
          <article className={styles.detailItem}>
            <h3>Created On</h3>
            <p>{employer.createdOn}</p>
          </article>
        </div>

        <div className={styles.statusSummary}>
          <section className={styles.sectionGroup}>
            <h4>Employer Status</h4>
            <span className={`${styles.statusPill} ${employerStatusClass}`}>{employer.employerStatus}</span>
          </section>
          <section className={`${styles.sectionGroup} ${styles.accountStatusGroup}`}>
            <h4>Account Status</h4>
            <span className={`${styles.statusPill} ${employer.status === 'Active' ? styles.statusActive : styles.statusInactive}`}>
              {employer.status}
            </span>
          </section>
        </div>

        <section className={styles.sectionGroup}>
          <h4>Opportunities Offered</h4>
          <div className={styles.opportunitiesList}>
            {employer.opportunitiesOffered?.map((opportunity) => (
              <span className={styles.opportunityPill} key={opportunity}>
                <BriefcaseBusiness size={14} aria-hidden="true" />
                {opportunity}
              </span>
            ))}
          </div>
        </section>

        <div className={styles.actions}>
          <button className={styles.btnApprove} type="button" onClick={() => onApprove?.(employer.id)}>
            <CheckCircle2 size={18} aria-hidden="true" />
            <span>Approve</span>
          </button>
          <button className={styles.btnReject} type="button" onClick={() => onReject?.(employer.id)}>
            <XCircle size={18} aria-hidden="true" />
            <span>Reject</span>
          </button>
        </div>
      </section>
    </div>
  )
}
