import { useState } from 'react'
import { ArrowLeft, User, FileText, Check, Calendar, Phone, MapPin, X } from 'lucide-react'
import type { Applicant } from '../types/employer.types'
import styles from './ReviewApplicantModal.module.css'

interface ReviewApplicantModalProps {
  applicant: Applicant
  onClose: () => void
  onStatusChange?: (newStatus: string) => void
}

export function ReviewApplicantModal({ applicant, onClose, onStatusChange }: ReviewApplicantModalProps) {
  const [notes, setNotes] = useState(applicant.notes || '')

  const getStatusPillClass = (status: string) => {
    switch (status) {
      case 'Accepted':
      case 'Shortlisted':
        return styles.accepted
      case 'Rejected':
        return styles.rejected
      case 'Under Review':
      case 'For Review':
        return styles.underReview
      case 'Pending':
        return '' // Default orange pill
      default:
        return ''
    }
  }

  let currentStep = 2; // Default to For Review
  if (['Shortlisted', 'Pending'].includes(applicant.status)) {
    currentStep = 3;
  } else if (['Accepted', 'Rejected'].includes(applicant.status)) {
    currentStep = 4;
  }

  const steps = [
    { id: 1, title: 'Application Submitted', subtitle: applicant.dateApplied },
    { id: 2, title: 'For Review', subtitle: currentStep === 2 ? 'Awaiting your review' : '' },
    { id: 3, title: 'Shortlisted/Interview', subtitle: applicant.status === 'Pending' ? 'Interview Completed' : '' },
    { id: 4, title: applicant.status === 'Rejected' ? 'Rejected' : (applicant.status === 'Accepted' ? 'Accepted' : 'Final Decision'), subtitle: '' },
  ];

  const renderIcon = (stepId: number) => {
    if (stepId < currentStep || (stepId === currentStep && applicant.status === 'Accepted')) {
       return (
         <div className={`${styles.timelineIcon} ${styles.timelineIconGreen}`}>
           <Check size={14} />
         </div>
       )
    }
    if (stepId === currentStep && applicant.status === 'Rejected') {
       return (
         <div className={`${styles.timelineIcon} ${styles.timelineIconRed}`}>
           <X size={14} />
         </div>
       )
    }
    if (stepId === currentStep) {
       return (
         <div className={`${styles.timelineIcon} ${styles.timelineIconYellow}`}>
           <div className={styles.timelineDotYellow}></div>
         </div>
       )
    }
    return (
       <div className={`${styles.timelineIcon} ${styles.timelineIconGray}`}>
         <div className={styles.timelineDotGray}></div>
       </div>
    )
  }

  const renderLine = (stepId: number) => {
    if (stepId === steps.length) return null;
    if (stepId < currentStep) {
      return <div className={`${styles.timelineLine} ${styles.timelineLineGreen}`}></div>
    }
    return <div className={`${styles.timelineLine} ${styles.timelineLineGray}`}></div>
  }

  const getTitleClass = (stepId: number) => {
    if (stepId < currentStep || (stepId === currentStep && applicant.status === 'Accepted')) return ''; 
    if (stepId === currentStep && applicant.status === 'Rejected') return styles.textRed;
    if (stepId === currentStep) return styles.textYellow;
    return styles.textGray;
  }

  const handleStatusChange = (newStatus: string) => {
    if (onStatusChange) {
      onStatusChange(newStatus)
    }
  }

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        {/* Header */}
        <div className={styles.header}>
          <button className={styles.backBtn} onClick={onClose}>
            <ArrowLeft size={24} />
            <span>Back to Applicants</span>
          </button>
        </div>

        <div className={styles.twoColumnGrid}>
          {/* Left Column */}
          <div className={styles.leftCol}>
            {/* Profile Section */}
            <div className={styles.profileSection}>
              <div className={styles.profileAvatarRow}>
                <div className={styles.avatarPlaceholder}></div>
                <div className={styles.profileInfo}>
                  <div className={styles.statusPillWrapper}>
                    <span className={`${styles.statusPill} ${getStatusPillClass(applicant.status)}`}>
                      {applicant.status}
                    </span>
                  </div>
                  <h2 className={styles.applicantName}>{applicant.name}</h2>
                  <a href={`mailto:${applicant.email}`} className={styles.emailLink}>{applicant.email}</a>
                  <p className={styles.contactInfo}>
                    <Phone size={14} />
                    <span>{applicant.phone}</span>
                  </p>
                  <p className={styles.contactInfo}>
                    <MapPin size={14} />
                    <span>{applicant.location}</span>
                  </p>
                </div>
              </div>

              <hr className={styles.divider} />
              
              <div className={styles.appliedForSection}>
                <p className={styles.appliedLabel}>Applied for</p>
                <h3 className={styles.appliedTitle}>{applicant.opportunityTitle}</h3>
                <p className={styles.appliedDate}>Applied on {applicant.dateApplied}</p>
                <p className={styles.referredBy}>Referred by QC PESO</p>
              </div>

              <hr className={styles.divider} />

              {/* Timeline */}
              <div className={styles.timelineSection}>
                <h3 className={styles.timelineTitle}>Application Status</h3>
                
                {steps.map((step) => (
                  <div key={step.id} className={styles.timelineItem}>
                    <div className={styles.timelineIconWrapper}>
                      {renderIcon(step.id)}
                      {renderLine(step.id)}
                    </div>
                    <div className={styles.timelineContent}>
                      <h4 className={`${styles.timelineStepTitle} ${getTitleClass(step.id)}`}>{step.title}</h4>
                      {step.subtitle && <p className={`${styles.timelineStepDate} ${getTitleClass(step.id)}`}>{step.subtitle}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className={styles.rightCol}>
            {/* Applicant Information */}
            <div className={styles.infoSection}>
              <h3 className={styles.sectionTitle}>
                <div className={styles.sectionIcon}>
                  <User size={20} />
                </div>
                Applicant Information
              </h3>
              <div className={styles.infoGrid}>
                <div className={styles.infoLabel}>Full Name</div>
                <div className={styles.infoValue}>{applicant.name}</div>

                <div className={styles.infoLabel}>Course/Program</div>
                <div className={styles.infoValue}>{applicant.course}</div>

                <div className={styles.infoLabel}>Year Level</div>
                <div className={styles.infoValue}>{applicant.yearLevel}</div>

                <div className={styles.infoLabel}>School</div>
                <div className={styles.infoValue}>{applicant.school}</div>

                <div className={styles.infoLabel}>Preferred Field</div>
                <div className={styles.infoValue}>{applicant.preferredField}</div>

                <div className={styles.infoLabel}>Required Hours</div>
                <div className={styles.infoValue}>{applicant.requiredHours} Hours</div>

                <div className={styles.infoLabel}>Availability Date</div>
                <div className={styles.infoValue}>{applicant.availabilityDate}</div>
              </div>
            </div>

            {/* Applicant Documents */}
            <div className={styles.infoSection}>
              <h3 className={styles.sectionTitle}>
                <div className={styles.sectionIcon}>
                  <FileText size={20} />
                </div>
                Applicant Documents
              </h3>
              <div className={styles.docsList}>
                <div className={styles.docItem}>
                  <div className={styles.docIcon}>PDF</div>
                  <div className={styles.docDetails}>
                    <p className={styles.docNameRed}>Resume/CV</p>
                    <p className={styles.docFilename}>{applicant.name.replace(/\s+/g, '').toLowerCase()}_resume.pdf</p>
                  </div>
                  <button className={styles.viewDocBtn}>View</button>
                </div>
                
                <div className={styles.docItem}>
                  <div className={styles.docIcon}>PDF</div>
                  <div className={styles.docDetails}>
                    <p className={styles.docNameBlue}>Endorsement Letter</p>
                    <p className={styles.docFilename}>{applicant.name.replace(/\s+/g, '').toLowerCase()}_endorsement.pdf</p>
                  </div>
                  <button className={styles.viewDocBtn}>View</button>
                </div>

                <div className={styles.docItem}>
                  <div className={styles.docIcon}>PDF</div>
                  <div className={styles.docDetails}>
                    <p className={styles.docNameBlue}>Latest Credential</p>
                    <p className={styles.docFilename}>{applicant.name.replace(/\s+/g, '').toLowerCase()}_COR.pdf</p>
                  </div>
                  <button className={styles.viewDocBtn}>View</button>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className={styles.notesSection}>
              <h3 className={styles.notesTitle}>Notes</h3>
              <textarea 
                className={styles.notesTextarea}
                placeholder="Add notes about this applicant..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={500}
              />
              <div className={styles.charCount}>{notes.length}/500</div>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        {applicant.status !== 'Rejected' && applicant.status !== 'Accepted' && (
          <div className={styles.actionBar}>
            {applicant.status === 'Shortlisted' || applicant.status === 'Pending' ? (
              <>
                <button 
                  className={styles.actionBtnGreen}
                  onClick={() => handleStatusChange('Accepted')}
                >
                  <Check size={18} />
                  <span>Accept Applicant</span>
                </button>
                <button 
                  className={styles.actionBtnRed}
                  onClick={() => handleStatusChange('Rejected')}
                >
                  <X size={18} />
                  <span>Reject Applicant</span>
                </button>
              </>
            ) : (
              <>
                <button 
                  className={styles.actionBtnGreen}
                  onClick={() => handleStatusChange('Shortlisted')}
                >
                  <Check size={18} />
                  <span>Move to Shortlisted</span>
                </button>
                <button 
                  className={styles.actionBtnBlue}
                  onClick={() => handleStatusChange('Pending')}
                >
                  <Calendar size={18} />
                  <span>Schedule Interview</span>
                </button>
                <button 
                  className={styles.actionBtnRed}
                  onClick={() => handleStatusChange('Rejected')}
                >
                  <X size={18} />
                  <span>Reject Applicant</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
