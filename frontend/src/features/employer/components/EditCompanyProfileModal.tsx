import React, { useState, useRef } from 'react'
import { X, Upload, Building2 } from 'lucide-react'
import type { CompanyProfile } from '../types/employer.types'
import styles from './EditCompanyProfileModal.module.css'

interface EditCompanyProfileModalProps {
  profile: CompanyProfile
  onClose: () => void
  onSave: (updated: CompanyProfile) => void
}

const NULLABLE_FIELDS = new Set([
  'website_url',
  'year_established',
  'company_size',
  'address_district',
  'contact_person_middle_name',
  'contact_person_extension_name',
])

const INDUSTRY_OPTIONS = [
  'Office Administration',
  'Engineering',
  'Information Technology',
  'Accounting / Finance',
  'Customer Service / Retail',
  'Human Resources',
  'Hospitality / Tourism',
  'Healthcare',
]

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
    const normalizedValue = NULLABLE_FIELDS.has(name) && !value.trim() ? null : value
    setFormData((prev) => ({ ...prev, [name]: normalizedValue } as CompanyProfile))
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
              <label htmlFor="company_name">Company Name</label>
              <input
                id="company_name"
                name="company_name"
                type="text"
                value={formData.company_name}
                onChange={handleChange}
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="company_type">Company Type</label>
              <select
                id="company_type"
                name="company_type"
                value={formData.company_type}
                onChange={handleChange}
                required
              >
                <option value="Government">Government</option>
                <option value="Private">Private</option>
              </select>
            </div>

            <div className={styles.field}>
              <label htmlFor="industry">Industry</label>
              <select id="industry" name="industry" value={formData.industry} onChange={handleChange} required>
                {INDUSTRY_OPTIONS.map((industry) => <option key={industry} value={industry}>{industry}</option>)}
              </select>
            </div>

            <div className={styles.field}>
              <label htmlFor="address_line">Address Line</label>
              <input
                id="address_line"
                name="address_line"
                type="text"
                value={formData.address_line}
                onChange={handleChange}
                required
              />
            </div>

            <div className={`${styles.field} ${styles.fullWidth}`}>
              <label htmlFor="description">Company Description</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="address_barangay">Barangay</label>
              <input
                id="address_barangay"
                name="address_barangay"
                type="text"
                value={formData.address_barangay}
                onChange={handleChange}
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="address_district">District</label>
              <input
                id="address_district"
                name="address_district"
                type="text"
                value={formData.address_district ?? ''}
                onChange={handleChange}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="address_city">City</label>
              <input
                id="address_city"
                name="address_city"
                type="text"
                value={formData.address_city}
                onChange={handleChange}
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="contact_person_first_name">Contact Person First Name</label>
              <input
                id="contact_person_first_name"
                name="contact_person_first_name"
                type="text"
                value={formData.contact_person_first_name}
                onChange={handleChange}
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="contact_person_middle_name">Contact Person Middle Name</label>
              <input
                id="contact_person_middle_name"
                name="contact_person_middle_name"
                type="text"
                value={formData.contact_person_middle_name ?? ''}
                onChange={handleChange}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="contact_person_last_name">Contact Person Last Name</label>
              <input
                id="contact_person_last_name"
                name="contact_person_last_name"
                type="text"
                value={formData.contact_person_last_name}
                onChange={handleChange}
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="contact_person_extension_name">Contact Person Extension Name</label>
              <input id="contact_person_extension_name" name="contact_person_extension_name" type="text" value={formData.contact_person_extension_name ?? ''} onChange={handleChange} />
            </div>

            <div className={styles.field}>
              <label htmlFor="contact_email">Contact Email</label>
              <input id="contact_email" name="contact_email" type="email" value={formData.contact_email} onChange={handleChange} required />
            </div>

            <div className={styles.field}>
              <label htmlFor="contact_number">Contact Number</label>
              <input id="contact_number" name="contact_number" type="text" value={formData.contact_number} onChange={handleChange} required />
            </div>

            <div className={styles.field}>
              <label htmlFor="website_url">Company Website</label>
              <input id="website_url" name="website_url" type="text" value={formData.website_url ?? ''} onChange={handleChange} />
            </div>

            <div className={styles.field}>
              <label htmlFor="year_established">Year Established</label>
              <input id="year_established" name="year_established" type="text" value={formData.year_established ?? ''} onChange={handleChange} />
            </div>

            <div className={styles.field}>
              <label htmlFor="company_size">Company Size</label>
              <input id="company_size" name="company_size" type="text" value={formData.company_size ?? ''} onChange={handleChange} placeholder="e.g. 51-200 employees" />
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
