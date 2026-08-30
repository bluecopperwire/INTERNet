import React, { useEffect, useState } from 'react'
import { ArrowLeft, Building2, GraduationCap, Mail, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import styles from './ProfileEditorPage.module.css'
import { useInternshipPortal } from '../hooks/useInternshipPortal'
import type { UserProfile } from '../types/internship.types'

const INDUSTRIES = [
  'Office Administration',
  'Information Technology',
  'Customer Service / Retail',
  'Hospitality / Tourism',
  'Engineering',
  'Accounting / Finance',
  'Human Resources',
  'Healthcare',
]

const SCHEDULES = ['Weekdays', 'Weekends', 'Flexible']

import { useToastStore } from '../../../stores/useToastStore'

export const ProfileEditorPage: React.FC = () => {
  const navigate = useNavigate()
  const { profile, saveProfile, isLoading } = useInternshipPortal()
  const [formData, setFormData] = useState<Partial<UserProfile>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const toast = useToastStore()

  useEffect(() => {
    if (profile) setFormData(profile)
  }, [profile])

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = event.target
    const parsedValue: string | boolean = type === 'radio' && (value === 'true' || value === 'false')
      ? value === 'true'
      : value

    if (name.includes('.')) {
      const [section, field] = name.split('.') as [keyof UserProfile, string]
      setFormData(previous => ({
        ...previous,
        [section]: {
          ...(previous[section] as object),
          [field]: parsedValue,
        },
      }))
      return
    }

    setFormData(previous => ({ ...previous, [name]: parsedValue }))
  }

  const togglePreference = (field: 'preferredIndustries' | 'schedule', value: string) => {
    setFormData(previous => {
      const currentValues = previous.preferences?.[field] ?? []
      const nextValues = currentValues.includes(value)
        ? currentValues.filter(item => item !== value)
        : [...currentValues, value]

      return {
        ...previous,
        preferences: {
          ...(previous.preferences as UserProfile['preferences']),
          [field]: nextValues,
        },
      }
    })
  }

  const selectSchedule = (value: string) => {
    setFormData(previous => ({
      ...previous,
      preferences: {
        ...(previous.preferences as UserProfile['preferences']),
        schedule: [value],
      },
    }))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsSubmitting(true)
    try {
      const success = await saveProfile(formData)
      if (success) {
        toast.success('Profile updated successfully!')
        navigate('/intern-seeker/profile')
      } else {
        toast.error('Failed to update profile. Please verify your information.')
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save profile.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading || !profile) return <div className={styles.loading}>Loading...</div>

  return (
    <main className={styles.page}>
      <button type="button" className={styles.backButton} onClick={() => navigate('/intern-seeker/profile')}>
        <ArrowLeft size={19} aria-hidden="true" />
        Back to Profile
      </button>

      <form className={styles.formCard} onSubmit={handleSubmit}>
        <header className={styles.formHeader}>
          <h1>Edit Profile</h1>
          <p>Keep your personal, academic, and internship preference details up to date.</p>
        </header>

        <div className={styles.formBody}>
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionIcon}><UserRound size={21} /></span>
              <h2>Personal Information</h2>
            </div>
            <div className={styles.sectionBody}>
              <div className={`${styles.fieldGrid} ${styles.nameGrid}`}>
                <Field label="First Name" required><input required name="firstName" placeholder="Enter first name" value={formData.firstName ?? ''} onChange={handleChange} /></Field>
                <Field label="Middle Name"><input name="middleName" placeholder="Enter middle name" value={formData.middleName ?? ''} onChange={handleChange} /></Field>
                <Field label="Last Name" required><input required name="lastName" placeholder="Enter last name" value={formData.lastName ?? ''} onChange={handleChange} /></Field>
                <Field label="Suffix"><input name="extensionName" placeholder="e.g., Jr." value={formData.extensionName ?? ''} onChange={handleChange} /></Field>
              </div>

              <div className={`${styles.fieldGrid} ${styles.addressGrid}`}>
                <Field label="House / Block No. / Street" required><input required name="address.street" placeholder="Enter house / block no. / street" value={formData.address?.street ?? ''} onChange={handleChange} /></Field>
                <Field label="Barangay" required>
                  <input required name="address.barangay" placeholder="Enter barangay" value={formData.address?.barangay ?? ''} onChange={handleChange} />
                </Field>
                <Field label="District" required>
                  <input required name="address.district" placeholder="If none, type N/A" value={formData.address?.district ?? ''} onChange={handleChange} />
                </Field>
                <Field label="City" required>
                  <input required name="address.city" placeholder="Enter city" value={formData.address?.city ?? ''} onChange={handleChange} />
                </Field>
              </div>

              <div className={`${styles.fieldGrid} ${styles.personalDetailsGrid}`}>
                <Field label="Birthdate" required><input required type="date" name="birthdate" value={formData.birthdate ?? ''} onChange={handleChange} /></Field>
                <fieldset className={styles.choiceField}>
                  <legend>Sex <span>*</span></legend>
                  <div className={styles.radioGroup}>
                    {['Male', 'Female'].map(sex => <label key={sex}><input required type="radio" name="sex" value={sex} checked={formData.sex === sex} onChange={handleChange} />{sex}</label>)}
                  </div>
                </fieldset>
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionIcon}><Mail size={21} /></span>
              <h2>Contact Information</h2>
            </div>
            <div className={styles.sectionBody}>
              <div className={styles.fieldGrid}>
                <Field label="Email" required><input required type="email" name="email" placeholder="Enter email address" value={formData.email ?? ''} onChange={handleChange} /></Field>
                <Field label="Mobile Number" required><input required type="tel" name="contactNumber" placeholder="Enter mobile number" value={formData.contactNumber ?? ''} onChange={handleChange} /></Field>
                <Field label="LinkedIn"><input type="url" name="linkedinUrl" placeholder="Enter LinkedIn profile address" value={formData.linkedinUrl ?? ''} onChange={handleChange} /></Field>
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionIcon}><GraduationCap size={21} /></span>
              <h2>Current Academic Information</h2>
            </div>
            <div className={styles.sectionBody}>
              <div className={`${styles.fieldGrid} ${styles.academicGrid}`}>
                <Field label="School" required><input required name="academic.schoolName" placeholder="Enter school name" value={formData.academic?.schoolName ?? ''} onChange={handleChange} /></Field>
                <Field label="Year Level" required>
                  <select required name="academic.yearLevel" value={formData.academic?.yearLevel ?? ''} onChange={handleChange}>
                    <option value="">Select year level</option><option value="Grade 11">Grade 11</option><option value="Grade 12">Grade 12</option><option value="1st Year">1st Year</option><option value="2nd Year">2nd Year</option><option value="3rd Year">3rd Year</option><option value="4th Year">4th Year</option>
                  </select>
                </Field>
                <Field label="Program" required><input required name="academic.program" placeholder="Enter program" value={formData.academic?.program ?? ''} onChange={handleChange} /></Field>
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionIcon}><Building2 size={21} /></span>
              <h2>Internship Preferences</h2>
            </div>
            <div className={styles.sectionBody}>
              <div className={`${styles.fieldGrid} ${styles.preferenceTopGrid}`}>
                <Field label="Internship Required Hours" required><input required min="1" type="number" name="preferences.requiredHours" placeholder="Enter required hours" value={formData.preferences?.requiredHours ?? ''} onChange={handleChange} /></Field>
                <Field label="Preferred Host Organization Type" required>
                  <select required name="preferences.hostOrgType" value={formData.preferences?.hostOrgType ?? ''} onChange={handleChange}>
                    <option value="">Select organization type</option><option value="Government">Government</option><option value="Private">Private</option>
                  </select>
                </Field>
              </div>

              <div className={`${styles.fieldGrid} ${styles.preferenceTopGrid}`}>
                <fieldset className={styles.choiceField}>
                  <legend>Internship Days Availability <span>*</span></legend>
                  <div className={styles.radioGroup}>
                    {SCHEDULES.map(item => <label key={item}><input type="radio" name="internshipSchedule" checked={formData.preferences?.schedule?.[0] === item} onChange={() => selectSchedule(item)} />{item}</label>)}
                  </div>
                </fieldset>
                <Field label="Internship Start Date Availability" required><input required type="date" name="preferences.startDate" value={formData.preferences?.startDate ?? ''} onChange={handleChange} /></Field>
              </div>

              <fieldset className={styles.choiceField}>
                <legend>Preferred Field of Internship <span>*</span></legend>
                <div className={styles.industriesGrid}>
                  {INDUSTRIES.map(item => <label key={item}><input type="checkbox" checked={formData.preferences?.preferredIndustries?.includes(item) ?? false} onChange={() => togglePreference('preferredIndustries', item)} />{item}</label>)}
                  <div className={styles.otherIndustry}>
                    <label>
                      <input type="checkbox" checked={formData.preferences?.preferredIndustries?.includes('Other') ?? false} onChange={() => togglePreference('preferredIndustries', 'Other')} />
                      Other
                    </label>
                    <input type="text" aria-label="Other preferred internship field" disabled={!(formData.preferences?.preferredIndustries?.includes('Other') ?? false)} name="preferences.otherPreferredField" placeholder="Please specify" value={formData.preferences?.otherPreferredField ?? ''} onChange={handleChange} />
                  </div>
                </div>
              </fieldset>

              <fieldset className={styles.choiceField}>
                <legend>Willing to be assigned outside of preferred field if not available? <span>*</span></legend>
                <div className={styles.radioGroup}>
                  <label><input required type="radio" name="preferences.willingToAssignOutside" value="true" checked={formData.preferences?.willingToAssignOutside === true} onChange={handleChange} />Yes</label>
                  <label><input required type="radio" name="preferences.willingToAssignOutside" value="false" checked={formData.preferences?.willingToAssignOutside === false} onChange={handleChange} />No</label>
                </div>
              </fieldset>
            </div>
          </section>
        </div>

        <footer className={styles.formFooter}>
          <button type="button" className={styles.cancelButton} onClick={() => navigate('/intern-seeker/profile')}>Cancel</button>
          <button type="submit" className={styles.saveButton} disabled={isLoading || isSubmitting}>
            {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
          </button>
        </footer>
      </form>
    </main>
  )
}

const Field: React.FC<{ label: string; required?: boolean; children: React.ReactNode }> = ({ label, required, children }) => (
  <label className={styles.field}>
    <span>{label}{required && <em>*</em>}</span>
    {children}
  </label>
)
