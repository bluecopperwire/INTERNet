import React, { useEffect } from 'react'
import styles from './StudentReviewModal.module.css'
import type { StudentApplication } from '../types/qcpeso.types'

interface StudentReviewModalProps {
  isOpen: boolean
  onClose: () => void
  student: StudentApplication | null
  onApprove?: (id: string) => void
  onFlag?: (id: string) => void
  onReject?: (id: string) => void
}

export const StudentReviewModal: React.FC<StudentReviewModalProps> = ({ isOpen, onClose, student, onApprove, onFlag, onReject }) => {
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !student) return null

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        
        <div className={styles.header}>
          <div className={styles.studentInfo}>
            <h2>{student.name}</h2>
            <p>{student.email}</p>
            <p>{student.phone}</p>
          </div>
          
          <div className={styles.statusArea}>
            <div className={styles.statusGroup}>
              <span className={styles.statusLabel}>Application Status</span>
              <span className={`${styles.statusPill} ${
                student.status === 'Verified' ? styles.statusVerified :
                student.status === 'Rejected' ? styles.statusRejected :
                styles.statusPending
              }`}>
                {student.status}
              </span>
            </div>
            <button className={styles.closeBtn} onClick={onClose}>✕</button>
          </div>
        </div>

        <div className={styles.gridCards}>
          <div className={styles.card}>
            <h3>SCHOOL</h3>
            <p>{student.school}</p>
          </div>
          <div className={styles.card}>
            <h3>PROGRAM</h3>
            <p>{student.program}</p>
          </div>
          <div className={styles.card}>
            <h3>DATE SUBMITTED</h3>
            <p>{student.date}</p>
          </div>
          <div className={styles.card}>
            <h3>GWA</h3>
            <p>{student.gwa}</p>
          </div>
        </div>

        <div className={styles.documentsArea}>
          <div className={styles.docsSection}>
            <h4>SUBMITTED DOCUMENTS</h4>
            <div className={styles.pillGroup}>
              {student.submittedDocuments?.map((doc, idx) => (
                <span key={idx} className={styles.docPill}>{doc}</span>
              ))}
            </div>
          </div>
          <div className={styles.appliedSection}>
            <h4>APPLIED FOR</h4>
            <span className={styles.docPill}>{student.appliedFor}</span>
          </div>
        </div>

        <div className={styles.actions}>
          <button className={styles.btnApprove} onClick={() => onApprove?.(student.id)}>Approve</button>
          <button className={styles.btnFlag} onClick={() => onFlag?.(student.id)}>Flag for Review</button>
          <button className={styles.btnReject} onClick={() => onReject?.(student.id)}>Reject</button>
        </div>
        
      </div>
    </div>
  )
}