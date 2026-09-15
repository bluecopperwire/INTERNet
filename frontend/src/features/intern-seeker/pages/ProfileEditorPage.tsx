import React, { useEffect, useState } from 'react'
import { ArrowLeft, Building2, GraduationCap, Mail, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import styles from './ProfileEditorPage.module.css'
import { useInternshipPortal } from '../hooks/useInternshipPortal'
import type { UserProfile } from '../types/internship.types'
import { birthdateMaximum, todayDateOnly } from '../../../utils/date-only'
import { AVAILABILITY_DAYS } from '../../../utils/availability-days'
import { CONTACT_NUMBER_PLACEHOLDER, getContactNumberError, sanitizeContactNumberInput } from '../../../utils/input-validation'
import { DistrictSelect } from '../../../components/DistrictSelect'

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

  const togglePreference = (value: string) => {
    setFormData(previous => {
      const currentValues = previous.preferences?.preferredIndustries ?? []
      const nextValues = currentValues.includes(value)
        ? currentValues.filter(item => item !== value)
        : [...currentValues, value]

      return {
        ...previous,
        preferences: {
          ...(previous.preferences as UserProfile['preferences']),
          preferredIndustries: nextValues,
          ...(value === 'Other' && currentValues.includes(value)
            ? { otherPreferredField: '' }
            : {}),
        },
      }
    })
  }

  const toggleSchedule = (day: number) => {
    setFormData(previous => ({
      ...previous,
      preferences: {
        ...(previous.preferences as UserProfile['preferences']),
        schedule: previous.preferences?.schedule.includes(day)
          ? previous.preferences.schedule.filter((item) => item !== day)
          : [...(previous.preferences?.schedule ?? []), day].sort((a, b) => a - b),
      },
    }))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const contactNumberError = getContactNumberError(formData.contactNumber ?? '')
    if (contactNumberError) {
      toast.error(contactNumberError)
      return
    }
    if (!formData.preferences?.schedule.length) {
      toast.error('Select at least one internship availability day.')
      return
    }
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
                <Field label="First Name" required><input required name="firstName" placeholder="e.g., Juan" value={formData.firstName ?? ''} onChange={handleChange} /></Field>
                <Field label="Middle Name"><input name="middleName" placeholder="e.g., Santos" value={formData.middleName ?? ''} onChange={handleChange} /></Field>
                <Field label="Last Name" required><input required name="lastName" placeholder="e.g., Dela Cruz" value={formData.lastName ?? ''} onChange={handleChange} /></Field>
                <Field label="Suffix"><input name="extensionName" placeholder="e.g., Jr." value={formData.extensionName ?? ''} onChange={handleChange} /></Field>
              </div>

              <div className={`${styles.fieldGrid} ${styles.addressGrid}`}>
                <Field label="House / Block No. / Street" required><input required name="address.street" placeholder="e.g., 200 Development Avenue" value={formData.address?.street ?? ''} onChange={handleChange} /></Field>
                <Field label="Barangay" required>
                  <input required name="address.barangay" placeholder="e.g., Central" value={formData.address?.barangay ?? ''} onChange={handleChange} />
                </Field>
                <Field label="District" required>
                  <DistrictSelect name="address.district" value={formData.address?.district} onChange={handleChange} />
                </Field>
                <Field label="City" required>
                  <input required name="address.city" placeholder="e.g., Quezon City" value={formData.address?.city ?? ''} onChange={handleChange} />
                </Field>
              </div>

              <div className={`${styles.fieldGrid} ${styles.personalDetailsGrid}`}>
                <Field label="Birthdate" required><input required type="date" name="birthdate" max={birthdateMaximum()} title="Birthdate must be before today." value={formData.birthdate ?? ''} onChange={handleChange} /></Field>
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
                <Field label="Email" required><input required type="email" name="email" placeholder="e.g., juan.delacruz@example.com" value={formData.email ?? ''} onChange={handleChange} /></Field>
                <Field label="Contact Number" required><input required type="tel" name="contactNumber" placeholder={CONTACT_NUMBER_PLACEHOLDER} value={formData.contactNumber ?? ''} onChange={(event) => setFormData((current) => ({ ...current, contactNumber: sanitizeContactNumberInput(event.target.value) }))} /></Field>
                <Field label="LinkedIn"><input type="url" name="linkedinUrl" placeholder="e.g., https://linkedin.com/in/juan-dela-cruz" value={formData.linkedinUrl ?? ''} onChange={handleChange} /></Field>
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
                <Field label="School" required><input required name="academic.schoolName" placeholder="e.g., Quezon City University" value={formData.academic?.schoolName ?? ''} onChange={handleChange} /></Field>
                <Field label="Year Level" required>
                  <select required name="academic.yearLevel" value={formData.academic?.yearLevel ?? ''} onChange={handleChange}>
                    <option value="">Select year level</option><option value="Grade 11">Grade 11</option><option value="Grade 12">Grade 12</option><option value="First Year College">First Year College</option><option value="Second Year College">Second Year College</option><option value="Third Year College">Third Year College</option><option value="Fourth Year College">Fourth Year College</option>
                  </select>
                </Field>
                <Field label="Program / Strand" required><input required name="academic.program" placeholder="e.g., BS Information Technology" value={formData.academic?.program ?? ''} onChange={handleChange} /></Field>
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
                <Field label="Internship Required Hours" required><input required min="1" type="number" name="preferences.requiredHours" placeholder="e.g., 500" value={formData.preferences?.requiredHours ?? ''} onChange={handleChange} /></Field>
                <Field label="Preferred Host Organization Type" required>
                  <select required name="preferences.hostOrgType" value={formData.preferences?.hostOrgType ?? ''} onChange={handleChange}>
                    <option value="">Select Organization Type</option><option value="Government">Government</option><option value="Private">Private</option>
                  </select>
                </Field>
              </div>

              <div className={`${styles.fieldGrid} ${styles.preferenceTopGrid}`}>
                <fieldset className={styles.choiceField}>
                  <legend>Internship Days Availability <span>*</span></legend>
                  <div className={styles.dayOptions}>
                    {AVAILABILITY_DAYS.map((day, index) => <label key={day}><input type="checkbox" aria-label={day} checked={formData.preferences?.schedule.includes(index) ?? false} onChange={() => toggleSchedule(index)} />{day.slice(0, 3)}</label>)}
                  </div>
                </fieldset>
                <Field label="Internship Start Date Availability" required><input required type="date" name="preferences.startDate" min={todayDateOnly()} title="The preferred internship start date cannot be in the past." value={formData.preferences?.startDate ?? ''} onChange={handleChange} /></Field>
              </div>

              <fieldset className={styles.choiceField}>
                <legend>Preferred Field of Internship <span>*</span></legend>
                <div className={styles.industriesGrid}>
                  {INDUSTRIES.map(item => <label key={item}><input type="checkbox" checked={formData.preferences?.preferredIndustries?.includes(item) ?? false} onChange={() => togglePreference(item)} />{item}</label>)}
                  <div className={styles.otherIndustry}>
                    <label>
                      <input type="checkbox" checked={formData.preferences?.preferredIndustries?.includes('Other') ?? false} onChange={() => togglePreference('Other')} />
                      Other
                    </label>
                    <input type="text" aria-label="Other preferred internship field" required={formData.preferences?.preferredIndustries?.includes('Other') ?? false} disabled={!(formData.preferences?.preferredIndustries?.includes('Other') ?? false)} name="preferences.otherPreferredField" placeholder="Please Specify" value={formData.preferences?.otherPreferredField ?? ''} onChange={handleChange} />
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
