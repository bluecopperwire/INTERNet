import React from 'react'
import styles from './ProfileDetailsModal.module.css'
import type { UserProfile } from '../types/internship.types'

interface ProfileDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  profile: UserProfile | null
}

export const ProfileDetailsModal: React.FC<ProfileDetailsModalProps> = ({ isOpen, onClose, profile }) => {
  if (!isOpen || !profile) return null

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3 className={styles.title}>Complete Profile Information</h3>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close modal">✕</button>
        </div>
        
        <div className={styles.content}>

          <section className={styles.section}>
            <h4>Personal Information</h4>
            <div className={styles.grid}>
              <div className={styles.field}>
                <label>Full Name</label>
                <span>{profile.firstName} {profile.middleName} {profile.lastName} {profile.extensionName}</span>
              </div>
              <div className={styles.field}>
                <label>Sex</label>
                <span>{profile.sex || 'N/A'}</span>
              </div>
              <div className={styles.field}>
                <label>Birthdate</label>
                <span>{profile.birthdate || 'N/A'}</span>
              </div>
              <div className={styles.field}>
                <label>Contact Number</label>
                <span>{profile.contactNumber || 'N/A'}</span>
              </div>
              <div className={styles.field}>
                <label>Email Address</label>
                <span>{profile.email || 'N/A'}</span>
              </div>
              <div className={styles.field}>
                <label>Full Address</label>
                <span>
                  {profile.address.street}, {profile.address.barangay}, 
                  District {profile.address.district}, {profile.address.city}
                </span>
              </div>
              <div className={styles.field}>
                <label>Inquiry via</label>
                <span>{profile.inquiryVia || 'N/A'}</span>
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <h4>Academic Information</h4>
            <div className={styles.grid}>
              <div className={styles.field}>
                <label>School Name</label>
                <span>{profile.academic.schoolName || 'N/A'}</span>
              </div>
              <div className={styles.field}>
                <label>Program / Strand</label>
                <span>{profile.academic.program || 'N/A'}</span>
              </div>
              <div className={styles.field}>
                <label>Year Level</label>
                <span>{profile.academic.yearLevel || 'N/A'}</span>
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <h4>Internship Preferences</h4>
            <div className={styles.grid}>
              <div className={styles.field}>
                <label>Required Hours</label>
                <span>{profile.preferences.requiredHours ? `${profile.preferences.requiredHours} Hours` : 'N/A'}</span>
              </div>
              <div className={styles.field}>
                <label>Flexible Assignment</label>
                <span>{profile.preferences.willingToAssignOutside === null ? 'N/A' : (profile.preferences.willingToAssignOutside ? 'Yes' : 'No')}</span>
              </div>
              <div className={styles.field}>
                <label>Preferred Industries</label>
                <span>{profile.preferences.preferredIndustries?.length > 0 ? profile.preferences.preferredIndustries.join(', ') : 'N/A'}</span>
              </div>
              <div className={styles.field}>
                <label>Schedule Availability</label>
                <span>{profile.preferences.schedule?.length > 0 ? profile.preferences.schedule.join(', ') : 'N/A'}</span>
              </div>
              <div className={styles.field}>
                <label>Start Date</label>
                <span>{profile.preferences.startDate || 'N/A'}</span>
              </div>
              <div className={styles.field}>
                <label>Host Organization Type</label>
                <span>{profile.preferences.hostOrgType || 'N/A'}</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}