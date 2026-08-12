import React, { useState, useEffect, useRef } from 'react'
import styles from './QCPesoProfilePage.module.css'
import { useQCPeso } from '../hooks/useQCPeso'
import type { QCPesoProfile } from '../types/qcpeso.types'

export const QCPesoProfilePage: React.FC = () => {
  const { profile, isLoading } = useQCPeso()
  
  const [displayProfile, setDisplayProfile] = useState<QCPesoProfile | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editForm, setEditForm] = useState<Partial<QCPesoProfile>>({})
  
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  useEffect(() => {
    if (profile) {
      setDisplayProfile(profile)
      setEditForm(profile)
    }
  }, [profile])

  if (isLoading || !displayProfile) return <div className={styles.loading}>Loading Profile...</div>

  const handleAvatarClick = () => {
    avatarInputRef.current?.click()
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const validTypes = ['image/png', 'image/jpeg', 'image/jpg']
      if (!validTypes.includes(file.type)) {
        alert('Please upload a valid PNG or JPG file only.')
        return
      }
      const imageUrl = URL.createObjectURL(file)
      setAvatarPreview(imageUrl)
    }
    if (avatarInputRef.current) avatarInputRef.current.value = ''
  }

  const handleEditClick = () => {
    setEditForm(displayProfile)
    setIsEditModalOpen(true)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setEditForm(prev => {
      const updated = { ...prev, [name]: value }
      if (name === 'firstName' || name === 'middleName' || name === 'lastName') {
        const f = name === 'firstName' ? value : (prev.firstName || '')
        const m = name === 'middleName' ? value : (prev.middleName || '')
        const l = name === 'lastName' ? value : (prev.lastName || '')
        updated.fullName = `${f} ${m ? m + ' ' : ''}${l}`.trim()
      }
      if (name === 'position') {
        updated.role = value
        updated.qcpesoPosition = value
      }
      return updated
    })
  }

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault()
    setDisplayProfile(editForm as QCPesoProfile)
    setIsEditModalOpen(false)
  }

  const EditIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
    </svg>
  )

  return (
    <div className={styles.pageWrapper}>
      <input 
        type="file" 
        accept=".png,.jpg,.jpeg,image/png,image/jpeg" 
        ref={avatarInputRef} 
        style={{ display: 'none' }} 
        onChange={handleAvatarChange} 
      />

      {isEditModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>Edit Profile</h3>
              <button className={styles.closeBtn} onClick={() => setIsEditModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveProfile} className={styles.editForm}>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>First Name</label>
                  <input type="text" name="firstName" value={editForm.firstName || ''} onChange={handleInputChange} required />
                </div>
                <div className={styles.formGroup}>
                  <label>Middle Name</label>
                  <input type="text" name="middleName" value={editForm.middleName || ''} onChange={handleInputChange} />
                </div>
                <div className={styles.formGroup}>
                  <label>Last Name</label>
                  <input type="text" name="lastName" value={editForm.lastName || ''} onChange={handleInputChange} required />
                </div>
                <div className={styles.formGroup}>
                  <label>Birthdate</label>
                  <input type="date" name="birthdate" value={editForm.birthdate || ''} onChange={handleInputChange} required />
                </div>
                <div className={styles.formGroup}>
                  <label>Employee ID Number</label>
                  <input type="text" name="employeeIdNumber" value={editForm.employeeIdNumber || ''} onChange={handleInputChange} required />
                </div>
                <div className={styles.formGroup}>
                  <label>Position / Designation</label>
                  <input type="text" name="position" value={editForm.position || ''} onChange={handleInputChange} required />
                </div>
                <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
                  <label>Department / Office</label>
                  <input type="text" name="department" value={editForm.department || ''} onChange={handleInputChange} required />
                </div>
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setIsEditModalOpen(false)}>Cancel</button>
                <button type="submit" className={styles.saveBtn}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className={styles.mainContainer}>
        <div className={styles.banner}>
          <button className={styles.editProfileBtn} onClick={handleEditClick}>
            Edit Profile
          </button>
          
          <div className={styles.bannerContent}>
            <div className={styles.avatarContainer} onClick={handleAvatarClick}>
              <div 
                className={styles.avatar}
                style={avatarPreview ? { backgroundImage: `url(${avatarPreview})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
              ></div>
              <div className={styles.avatarEditBadge}>
                <EditIcon />
              </div>
            </div>
            <div className={styles.bannerInfo}>
              <h2>{displayProfile.fullName}</h2>
              <p>{displayProfile.position}</p>
              <p>{displayProfile.department}</p>
            </div>
          </div>
        </div>

        <div className={styles.contentArea}>
          <div className={styles.tabsContainer}>
            <div className={styles.tabs}>
              <button className={`${styles.tab} ${styles.active}`}>About</button>
            </div>
          </div>

          <section className={styles.sectionBlock}>
            <div className={styles.sectionHeader}>
              <h3>About <span className={styles.headerEditIcon} onClick={handleEditClick}><EditIcon /></span></h3>
              <p className={styles.subtitle}>Updating your information will offer you the most relevent content</p>
            </div>

            <div className={styles.aboutGrid}>
              <div className={styles.infoItem}>
                <label>First Name</label>
                <span>{displayProfile.firstName}</span>
              </div>
              <div className={styles.infoItem}>
                <label>Middle Name</label>
                <span>{displayProfile.middleName || 'N/A'}</span>
              </div>
              <div className={styles.infoItem}>
                <label>Last Name</label>
                <span>{displayProfile.lastName}</span>
              </div>
              <div className={styles.infoItem}>
                <label>Birthdate</label>
                <span>{displayProfile.birthdate}</span>
              </div>
              <div className={styles.infoItem}>
                <label>Employee ID No.</label>
                <span>{displayProfile.employeeIdNumber}</span>
              </div>
              <div className={styles.infoItem}>
                <label>Position / Designation</label>
                <span>{displayProfile.position}</span>
              </div>
              <div className={styles.infoItem} style={{ gridColumn: 'span 2' }}>
                <label>Department / Office</label>
                <span>{displayProfile.department}</span>
              </div>
            </div>
            <hr className={styles.divider} />
          </section>
        </div>
      </div>
    </div>
  )
}