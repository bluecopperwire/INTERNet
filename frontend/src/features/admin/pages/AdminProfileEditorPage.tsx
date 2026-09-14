import { useEffect, useState } from 'react'
import { ArrowLeft, Mail, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { DistrictSelect } from '../../../components/DistrictSelect'
import { birthdateMaximum } from '../../../utils/date-only'
import { getErrorMessage } from '../../../utils/error-message'
import {
  CONTACT_NUMBER_PLACEHOLDER,
  getContactNumberError,
  sanitizeContactNumberInput,
} from '../../../utils/input-validation'
import { useToastStore } from '../../../stores/useToastStore'
import { adminProfileService } from '../services/admin-profile.service'
import type { AdminProfile } from '../types/admin-profile.types'
import styles from '../../intern-seeker/pages/ProfileEditorPage.module.css'

export function AdminProfileEditorPage() {
  const navigate = useNavigate()
  const showError = useToastStore((state) => state.error)
  const showSuccess = useToastStore((state) => state.success)
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    adminProfileService
      .getProfile()
      .then(setProfile)
      .catch((error: unknown) =>
        showError(getErrorMessage(error, 'Failed to load Admin profile.')),
      )
      .finally(() => setIsLoading(false))
  }, [showError])

  const change = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target
    const cleaned = ['firstName', 'middleName', 'lastName', 'extensionName'].includes(name)
      ? value.replace(/[^a-zA-Z\s.]/g, '')
      : value
    setProfile((current) => current ? { ...current, [name]: cleaned } : current)
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!profile) return
    const contactError = getContactNumberError(profile.contactNumber)
    if (contactError) {
      showError(contactError)
      return
    }
    setIsSaving(true)
    try {
      await adminProfileService.updateProfile(profile)
      showSuccess('Admin profile updated successfully.')
      navigate('/admin/profile')
    } catch (error: unknown) {
      showError(getErrorMessage(error, 'Failed to update Admin profile.'))
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading || !profile) return <div className={styles.loading}>Loading Admin profile...</div>

  return (
    <main className={styles.page}>
      <button type="button" className={styles.backButton} onClick={() => navigate('/admin/profile')}><ArrowLeft size={19} />Back to Profile</button>
      <form className={styles.formCard} onSubmit={submit}>
        <header className={styles.formHeader}><h1>Edit Admin Profile</h1><p>Keep your personal and contact information up to date.</p></header>
        <div className={styles.formBody}>
          <section className={styles.section}>
            <header className={styles.sectionHeader}><span className={styles.sectionIcon}><UserRound size={21} /></span><h2>Personal Information</h2></header>
            <div className={styles.sectionBody}>
              <div className={`${styles.fieldGrid} ${styles.nameGrid}`}>
                <Field label="First Name" required><input required name="firstName" placeholder="e.g., Juan" value={profile.firstName} onChange={change} /></Field>
                <Field label="Middle Name"><input name="middleName" placeholder="e.g., Santos" value={profile.middleName} onChange={change} /></Field>
                <Field label="Last Name" required><input required name="lastName" placeholder="e.g., Dela Cruz" value={profile.lastName} onChange={change} /></Field>
                <Field label="Suffix"><input name="extensionName" placeholder="e.g., Jr." value={profile.extensionName} onChange={change} /></Field>
              </div>
              <div className={`${styles.fieldGrid} ${styles.addressGrid}`}>
                <Field label="House / Block No. / Street" required><input required name="addressLine" placeholder="e.g., 200 Development Avenue" value={profile.addressLine} onChange={change} /></Field>
                <Field label="Barangay" required><input required name="addressBarangay" placeholder="e.g., Central" value={profile.addressBarangay} onChange={change} /></Field>
                <Field label="District" required><DistrictSelect name="addressDistrict" value={profile.addressDistrict} onChange={change} /></Field>
                <Field label="City" required><input required name="addressCity" placeholder="e.g., Quezon City" value={profile.addressCity} onChange={change} /></Field>
              </div>
              <div className={`${styles.fieldGrid} ${styles.personalDetailsGrid}`}>
                <Field label="Birthdate" required><input required type="date" name="birthDate" max={birthdateMaximum()} title="Birthdate must be before today." value={profile.birthDate} onChange={change} /></Field>
                <fieldset className={styles.choiceField}><legend>Sex<span>*</span></legend><div className={styles.radioGroup}><label><input required type="radio" name="sex" value="Male" checked={profile.sex === 'Male'} onChange={change} />Male</label><label><input type="radio" name="sex" value="Female" checked={profile.sex === 'Female'} onChange={change} />Female</label></div></fieldset>
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <header className={styles.sectionHeader}><span className={styles.sectionIcon}><Mail size={21} /></span><h2>Contact Information</h2></header>
            <div className={styles.sectionBody}><div className={styles.fieldGrid}>
              <Field label="Email Address" required><input required type="email" name="contactEmail" placeholder="e.g., admin@quezoncity.gov.ph" value={profile.contactEmail} onChange={change} /></Field>
              <Field label="Contact Number" required><input required type="tel" name="contactNumber" placeholder={CONTACT_NUMBER_PLACEHOLDER} value={profile.contactNumber} onChange={(event) => setProfile((current) => current ? { ...current, contactNumber: sanitizeContactNumberInput(event.target.value) } : current)} /></Field>
            </div></div>
          </section>
        </div>
        <footer className={styles.formFooter}><button type="button" className={styles.cancelButton} onClick={() => navigate('/admin/profile')}>Cancel</button><button type="submit" className={styles.saveButton} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Changes'}</button></footer>
      </form>
    </main>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <label className={styles.field}><span>{label}{required && <em>*</em>}</span>{children}</label>
}
