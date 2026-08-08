import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './ProfileEditorPage.module.css'
import { useInternshipPortal } from '../hooks/useInternshipPortal'
import type { UserProfile } from '../types/internship.types'

export const ProfileEditorPage: React.FC = () => {
  const navigate = useNavigate()
  const { profile, saveProfile, isLoading } = useInternshipPortal()
  const [formData, setFormData] = useState<Partial<UserProfile>>({})

  useEffect(() => {
    if (profile) setFormData(profile)
  }, [profile])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    let parsedValue: string | boolean = value
    if (type === 'radio' && (value === 'true' || value === 'false')) {
      parsedValue = value === 'true'
    }

    if (name.includes('.')) {
      const [section, field] = name.split('.') as [keyof UserProfile, string]
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...(prev[section] as any),
          [field]: parsedValue
        }
      }))
    } else {
      setFormData(prev => ({ ...prev, [name]: parsedValue }))
    }
  }

  const handleCheckboxChange = (section: 'preferences', field: 'preferredIndustries' | 'schedule', value: string) => {
    setFormData(prev => {
      const currentArray = (prev[section]?.[field] as string[]) || []
      const newArray = currentArray.includes(value)
        ? currentArray.filter(item => item !== value)
        : [...currentArray, value]
      return {
        ...prev,
        [section]: {
          ...(prev[section] as any),
          [field]: newArray
        }
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const success = await saveProfile(formData)
    if (success) {
      alert('Profile saved successfully!')
      navigate('/intern-seeker/profile')
    }
  }

  if (isLoading || !formData) return <div className={styles.loading}>Loading...</div>

  const PersonIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>
  )

  const AcademicIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
      <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
    </svg>
  )
  
  const InfoIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="16" x2="12" y2="12"></line>
      <line x1="12" y1="8" x2="12.01" y2="8"></line>
    </svg>
  )

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h2>My Profile</h2>
          <p>Complete your profile to increase your chances of being matched with opportunities.</p>
        </div>
        <button type="submit" form="profileForm" className={styles.saveBtn}>Save Profile</button>
      </div>

      <form id="profileForm" onSubmit={handleSubmit} className={styles.form}>
        
        {/* PERSONAL INFO */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.iconCircle}><PersonIcon /></div>
            <div className={styles.cardTitleBox}>
              <h3>Personal Information</h3>
              <p>Please put your correct information</p>
            </div>
          </div>
          
          <div className={styles.cardBody}>
            <div className={styles.grid4}>
              <div className={styles.inputGroup}>
                <label>First Name <span className={styles.req}>*</span></label>
                <input required type="text" name="firstName" value={formData.firstName || ''} onChange={handleChange} />
              </div>
              <div className={styles.inputGroup}>
                <label>Middle Name <span className={styles.req}>*</span></label>
                <input required type="text" name="middleName" value={formData.middleName || ''} onChange={handleChange} />
              </div>
              <div className={styles.inputGroup}>
                <label>Last Name <span className={styles.req}>*</span></label>
                <input required type="text" name="lastName" value={formData.lastName || ''} onChange={handleChange} />
              </div>
              <div className={styles.inputGroup}>
                <label>Extension Name</label>
                <input type="text" name="extensionName" value={formData.extensionName || ''} onChange={handleChange} />
              </div>
            </div>

            <div className={styles.grid3}>
              <div className={styles.inputGroup}>
                <label>Sex <span className={styles.req}>*</span></label>
                <div className={styles.selectWrapper}>
                  <select required name="sex" value={formData.sex || ''} onChange={handleChange}>
                    <option value="">Select Sex</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>
              <div className={styles.inputGroup}>
                <label>Birthdate <span className={styles.req}>*</span></label>
                <input required type="date" name="birthdate" value={formData.birthdate || ''} onChange={handleChange} />
              </div>
              <div className={styles.inputGroup}>
                <label>Contact Number <span className={styles.req}>*</span></label>
                <input required type="text" name="contactNumber" value={formData.contactNumber || ''} onChange={handleChange} />
              </div>
            </div>
            
            <div className={styles.grid3}>
              <div className={styles.inputGroup}>
                <label>House/Block No./Street <span className={styles.req}>*</span></label>
                <input required type="text" name="address.street" value={formData.address?.street || ''} onChange={handleChange} />
              </div>
              <div className={styles.inputGroup}>
                <label>Barangay <span className={styles.req}>*</span></label>
                <div className={styles.selectWrapper}>
                  <select required name="address.barangay" value={formData.address?.barangay || ''} onChange={handleChange}>
                    <option value="">Select Barangay</option>
                    <option value="Loyola Heights">Loyola Heights</option>
                    <option value="Batasan Hills">Batasan Hills</option>
                  </select>
                </div>
              </div>
              <div className={styles.inputGroup}>
                <label>District <span className={styles.req}>*</span></label>
                <div className={styles.selectWrapper}>
                  <select required name="address.district" value={formData.address?.district || ''} onChange={handleChange}>
                    <option value="">Select District</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className={styles.grid3}>
              <div className={styles.inputGroup}>
                <label>City <span className={styles.req}>*</span></label>
                <input required type="text" name="address.city" value={formData.address?.city || ''} onChange={handleChange} />
              </div>
              <div className={styles.inputGroup}>
                <label>Inquiry via <span className={styles.req}>*</span></label>
                <div className={styles.selectWrapper}>
                  <select required name="inquiryVia" value={formData.inquiryVia || ''} onChange={handleChange}>
                    <option value="Walk-in">Walk-in</option>
                    <option value="Online">Online</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ACADEMIC INFO */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.iconCircle}><AcademicIcon /></div>
            <div className={styles.cardTitleBox}>
              <h3>Academic Information</h3>
              <p>Please put your correct information</p>
            </div>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.grid2Unequal}>
              <div className={styles.inputGroup}>
                <label>School Name in Full (No Acronyms / Abbreviations)<span className={styles.req}>*</span></label>
                <input required type="text" name="academic.schoolName" placeholder="Enter school name" value={formData.academic?.schoolName || ''} onChange={handleChange} />
              </div>
              <div className={styles.inputGroup}>
                <label>Year Level <span className={styles.req}>*</span></label>
                <div className={styles.selectWrapper}>
                  <select required name="academic.yearLevel" value={formData.academic?.yearLevel || ''} onChange={handleChange}>
                    <option value="">Select year level</option>
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>
              </div>
            </div>
            <div className={styles.grid3}>
              <div className={styles.inputGroup}>
                <label>Program/Strand <span className={styles.req}>*</span></label>
                <input required type="text" name="academic.program" placeholder="Enter program/strand" value={formData.academic?.program || ''} onChange={handleChange} />
              </div>
            </div>
          </div>
        </div>

        {/* PREFERENCES */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.iconCircle}><AcademicIcon /></div>
            <div className={styles.cardTitleBox}>
              <h3>Work Immersion / Internship Requirements and Preferences</h3>
              <p>Please provide accurate details regarding your internship requirements to help us match you with the most suitable host establishment.</p>
            </div>
          </div>
          
          <div className={styles.cardBody}>
            <div className={styles.grid2Half}>
              <div className={styles.inputGroup}>
                <label>Required Work Immersion / Internship Hours <span className={styles.req}>*</span></label>
                <input type="number" required placeholder="Enter required hours" name="preferences.requiredHours" value={formData.preferences?.requiredHours || ''} onChange={handleChange} />
              </div>
              <div className={styles.inputGroup}>
                <label>Are you willing to be assigned outside your preferred field if not available? <span className={styles.req}>*</span></label>
                <div className={styles.radioGroup}>
                  <label className={styles.radioLabel}>
                    <input type="radio" name="preferences.willingToAssignOutside" value="true" onChange={handleChange} checked={formData.preferences?.willingToAssignOutside === true} /> Yes
                  </label>
                  <label className={styles.radioLabel}>
                    <input type="radio" name="preferences.willingToAssignOutside" value="false" onChange={handleChange} checked={formData.preferences?.willingToAssignOutside === false} /> No
                  </label>
                </div>
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label>Preferred Industry / Field of Internship <span className={styles.req}>*</span></label>
              <div className={styles.checkboxGrid}>
                {['Office Administration', 'Information Technology', 'Customer Service / Retail', 'Hospitality / Tourism', 'Engineering', 'Accounting / Finance', 'Human Resources', 'Healthcare'].map(ind => (
                  <label key={ind} className={styles.checkboxLabel}>
                    <input 
                      type="checkbox" 
                      checked={formData.preferences?.preferredIndustries?.includes(ind) || false}
                      onChange={() => handleCheckboxChange('preferences', 'preferredIndustries', ind)}
                    /> {ind}
                  </label>
                ))}
                <label className={styles.checkboxLabel}>
                  <input type="checkbox" /> Other: <input type="text" className={styles.inlineInput} />
                </label>
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label>Internship Schedule / Availability <span className={styles.req}>*</span></label>
              <div className={styles.checkboxGrid4}>
                {['Weekdays (Mon-Fri)', 'Weekends (Sat-Sun)', 'Flexible'].map(schedule => (
                  <label key={schedule} className={styles.checkboxLabel}>
                    <input 
                      type="checkbox" 
                      checked={formData.preferences?.schedule?.includes(schedule) || false}
                      onChange={() => handleCheckboxChange('preferences', 'schedule', schedule)}
                    /> {schedule}
                  </label>
                ))}
                <label className={styles.checkboxLabel}>
                  <input type="checkbox" /> Other: <input type="text" className={styles.inlineInput} />
                </label>
              </div>
            </div>

            <div className={styles.grid2Half}>
               <div className={styles.inputGroup}>
                <label>Internship Availability Date (Start of Internship) <span className={styles.req}>*</span></label>
                <input type="date" required name="preferences.startDate" value={formData.preferences?.startDate || ''} onChange={handleChange} />
              </div>
              <div className={styles.inputGroup}>
                <label>Preferred Host Organization Type <span className={styles.req}>*</span></label>
                <div className={styles.selectWrapper}>
                  <select name="preferences.hostOrgType" value={formData.preferences?.hostOrgType || ''} onChange={handleChange}>
                    <option value="">Select organization type</option>
                    <option value="Private">Private</option>
                    <option value="Public">Public Sector</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER BANNER */}
        <div className={styles.infoBanner}>
          <div className={styles.infoIconWrapper}>
            <InfoIcon />
          </div>
          <div className={styles.infoBannerText}>
            <strong>Your profile help us match you with the most suitable internship or work immersion opportunities.</strong>
            <p>Please make sure all information provided is accurate and up to date.</p>
          </div>
        </div>

      </form>
    </div>
  )
}