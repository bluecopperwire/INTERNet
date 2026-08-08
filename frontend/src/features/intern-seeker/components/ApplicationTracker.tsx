import React from 'react'
import styles from './ApplicationTracker.module.css'
import type { UserApplication } from '../types/internship.types'

interface ApplicationTrackerProps {
  application: UserApplication | null
  onClose: () => void
}

export const ApplicationTracker: React.FC<ApplicationTrackerProps> = ({ application, onClose }) => {
  if (!application) return null

  const lastCompletedIndex = [...application.progress].reverse().findIndex(step => step.status === 'Completed' || step.timestamp)
  const activeStepIndex = lastCompletedIndex !== -1 ? application.progress.length - 1 - lastCompletedIndex : -1

  const InfoIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="16" x2="12" y2="12"></line>
      <line x1="12" y1="8" x2="12.01" y2="8"></line>
    </svg>
  )

  const CheckIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  )

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3 className={styles.title}>Application Progress</h3>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close modal">✕</button>
        </div>
        
        <div className={styles.appInfo}>
          <h4>{application.companyName}</h4>
          <p>{application.position}</p>
        </div>

        <div className={styles.stepper}>
          {application.progress.map((step, index) => {
            const isPast = index < activeStepIndex;
            const isCurrent = index === activeStepIndex;
            const isFuture = index > activeStepIndex;

            let stepClass = ''
            if (isPast) stepClass = styles.stepPast
            if (isCurrent) stepClass = styles.stepCurrent
            if (isFuture) stepClass = styles.stepFuture

            return (
              <div key={index} className={`${styles.step} ${stepClass}`}>
                <div className={styles.indicatorWrapper}>
                  <div className={styles.indicator}>
                    {isPast && <span className={styles.check}><CheckIcon /></span>}
                    {isCurrent && <span className={styles.dotWhite}></span>}
                    {isFuture && <span className={styles.dotGrey}></span>}
                  </div>
                  {index < application.progress.length - 1 && (
                    <div className={`${styles.line} ${isPast ? styles.lineGreen : styles.lineGrey}`}></div>
                  )}
                </div>
                
                <div className={styles.content}>
                  <span className={styles.stageName}>{step.stage}</span>
                  {step.timestamp ? (
                    <span className={styles.timestamp}>{step.timestamp}</span>
                  ) : (
                    <span className={styles.pendingText}>Pending</span>
                  )}
                  {step.notes && <p className={styles.notes}>{step.notes}</p>}
                </div>
              </div>
            )
          })}
        </div>
        
        <div className={styles.footerBanner}>
          <div className={styles.infoIconWrapper}><InfoIcon /></div>
          <p>We will notify you once there is an update<br/>on your application</p>
        </div>
      </div>
    </div>
  )
}