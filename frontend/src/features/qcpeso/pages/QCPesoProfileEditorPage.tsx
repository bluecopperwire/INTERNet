import React, { useEffect, useState } from 'react'
import { ArrowLeft, BriefcaseBusiness, Mail, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import styles from '../../intern-seeker/pages/ProfileEditorPage.module.css'
import { qcpesoService } from '../services/qcpeso.service'
import type { QCPesoProfile } from '../types/qcpeso.types'
import { useToastStore } from '../../../stores/useToastStore'
import { getErrorMessage } from '../../../utils/error-message'
import { birthdateMaximum } from '../../../utils/date-only'
import { CONTACT_NUMBER_PLACEHOLDER, getContactNumberError, sanitizeContactNumberInput } from '../../../utils/input-validation'
import { DistrictSelect } from '../../../components/DistrictSelect'

export function QCPesoProfileEditorPage() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState<QCPesoProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const toast = useToastStore()

  useEffect(() => {
    qcpesoService.getProfile().then(setFormData).finally(() => setIsLoading(false))
  }, [])

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target
    const lettersOnly = ['firstName', 'middleName', 'lastName', 'suffix']
    const cleanedValue = lettersOnly.includes(name) ? value.replace(/[^a-zA-Z\s.]/g, '') : value
    setFormData((current) => current ? { ...current, [name]: cleanedValue } as QCPesoProfile : current)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!formData) return
    const contactNumberError = getContactNumberError(formData.mobileNumber)
    if (contactNumberError) {
      toast.error(contactNumberError)
      return
    }
    setIsSaving(true)
    try {
      await qcpesoService.updateProfile(formData)
      toast.success('QC PESO profile updated successfully.')
      navigate('/qcpeso/profile')
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to update QC PESO profile.'))
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading || !formData) return <div className={styles.loading}>Loading QC PESO profile...</div>

  return (
    <main className={styles.page}>
      <button type="button" className={styles.backButton} onClick={() => navigate('/qcpeso/profile')}><ArrowLeft size={19} />Back to Profile</button>

      <form className={styles.formCard} onSubmit={handleSubmit}>
        <header className={styles.formHeader}>
          <h1>Edit QC PESO Profile</h1>
          <p>Keep your personal, contact, and work information up to date.</p>
        </header>

        <div className={styles.formBody}>
          <section className={styles.section}>
            <header className={styles.sectionHeader}><span className={styles.sectionIcon}><UserRound size={21} /></span><h2>Personal Information</h2></header>
            <div className={styles.sectionBody}>
              <div className={`${styles.fieldGrid} ${styles.nameGrid}`}>
                <Field label="First Name" required><input required name="firstName" placeholder="e.g., Juan" value={formData.firstName} onChange={handleChange} /></Field>
                <Field label="Middle Name"><input name="middleName" placeholder="e.g., Santos" value={formData.middleName} onChange={handleChange} /></Field>
                <Field label="Last Name" required><input required name="lastName" placeholder="e.g., Dela Cruz" value={formData.lastName} onChange={handleChange} /></Field>
                <Field label="Suffix"><input name="suffix" placeholder="e.g., Jr." value={formData.suffix} onChange={handleChange} /></Field>
              </div>
              <div className={`${styles.fieldGrid} ${styles.addressGrid}`}>
                <Field label="House / Block No. / Street" required><input required name="addressLine" placeholder="e.g., 200 Development Avenue" value={formData.addressLine} onChange={handleChange} /></Field>
                <Field label="Barangay" required><input required name="barangay" placeholder="e.g., Central" value={formData.barangay} onChange={handleChange} /></Field>
                <Field label="District" required><DistrictSelect name="district" value={formData.district} onChange={handleChange} /></Field>
                <Field label="City" required><input required name="city" placeholder="e.g., Quezon City" value={formData.city} onChange={handleChange} /></Field>
              </div>
              <div className={`${styles.fieldGrid} ${styles.personalDetailsGrid}`}>
                <Field label="Birthdate" required><input required type="date" name="birthdate" max={birthdateMaximum()} title="Birthdate must be before today." value={formData.birthdate} onChange={handleChange} /></Field>
                <fieldset className={styles.choiceField}><legend>Sex<span>*</span></legend><div className={styles.radioGroup}><label><input type="radio" name="sex" value="Male" checked={formData.sex === 'Male'} onChange={handleChange} />Male</label><label><input type="radio" name="sex" value="Female" checked={formData.sex === 'Female'} onChange={handleChange} />Female</label></div></fieldset>
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <header className={styles.sectionHeader}><span className={styles.sectionIcon}><Mail size={21} /></span><h2>Contact Information</h2></header>
            <div className={styles.sectionBody}><div className={styles.fieldGrid}>
              <Field label="Email" required><input required type="email" name="email" placeholder="e.g., juan.delacruz@quezoncity.gov.ph" value={formData.email} onChange={handleChange} /></Field>
              <Field label="Contact Number" required><input required type="tel" name="mobileNumber" placeholder={CONTACT_NUMBER_PLACEHOLDER} value={formData.mobileNumber} onChange={(event) => setFormData((current) => current ? { ...current, mobileNumber: sanitizeContactNumberInput(event.target.value) } : current)} /></Field>
            </div></div>
          </section>

          <section className={styles.section}>
            <header className={styles.sectionHeader}><span className={styles.sectionIcon}><BriefcaseBusiness size={21} /></span><h2>Work Information</h2></header>
            <div className={styles.sectionBody}><div className={styles.fieldGrid}>
              <Field label="Employee ID" required><input required name="employeeIdNumber" placeholder="e.g., PESO-001" value={formData.employeeIdNumber} onChange={handleChange} /></Field>
              <Field label="Department" required><input required name="department" placeholder="e.g., Employment Services Division" value={formData.department} onChange={handleChange} /></Field>
              <Field label="Position" required><input required name="position" placeholder="e.g., Employment Officer" value={formData.position} onChange={handleChange} /></Field>
            </div></div>
          </section>
        </div>

        <footer className={styles.formFooter}><button type="button" className={styles.cancelButton} onClick={() => navigate('/qcpeso/profile')}>Cancel</button><button type="submit" className={styles.saveButton} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Changes'}</button></footer>
      </form>
    </main>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <label className={styles.field}><span>{label}{required && <em>*</em>}</span>{children}</label>
}
