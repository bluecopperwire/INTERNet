import { ArrowLeft, Building2, LockKeyhole, UserRound } from 'lucide-react'
import { useEffect, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { qcpesoService } from '../services/qcpeso.service'
import { referenceService } from '../../../services/reference.service'
import { useToastStore } from '../../../stores/useToastStore'
import type { CreateEmployerPayload } from '../types/qcpeso.types'
import styles from '../../intern-seeker/pages/ProfileEditorPage.module.css'

const DEFAULT_INDUSTRIES = [
  'Office Administration',
  'Engineering',
  'Information Technology',
  'Accounting / Finance',
  'Customer Service / Retail',
  'Human Resources',
  'Hospitality / Tourism',
  'Healthcare',
]

const initialForm: CreateEmployerPayload = {
  companyName: '',
  companyType: 'Private',
  industry: 'Information Technology',
  companySize: '',
  yearEstablished: '',
  websiteUrl: '',
  description: '',
  addressLine: '',
  barangay: '',
  district: '',
  city: '',
  contactFirstName: '',
  contactMiddleName: '',
  contactLastName: '',
  contactSuffix: '',
  contactEmail: '',
  contactNumber: '',
  loginEmail: '',
  password: '',
}

export function CreateEmployerPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<CreateEmployerPayload>(initialForm)
  const [industries, setIndustries] = useState<string[]>(DEFAULT_INDUSTRIES)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const toast = useToastStore()

  useEffect(() => {
    referenceService
      .getIndustries()
      .then((items) => {
        const standard = items.filter((i) => !i.isCustomText).map((i) => i.industryName)
        if (standard.length > 0) {
          setIndustries(standard)
          setForm((prev) => ({
            ...prev,
            industry: standard.includes(prev.industry) ? prev.industry : standard[0],
          }))
        }
      })
      .catch(() => {
        // Keep DEFAULT_INDUSTRIES on fallback
      })
  }, [])

  const update = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target
    const numericFields = ['companySize', 'yearEstablished']
    const nameFields = ['contactFirstName', 'contactMiddleName', 'contactLastName', 'contactSuffix']
    const cleaned = numericFields.includes(name)
      ? value.replace(/\D/g, '')
      : nameFields.includes(name)
        ? value.replace(/[^a-zA-Z\s]/g, '')
        : value
    setForm((current) => ({ ...current, [name]: cleaned }))
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    try {
      await qcpesoService.createEmployer(form)
      toast.success(`${form.companyName} account has been successfully created.`)
      navigate('/qcpeso/monitor-users/employers')
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to create employer account. Please verify the input.'
      toast.error(Array.isArray(message) ? message.join(', ') : message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return <main className={styles.page}>
    <button type="button" className={styles.backButton} onClick={() => navigate('/qcpeso/monitor-users/employers')}><ArrowLeft size={19} />Back to Monitor Employers</button>
    <form className={styles.formCard} onSubmit={submit}>
      <header className={styles.formHeader}><h1>Create Employer</h1><p>Add a company profile and its account login credentials.</p></header>
      <div className={styles.formBody}>
        <section className={styles.section}>
          <header className={styles.sectionHeader}><span className={styles.sectionIcon}><Building2 size={21} /></span><h2>Company Information</h2></header>
          <div className={styles.sectionBody}>
            <div className={styles.fieldGrid}>
              <Field label="Company Name" required><input required name="companyName" placeholder="Enter company name" value={form.companyName} onChange={update} /></Field>
              <Field label="Company Type" required><select required name="companyType" value={form.companyType} onChange={update}><option value="Government">Government</option><option value="Private">Private</option></select></Field>
              <Field label="Industry" required><select required name="industry" value={form.industry} onChange={update}>{industries.map((industry) => <option key={industry} value={industry}>{industry}</option>)}</select></Field>
              <Field label="Company Size"><input name="companySize" inputMode="numeric" placeholder="Enter number of employees" value={form.companySize} onChange={update} /></Field>
              <Field label="Company Year Established"><input name="yearEstablished" inputMode="numeric" placeholder="e.g., 2015" value={form.yearEstablished} onChange={update} /></Field>
              <Field label="Website URL"><input name="websiteUrl" type="url" placeholder="https://example.com" value={form.websiteUrl} onChange={update} /></Field>
            </div>
            <div className={`${styles.fieldGrid} ${styles.addressGrid}`}>
              <Field label="Address Line" required><input required name="addressLine" placeholder="Enter house / building / street" value={form.addressLine} onChange={update} /></Field>
              <Field label="Barangay" required><input required name="barangay" placeholder="Enter barangay" value={form.barangay} onChange={update} /></Field>
              <Field label="District"><input name="district" placeholder="If none, type N/A" value={form.district} onChange={update} /></Field>
              <Field label="City" required><input required name="city" placeholder="Enter city" value={form.city} onChange={update} /></Field>
            </div>
            <Field label="About Company" required><textarea required name="description" placeholder="Describe the company" value={form.description} onChange={update} /></Field>
          </div>
        </section>

        <section className={styles.section}>
          <header className={styles.sectionHeader}><span className={styles.sectionIcon}><UserRound size={21} /></span><h2>Contact Information</h2></header>
          <div className={styles.sectionBody}>
            <div className={`${styles.fieldGrid} ${styles.nameGrid}`}>
              <Field label="Contact Person First Name" required><input required name="contactFirstName" placeholder="Enter first name" value={form.contactFirstName} onChange={update} /></Field>
              <Field label="Contact Person Middle Name"><input name="contactMiddleName" placeholder="Enter middle name" value={form.contactMiddleName} onChange={update} /></Field>
              <Field label="Contact Person Last Name" required><input required name="contactLastName" placeholder="Enter last name" value={form.contactLastName} onChange={update} /></Field>
              <Field label="Suffix"><input name="contactSuffix" placeholder="e.g., Jr" value={form.contactSuffix} onChange={update} /></Field>
            </div>
            <div className={styles.fieldGrid}>
              <Field label="Contact Email" required><input required name="contactEmail" type="email" placeholder="Enter company contact email" value={form.contactEmail} onChange={update} /></Field>
              <Field label="Contact Number" required><input required name="contactNumber" type="tel" placeholder="Enter contact number" value={form.contactNumber} onChange={update} /></Field>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <header className={styles.sectionHeader}><span className={styles.sectionIcon}><LockKeyhole size={21} /></span><h2>Login Credentials</h2></header>
          <div className={styles.sectionBody}><div className={styles.fieldGrid}><Field label="Account Email" required><input required name="loginEmail" type="email" placeholder="Enter employer login email" value={form.loginEmail} onChange={update} /></Field><Field label="Temporary Password" required><input required minLength={8} name="password" type="password" placeholder="Enter temporary password" value={form.password} onChange={update} /></Field></div></div>
        </section>
      </div>
      <footer className={styles.formFooter}><button className={styles.cancelButton} type="button" onClick={() => navigate('/qcpeso/monitor-users/employers')}>Cancel</button><button className={styles.saveButton} type="submit" disabled={isSubmitting}>{isSubmitting ? 'Submitting...' : 'Submit'}</button></footer>
    </form>
  </main>
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return <label className={styles.field}><span>{label}{required && <em>*</em>}</span>{children}</label>
}
