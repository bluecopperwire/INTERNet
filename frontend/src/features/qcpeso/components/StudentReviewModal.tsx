import React from 'react'
import styles from './StudentReviewModal.module.css'
import type { StudentApplication } from '../types/qcpeso.types'

interface StudentReviewModalProps {
  isOpen: boolean
  onClose: () => void
  student: StudentApplication | null
}

export const StudentReviewModal: React.FC<StudentReviewModalProps> = ({ isOpen, onClose, student }) => {
  if (!isOpen || !student) return null

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        
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
              {student.submittedDocuments.map((doc, idx) => (
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
          <button className={styles.btnApprove}>Approve</button>
          <button className={styles.btnFlag}>Flag for Review</button>
          <button className={styles.btnReject}>Reject</button>
        </div>
        
      </div>
    </div>
  )
}