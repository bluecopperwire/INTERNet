import React from 'react'
import styles from './OnboardingModal.module.css'

interface OnboardingModalProps {
  isOpen: boolean
  onClose: () => void
  onStart: () => void
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose, onStart }) => {
  if (!isOpen) return null

  const ProfileIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>
  )

  const UploadIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
      <polyline points="17 8 12 3 7 8"></polyline>
      <line x1="12" y1="3" x2="12" y2="15"></line>
    </svg>
  )

  const BriefcaseIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
      <line x1="2" y1="12" x2="22" y2="12"></line>
    </svg>
  )

  const TrackIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <polyline points="12 6 12 12 16 14"></polyline>
    </svg>
  )

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>Create Profile</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close modal">✕</button>
        </div>
        
        <div className={styles.content}>
          <h3 className={styles.welcomeText}>Welcome to INTERNet!</h3>
          <p className={styles.subtitle}>
            Your journey to a meaningful work immersion/internship starts here. Complete your profile for personalized opportunities.
          </p>
          
          <ul className={styles.stepList}>
            <li>
              <div className={styles.iconContainer}><ProfileIcon /></div>
              <div className={styles.stepText}>
                <strong>Complete your profile</strong>
                <p>Tell us more about your education and preferences.</p>
              </div>
            </li>
            <li>
              <div className={styles.iconContainer}><UploadIcon /></div>
              <div className={styles.stepText}>
                <strong>Upload requirements</strong>
                <p>Upload your requirements to proceed with your applications.</p>
              </div>
            </li>
            <li>
              <div className={styles.iconContainer}><BriefcaseIcon /></div>
              <div className={styles.stepText}>
                <strong>Discover opportunities</strong>
                <p>Find internships or work immersions that match your interests</p>
              </div>
            </li>
            <li>
              <div className={styles.iconContainer}>
                <div className={styles.trackIconWrapper}>
                  <TrackIcon />
                  <div className={styles.trackBars}>
                    <span className={styles.bar1}></span>
                    <span className={styles.bar2}></span>
                    <span className={styles.bar3}></span>
                  </div>
                </div>
              </div>
              <div className={styles.stepText}>
                <strong>Track your applications</strong>
                <p>Stay updated on your application status.</p>
              </div>
            </li>
          </ul>

          <div className={styles.actions}>
            <button className={styles.startBtn} onClick={onStart}>Let's get started</button>
            <button className={styles.laterBtn} onClick={onClose}>Maybe Later</button>
          </div>
        </div>
      </div>
    </div>
  )
}