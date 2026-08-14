import React, { useState, useRef } from 'react'
import { X, Upload, Building2 } from 'lucide-react'
import type { CompanyProfile } from '../types/employer.types'
import styles from './EditCompanyProfileModal.module.css'

interface EditCompanyProfileModalProps {
  profile: CompanyProfile
  onClose: () => void
  onSave: (updated: CompanyProfile) => void
}

export function EditCompanyProfileModal({
  profile,
  onClose,
  onSave,
}: EditCompanyProfileModalProps) {
  const [formData, setFormData] = useState<CompanyProfile>({ ...profile })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const result = event.target?.result as string
        if (result) {
          setFormData((prev) => ({ ...prev, logoUrl: result }))
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Edit Company Profile</h2>
          <button className={styles.closeBtn} onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGrid}>
            {/* Logo / PFP Upload section in modal */}
            <div className={`${styles.field} ${styles.fullWidth}`}>
              <label>Company Logo / Profile Picture</label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  marginTop: '4px',
                }}
              >
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    border: '2px solid #160e6f',
                    overflow: 'hidden',
                    background: '#f3f4f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {formData.logoUrl ? (
                    <img
                      src={formData.logoUrl}
                      alt="Logo Preview"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <Building2 size={28} color="#6b7280" />
                  )}
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleLogoFileChange}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    border: '1px solid #160e6f',
                    borderRadius: '8px',
                    background: '#ffffff',
                    color: '#160e6f',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  <Upload size={16} />
                  <span>Upload Logo/PFP</span>
                </button>
              </div>
            </div>

            <div className={`${styles.field} ${styles.fullWidth}`}>
              <label htmlFor="companyName">Company Name</label>
              <input
                id="companyName"
                name="companyName"
                type="text"
                value={formData.companyName}
                onChange={handleChange}
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="industry">Industry</label>
              <input
                id="industry"
                name="industry"
                type="text"
                value={formData.industry}
                onChange={handleChange}
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="location">Location</label>
              <input
                id="location"
                name="location"
                type="text"
                value={formData.location}
                onChange={handleChange}
                required
              />
            </div>

            <div className={`${styles.field} ${styles.fullWidth}`}>
              <label htmlFor="about">About Company</label>
              <textarea
                id="about"
                name="about"
                value={formData.about}
                onChange={handleChange}
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="contactPerson">Contact Person</label>
              <input
                id="contactPerson"
                name="contactPerson"
                type="text"
                value={formData.contactPerson}
                onChange={handleChange}
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="contactNumber">Contact Number</label>
              <input
                id="contactNumber"
                name="contactNumber"
                type="text"
                value={formData.contactNumber}
                onChange={handleChange}
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="website">Company Website</label>
              <input
                id="website"
                name="website"
                type="text"
                value={formData.website}
                onChange={handleChange}
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="yearEstablished">Year Established</label>
              <input
                id="yearEstablished"
                name="yearEstablished"
                type="text"
                value={formData.yearEstablished}
                onChange={handleChange}
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="companySize">Company Size</label>
              <input
                id="companySize"
                name="companySize"
                type="text"
                value={formData.companySize}
                onChange={handleChange}
                placeholder="e.g. 51-200 employees or 150"
                required
              />
            </div>
          </div>

          <div className={styles.actions}>
            <button className={styles.cancelBtn} type="button" onClick={onClose}>
              Cancel
            </button>
            <button className={styles.saveBtn} type="submit">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
