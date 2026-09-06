import { useEffect, useState } from 'react'
import { ArrowLeft, Building2, GraduationCap, Mail, UserRound } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { adminService } from '../services/admin.service'
import type { StudentRecord } from '../types/admin.types'
import styles from '../../intern-seeker/pages/ProfileEditorPage.module.css'
import { useToastStore } from '../../../stores/useToastStore'
import { getErrorMessage } from '../../../utils/error-message'
import { birthdateMaximum, todayDateOnly } from '../../../utils/date-only'
import { AVAILABILITY_DAYS } from '../../../utils/availability-days'
import { getContactNumberError, sanitizeContactNumberInput } from '../../../utils/input-validation'

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

export function AdminStudentProfileEditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [student, setStudent] = useState<StudentRecord | null>(null)
  const [formData, setFormData] = useState<StudentRecord | null>(null)
  const toast = useToastStore()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [preferenceError, setPreferenceError] = useState('')

  useEffect(() => {
    if (!id) return
    adminService.getStudentRecord(id).then((record) => {
      setStudent(record)
      setFormData(record ? prepareFormData(record) : null)
    }).finally(() => setIsLoading(false))
  }, [id])

  const updateField = <K extends keyof StudentRecord>(key: K, value: StudentRecord[K]) => {
    setFormData((current) => current ? { ...current, [key]: value } : current)
  }

  const toggleIndustry = (industry: string) => {
    setFormData((current) => {
      if (!current) return current
      const preferredIndustries = current.preferredIndustries.includes(industry)
        ? current.preferredIndustries.filter((item) => item !== industry)
        : [...current.preferredIndustries, industry]
      return { ...current, preferredIndustries }
    })
    setPreferenceError('')
  }

  const toggleAvailabilityDay = (day: number) => {
    setFormData((current) => {
      if (!current) return current
      const scheduleAvailability = current.scheduleAvailability.includes(day)
        ? current.scheduleAvailability.filter((item) => item !== day)
        : [...current.scheduleAvailability, day].sort((a, b) => a - b)
      return { ...current, scheduleAvailability }
    })
    setPreferenceError('')
  }

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!id || !formData) return

    const contactNumberError = getContactNumberError(formData.contactNumber)
    if (contactNumberError) {
      toast.error(contactNumberError)
      return
    }

    const hasOtherField = formData.preferredIndustries.includes('Other')
    if (!formData.scheduleAvailability.length || !formData.preferredIndustries.length) {
      setPreferenceError('Select internship availability and at least one preferred field.')
      return
    }

    if (hasOtherField && !formData.otherPreferredField?.trim()) {
      setPreferenceError('Specify the other preferred field of internship.')
      return
    }

    const fullName = [formData.firstName, formData.middleName, formData.lastName, formData.suffix].filter(Boolean).join(' ')
    const fullAddress = [
      formData.addressStreet,
      formData.addressBarangay && `Brgy. ${formData.addressBarangay}`,
      formData.addressDistrict && `District ${formData.addressDistrict}`,
      formData.addressCity,
    ].filter(Boolean).join(', ')

    setIsSaving(true)
    try {
      const updated = await adminService.updateStudentRecord(id, { ...formData, fullName, fullAddress })
      if (updated) {
        toast.success('Student profile updated successfully.')
        navigate(`/admin/manage-students/${updated.id}`)
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to update student profile.'))
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) return <main className={styles.loading}>Loading student profile...</main>
  if (student?.status === 'Deactivated') return <main className={styles.loading}>Profile editing is unavailable for deactivated accounts.</main>
  if (!student || !formData) return <main className={styles.loading}>Student record not found.</main>

  return (
    <main className={styles.page}>
      <button type="button" className={styles.backButton} onClick={() => navigate(`/admin/manage-students/${student.id}`)}>
        <ArrowLeft size={19} aria-hidden="true" />
        Back to Student Profile
      </button>

      <form className={styles.formCard} onSubmit={save} noValidate={false}>
        <header className={styles.formHeader}>
          <h1>Edit Student Profile</h1>
          <p>Update the student’s personal, academic, and internship preference details.</p>
        </header>

        <div className={styles.formBody}>
          <section className={styles.section}>
            <div className={styles.sectionHeader}><span className={styles.sectionIcon}><UserRound size={21} /></span><h2>Personal Information</h2></div>
            <div className={styles.sectionBody}>
              <div className={`${styles.fieldGrid} ${styles.nameGrid}`}>
                <Field label="First Name" required><input required value={formData.firstName ?? ''} placeholder="Enter first name" onChange={(event) => updateField('firstName', event.target.value.replace(/[^a-zA-ZÀ-ÿ .'-]/g, ''))} /></Field>
                <Field label="Middle Name"><input value={formData.middleName ?? ''} placeholder="Enter middle name" onChange={(event) => updateField('middleName', event.target.value.replace(/[^a-zA-ZÀ-ÿ .'-]/g, ''))} /></Field>
                <Field label="Last Name" required><input required value={formData.lastName ?? ''} placeholder="Enter last name" onChange={(event) => updateField('lastName', event.target.value.replace(/[^a-zA-ZÀ-ÿ .'-]/g, ''))} /></Field>
                <Field label="Suffix"><input value={formData.suffix ?? ''} placeholder="e.g., Jr." onChange={(event) => updateField('suffix', event.target.value.replace(/[^a-zA-ZÀ-ÿ .'-]/g, ''))} /></Field>
              </div>
              <div className={`${styles.fieldGrid} ${styles.addressGrid}`}>
                <Field label="House / Block No. / Street" required><input required value={formData.addressStreet ?? ''} placeholder="Enter house / block no. / street" onChange={(event) => updateField('addressStreet', event.target.value)} /></Field>
                <Field label="Barangay" required><input required value={formData.addressBarangay ?? ''} placeholder="Enter barangay" onChange={(event) => updateField('addressBarangay', event.target.value)} /></Field>
                <Field label="District" required><input required value={formData.addressDistrict ?? ''} placeholder="If none, type N/A" onChange={(event) => updateField('addressDistrict', event.target.value)} /></Field>
                <Field label="City" required><input required value={formData.addressCity ?? ''} placeholder="Enter city" onChange={(event) => updateField('addressCity', event.target.value)} /></Field>
              </div>
              <div className={`${styles.fieldGrid} ${styles.personalDetailsGrid}`}>
              <Field label="Birthdate" required><input required type="date" max={birthdateMaximum()} title="Birthdate must be before today." value={formData.birthdate} onChange={(event) => updateField('birthdate', event.target.value)} /></Field>
                <fieldset className={styles.choiceField}>
                  <legend>Sex <span>*</span></legend>
                  <div className={styles.radioGroup}>{(['Male', 'Female', 'Other'] as const).map((sex) => <label key={sex}><input required type="radio" name="sex" checked={formData.sex === sex} onChange={() => updateField('sex', sex)} />{sex}</label>)}</div>
                </fieldset>
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}><span className={styles.sectionIcon}><Mail size={21} /></span><h2>Contact Information</h2></div>
            <div className={styles.sectionBody}><div className={styles.fieldGrid}>
              <Field label="Email" required><input required type="email" value={formData.email} placeholder="Enter email address" onChange={(event) => updateField('email', event.target.value)} /></Field>
              <Field label="Mobile Number" required><input required type="tel" value={formData.contactNumber} placeholder="e.g. 09123456789" onChange={(event) => updateField('contactNumber', sanitizeContactNumberInput(event.target.value))} /></Field>
              <Field label="LinkedIn"><input type="url" value={formData.linkedinUrl ?? ''} placeholder="Enter LinkedIn profile address" onChange={(event) => updateField('linkedinUrl', event.target.value)} /></Field>
            </div></div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}><span className={styles.sectionIcon}><GraduationCap size={21} /></span><h2>Current Academic Information</h2></div>
            <div className={styles.sectionBody}><div className={`${styles.fieldGrid} ${styles.academicGrid}`}>
              <Field label="School" required><input required value={formData.schoolName} placeholder="Enter school name" onChange={(event) => updateField('schoolName', event.target.value)} /></Field>
              <Field label="Year Level" required><select required value={formData.yearLevel} onChange={(event) => updateField('yearLevel', event.target.value)}><option value="">Select year level</option><option value="Grade 11">Grade 11</option><option value="Grade 12">Grade 12</option><option value="First Year College">First Year College</option><option value="Second Year College">Second Year College</option><option value="Third Year College">Third Year College</option><option value="Fourth Year College">Fourth Year College</option></select></Field>
              <Field label="Program" required><input required value={formData.programStrand} placeholder="Enter program or strand" onChange={(event) => updateField('programStrand', event.target.value)} /></Field>
            </div></div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}><span className={styles.sectionIcon}><Building2 size={21} /></span><h2>Internship Preferences</h2></div>
            <div className={styles.sectionBody}>
              <div className={`${styles.fieldGrid} ${styles.preferenceTopGrid}`}>
                <Field label="Internship Required Hours" required><input required min="1" type="number" inputMode="numeric" value={formData.requiredHours} placeholder="Enter required hours" onChange={(event) => updateField('requiredHours', event.target.value.replace(/\D/g, ''))} /></Field>
                <Field label="Preferred Host Organization Type" required><select required value={formData.hostOrgType} onChange={(event) => updateField('hostOrgType', event.target.value)}><option value="">Select organization type</option><option value="Government">Government</option><option value="Private">Private</option></select></Field>
              </div>
              <div className={`${styles.fieldGrid} ${styles.preferenceTopGrid}`}>
                <fieldset className={styles.choiceField}><legend>Internship Days Availability <span>*</span></legend><div className={styles.dayOptions}>{AVAILABILITY_DAYS.map((day, index) => <label key={day}><input type="checkbox" aria-label={day} checked={formData.scheduleAvailability.includes(index)} onChange={() => toggleAvailabilityDay(index)} />{day.slice(0, 3)}</label>)}</div></fieldset>
                <Field label="Internship Start Date Availability" required><input required type="date" min={todayDateOnly()} title="The preferred internship start date cannot be in the past." value={formData.startDate} onChange={(event) => updateField('startDate', event.target.value)} /></Field>
              </div>
              <fieldset className={styles.choiceField}><legend>Preferred Field of Internship <span>*</span></legend><div className={styles.industriesGrid}>{INDUSTRIES.map((industry) => <label key={industry}><input type="checkbox" checked={formData.preferredIndustries.includes(industry)} onChange={() => toggleIndustry(industry)} />{industry}</label>)}<div className={styles.otherIndustry}><label><input type="checkbox" checked={formData.preferredIndustries.includes('Other')} onChange={() => toggleIndustry('Other')} />Other</label><input type="text" aria-label="Other preferred internship field" disabled={!formData.preferredIndustries.includes('Other')} value={formData.otherPreferredField ?? ''} placeholder="Please specify" onChange={(event) => { updateField('otherPreferredField', event.target.value); setPreferenceError('') }} /></div></div></fieldset>
              <fieldset className={styles.choiceField}><legend>Willing to be assigned outside of preferred field if not available? <span>*</span></legend><div className={styles.radioGroup}><label><input required type="radio" name="flexibleAssignment" checked={formData.flexibleAssignment} onChange={() => updateField('flexibleAssignment', true)} />Yes</label><label><input required type="radio" name="flexibleAssignment" checked={!formData.flexibleAssignment} onChange={() => updateField('flexibleAssignment', false)} />No</label></div></fieldset>
              {preferenceError && <p role="alert" className={styles.preferenceError}>{preferenceError}</p>}
            </div>
          </section>
        </div>
        <footer className={styles.formFooter}><button type="button" className={styles.cancelButton} onClick={() => navigate(`/admin/manage-students/${student.id}`)}>Cancel</button><button type="submit" className={styles.saveButton} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Changes'}</button></footer>
      </form>
    </main>
  )
}

function Field({ children, label, required }: { children: React.ReactNode; label: string; required?: boolean }) {
  return <label className={styles.field}><span>{label}{required && <em>*</em>}</span>{children}</label>
}

function prepareFormData(record: StudentRecord): StudentRecord {
  const storedName = [record.firstName, record.middleName, record.lastName, record.suffix].filter(Boolean).join(' ')
  if (storedName === record.fullName) return record

  const [firstName = '', ...remainingParts] = record.fullName.trim().split(/\s+/)
  return { ...record, firstName, middleName: '', lastName: remainingParts.join(' '), suffix: '' }
}
