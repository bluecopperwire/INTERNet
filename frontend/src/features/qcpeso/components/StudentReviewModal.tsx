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
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [isOpen, onClose])

  if (!isOpen || !student) return null

  return (
    <div className={styles.overlay} onClick={onClose}>
      <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="student-review-title" onClick={(event) => event.stopPropagation()}>
        <button className={styles.closeBtn} type="button" aria-label="Close student review" onClick={onClose}><X /></button>
        <header className={styles.header}><h2 id="student-review-title">{student.name}</h2><p>{student.email}</p><p>{student.phone}</p></header>
        <div className={styles.gridCards}>
          <Detail label="School" value={student.school} />
          <Detail label="Program" value={student.program} />
          <Detail label="Date Submitted" value={student.date} />
          <Detail label="GWA" value={student.gwa} />
        </div>
        <section className={styles.sectionGroup}>
          <h3>Submitted Documents</h3>
          <div className={styles.pillGroup}>{student.submittedDocuments.map((document) => <span className={styles.docPill} key={document}><FileText size={14} />{document}</span>)}</div>
        </section>
        <div className={styles.actions}>
          <button className={styles.btnApprove} type="button" onClick={() => onApprove?.(student.id)}><CheckCircle2 size={18} />Approve</button>
          <button className={styles.btnFlag} type="button" onClick={() => onFlag?.(student.id)}><Flag size={18} />Flag for Review</button>
          <button className={styles.btnReject} type="button" onClick={() => onReject?.(student.id)}><XCircle size={18} />Reject</button>
        </div>
      </section>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return <article className={styles.card}><h3>{label}</h3><p>{value}</p></article>
}
