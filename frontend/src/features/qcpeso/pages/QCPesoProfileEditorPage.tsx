import React, { useEffect, useState } from 'react'
import { ArrowLeft, BriefcaseBusiness, Mail, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import styles from '../../intern-seeker/pages/ProfileEditorPage.module.css'
import { qcpesoService } from '../services/qcpeso.service'
import type { QCPesoProfile } from '../types/qcpeso.types'

const buildFullName = (profile: QCPesoProfile) => [profile.firstName, profile.middleName, profile.lastName, profile.suffix].filter(Boolean).join(' ')
const buildLocation = (profile: QCPesoProfile) => [profile.addressLine, profile.barangay, profile.district && `District ${profile.district}`, profile.city].filter(Boolean).join(', ')

export function QCPesoProfileEditorPage() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState<QCPesoProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    qcpesoService.getProfile().then(setFormData).finally(() => setIsLoading(false))
  }, [])

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    const lettersOnly = ['firstName', 'middleName', 'lastName', 'suffix']
    const cleanedValue = lettersOnly.includes(name) ? value.replace(/[^a-zA-Z\s.]/g, '') : value
    setFormData((current) => current ? { ...current, [name]: cleanedValue } as QCPesoProfile : current)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!formData) return
    setIsSaving(true)
    try {
      const updatedProfile = {
        ...formData,
        fullName: buildFullName(formData),
        location: buildLocation(formData),
        role: formData.position,
        qcpesoPosition: formData.position,
      }
      await qcpesoService.updateProfile(updatedProfile)
      navigate('/qcpeso/profile')
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
                <Field label="First Name" required><input required name="firstName" placeholder="Enter first name" value={formData.firstName} onChange={handleChange} /></Field>
                <Field label="Middle Name"><input name="middleName" placeholder="Enter middle name" value={formData.middleName} onChange={handleChange} /></Field>
                <Field label="Last Name" required><input required name="lastName" placeholder="Enter last name" value={formData.lastName} onChange={handleChange} /></Field>
                <Field label="Suffix"><input name="suffix" placeholder="e.g., Jr." value={formData.suffix} onChange={handleChange} /></Field>
              </div>
              <div className={`${styles.fieldGrid} ${styles.addressGrid}`}>
                <Field label="House / Block No. / Street" required><input required name="addressLine" placeholder="Enter house / block / street" value={formData.addressLine} onChange={handleChange} /></Field>
                <Field label="Barangay" required><input required name="barangay" placeholder="Enter barangay" value={formData.barangay} onChange={handleChange} /></Field>
                <Field label="District" required><input required name="district" placeholder="If none, type N/A" value={formData.district} onChange={handleChange} /></Field>
                <Field label="City" required><input required name="city" placeholder="Enter city" value={formData.city} onChange={handleChange} /></Field>
              </div>
              <div className={`${styles.fieldGrid} ${styles.personalDetailsGrid}`}>
                <Field label="Birthdate" required><input required type="date" name="birthdate" value={formData.birthdate} onChange={handleChange} /></Field>
                <fieldset className={styles.choiceField}><legend>Sex<span>*</span></legend><div className={styles.radioGroup}><label><input type="radio" name="sex" value="Male" checked={formData.sex === 'Male'} onChange={handleChange} />Male</label><label><input type="radio" name="sex" value="Female" checked={formData.sex === 'Female'} onChange={handleChange} />Female</label></div></fieldset>
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <header className={styles.sectionHeader}><span className={styles.sectionIcon}><Mail size={21} /></span><h2>Contact Information</h2></header>
            <div className={styles.sectionBody}><div className={styles.fieldGrid}>
              <Field label="Email" required><input required type="email" name="email" placeholder="Enter official email" value={formData.email} onChange={handleChange} /></Field>
              <Field label="Mobile Number" required><input required type="tel" name="mobileNumber" placeholder="Enter mobile number" value={formData.mobileNumber} onChange={handleChange} /></Field>
            </div></div>
          </section>

          <section className={styles.section}>
            <header className={styles.sectionHeader}><span className={styles.sectionIcon}><BriefcaseBusiness size={21} /></span><h2>Work Information</h2></header>
            <div className={styles.sectionBody}><div className={styles.fieldGrid}>
              <Field label="Employee ID" required><input required name="employeeIdNumber" placeholder="Enter employee ID" value={formData.employeeIdNumber} onChange={handleChange} /></Field>
              <Field label="Department" required><input required name="department" placeholder="Enter department" value={formData.department} onChange={handleChange} /></Field>
              <Field label="Position" required><input required name="position" placeholder="Enter position" value={formData.position} onChange={handleChange} /></Field>
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
