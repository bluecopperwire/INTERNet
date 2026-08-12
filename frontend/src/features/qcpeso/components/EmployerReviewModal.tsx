import React from 'react'
import styles from './EmployerReviewModal.module.css'
import type { EmployerOpportunity } from '../types/qcpeso.types'

interface EmployerReviewModalProps {
  isOpen: boolean
  onClose: () => void
  employer: EmployerOpportunity | null
}

export const EmployerReviewModal: React.FC<EmployerReviewModalProps> = ({ isOpen, onClose, employer }) => {
  if (!isOpen || !employer) return null

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        
        <div className={styles.header}>
          <div className={styles.companyInfo}>
            <h2>{employer.name}</h2>
            <p>{employer.email}</p>
            <p>{employer.phone}</p>
          </div>
          
          <div className={styles.statusArea}>
            <div className={styles.statusGroup}>
              <span className={styles.statusLabel}>Employer Status</span>
              <span className={styles.statusPill}>
                {employer.employerStatus}
              </span>
            </div>
            <button className={styles.closeBtn} onClick={onClose}>✕</button>
          </div>
        </div>

        <div className={styles.gridLayout}>
          <div className={styles.leftColumn}>
            <div className={styles.card}>
              <h3>REPRESENTATIVE</h3>
              <p>{employer.rep}</p>
            </div>
            
            <div className={styles.card}>
              <h3>ACCOUNT STATUS</h3>
              <div className={styles.accountStatusContent}>
                <div className={styles.activeBadge}>
                  {employer.status.toUpperCase()}
                </div>
                <div className={styles.createdDate}>
                  <span>Created on</span>
                  <span>{employer.createdOn}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className={styles.rightColumn}>
            <div className={`${styles.card} ${styles.fullHeightCard}`}>
              <h3>OPPORTUNITIES<br/>OFFERED</h3>
              <div className={styles.opportunitiesList}>
                {employer.opportunitiesOffered.map((opp, idx) => (
                  <p key={idx}>{opp}</p>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <button className={styles.btnApprove}>Approve</button>
          <button className={styles.btnReject}>Reject</button>
        </div>
        
      </div>
    </div>
  )
}