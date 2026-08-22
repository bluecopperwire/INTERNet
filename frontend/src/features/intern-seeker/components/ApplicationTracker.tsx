import { Check, Info, X } from 'lucide-react'
import styles from './ApplicationTracker.module.css'
import type { UserApplication } from '../types/application.types'

interface ApplicationTrackerProps {
  application: UserApplication | null
  onClose: () => void
}

export function ApplicationTracker({ application, onClose }: ApplicationTrackerProps) {
  if (!application) return null

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3 className={styles.title}>Application Progress</h3>
          <button className={styles.closeBtn} type="button" onClick={onClose} aria-label="Close modal"><X /></button>
        </div>
        <div className={styles.appInfo}><h4>{application.companyName}</h4><p>{application.position}</p></div>
        <div className={styles.stepper}>
          {application.progress.map((step, index) => {
            const isCompleted = step.state === 'completed'
            const isCurrent = step.state === 'current' || step.state === 'interview-scheduled'
            const stepClass = isCompleted ? styles.stepPast : isCurrent ? styles.stepCurrent : styles.stepFuture
            return (
              <div key={step.stage} className={`${styles.step} ${stepClass}`}>
                <div className={styles.indicatorWrapper}>
                  <div className={styles.indicator}>
                    {isCompleted && <span className={styles.check}><Check /></span>}
                    {isCurrent && <span className={styles.dotWhite} />}
                    {!isCompleted && !isCurrent && <span className={styles.dotGrey} />}
                  </div>
                  {index < application.progress.length - 1 && <div className={`${styles.line} ${isCompleted ? styles.lineGreen : styles.lineGrey}`} />}
                </div>
                <div className={styles.content}>
                  <span className={styles.stageName}>{step.stage}</span>
                  <span className={step.timestamp ? styles.timestamp : styles.pendingText}>{step.timestamp ?? 'Pending'}</span>
                  <p className={styles.notes}>{step.message}</p>
                </div>
              </div>
            )
          })}
        </div>
        <div className={styles.footerBanner}><div className={styles.infoIconWrapper}><Info /></div><p>We will notify you once there is an update<br />on your application</p></div>
      </div>
    </div>
  )
}
