import React, { useEffect, useState } from 'react'
import { ArrowLeft, Building2, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { employerService } from '../services/employer.service'
import type { CompanyProfile } from '../types/employer.types'
import styles from '../../intern-seeker/pages/ProfileEditorPage.module.css'
import { useToastStore } from '../../../stores/useToastStore'
import { getErrorMessage } from '../../../utils/error-message'

const INDUSTRIES = [
  'Office Administration',
  'Engineering',
  'Information Technology',
  'Accounting / Finance',
  'Customer Service / Retail',
  'Human Resources',
  'Hospitality / Tourism',
  'Healthcare',
]

export function CompanyProfileEditorPage() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<CompanyProfile | null>(null)
  const [formData, setFormData] = useState<CompanyProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const toast = useToastStore()

  useEffect(() => {
    employerService.getCompanyProfile()
      .then((data) => {
        setProfile(data)
        setFormData(data)
      })
      .finally(() => setIsLoading(false))
  }, [])

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target
    const numericFields = ['company_size', 'year_established']
    const nameFields = [
      'contact_person_first_name',
      'contact_person_middle_name',
      'contact_person_last_name',
      'contact_person_extension_name',
    ]
    const sanitizedValue = numericFields.includes(name)
      ? value.replace(/\D/g, '')
      : nameFields.includes(name)
        ? value.replace(/[^a-zA-Z\s]/g, '')
        : value

    setFormData((current) => current ? { ...current, [name]: sanitizedValue } as CompanyProfile : current)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!formData) return
    setIsSaving(true)
    try {
      await employerService.updateCompanyProfile(formData)
      toast.success('Company profile updated successfully.')
      navigate('/employer/profile')
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to update company profile.'))
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading || !profile || !formData) return <div className={styles.loading}>Loading company profile...</div>

  return (
    <main className={styles.page}>
      <button type="button" className={styles.backButton} onClick={() => navigate('/employer/profile')}>
        <ArrowLeft size={19} aria-hidden="true" />
        Back to Profile
      </button>

      <form className={styles.formCard} onSubmit={handleSubmit}>
        <header className={styles.formHeader}>
          <h1>Edit Company Profile</h1>
          <p>Keep your company, address, and contact details up to date.</p>
        </header>

        <div className={styles.formBody}>
          <section className={styles.section}>
            <header className={styles.sectionHeader}><span className={styles.sectionIcon}><Building2 size={21} /></span><h2>Company Information</h2></header>
            <div className={styles.sectionBody}>
              <div className={styles.fieldGrid}>
                <Field label="Company Name" required><input required name="company_name" placeholder="Enter company name" value={formData.company_name} onChange={handleChange} /></Field>
                <Field label="Company Type" required><select required name="company_type" value={formData.company_type} onChange={handleChange}><option value="Government">Government</option><option value="Private">Private</option></select></Field>
                <Field label="Industry" required><select required name="industry" value={formData.industry} onChange={handleChange}>{INDUSTRIES.map((industry) => <option key={industry} value={industry}>{industry}</option>)}</select></Field>
                <Field label="Company Size"><input name="company_size" inputMode="numeric" pattern="[0-9]*" placeholder="Enter number of employees" value={formData.company_size ?? ''} onChange={handleChange} /></Field>
                <Field label="Company Year Established"><input name="year_established" inputMode="numeric" pattern="[0-9]*" placeholder="e.g., 2015" value={formData.year_established ?? ''} onChange={handleChange} /></Field>
                <Field label="Website URL"><input name="website_url" type="url" placeholder="https://example.com" value={formData.website_url ?? ''} onChange={handleChange} /></Field>
              </div>
              <div className={`${styles.fieldGrid} ${styles.addressGrid}`}>
                <Field label="Address Line" required><input required name="address_line" placeholder="Enter house / building / street" value={formData.address_line} onChange={handleChange} /></Field>
                <Field label="Barangay" required><input required name="address_barangay" placeholder="Enter barangay" value={formData.address_barangay} onChange={handleChange} /></Field>
                <Field label="District"><input name="address_district" placeholder="If none, type N/A" value={formData.address_district ?? ''} onChange={handleChange} /></Field>
                <Field label="City" required><input required name="address_city" placeholder="Enter city" value={formData.address_city} onChange={handleChange} /></Field>
              </div>
              <Field label="About Company" required><textarea required name="description" placeholder="Describe your company" value={formData.description} onChange={handleChange} /></Field>
            </div>
          </section>

          <section className={styles.section}>
            <header className={styles.sectionHeader}><span className={styles.sectionIcon}><UserRound size={21} /></span><h2>Contact Information</h2></header>
            <div className={styles.sectionBody}>
              <div className={`${styles.fieldGrid} ${styles.nameGrid}`}>
                <Field label="Contact Person First Name" required><input required name="contact_person_first_name" placeholder="Enter first name" value={formData.contact_person_first_name} onChange={handleChange} /></Field>
                <Field label="Contact Person Middle Name"><input name="contact_person_middle_name" placeholder="Enter middle name" value={formData.contact_person_middle_name ?? ''} onChange={handleChange} /></Field>
                <Field label="Contact Person Last Name" required><input required name="contact_person_last_name" placeholder="Enter last name" value={formData.contact_person_last_name} onChange={handleChange} /></Field>
                <Field label="Suffix"><input name="contact_person_extension_name" placeholder="e.g., Jr" value={formData.contact_person_extension_name ?? ''} onChange={handleChange} /></Field>
              </div>
              <div className={styles.fieldGrid}>
                <Field label="Contact Email" required><input required name="contact_email" type="email" placeholder="Enter company email" value={formData.contact_email} onChange={handleChange} /></Field>
                <Field label="Contact Number" required><input required name="contact_number" type="tel" placeholder="Enter contact number" value={formData.contact_number} onChange={handleChange} /></Field>
              </div>
            </div>
          </section>
        </div>

        <footer className={styles.formFooter}>
          <button type="button" className={styles.cancelButton} onClick={() => navigate('/employer/profile')}>Cancel</button>
          <button type="submit" className={styles.saveButton} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Changes'}</button>
        </footer>
      </form>
    </main>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <label className={styles.field}><span>{label}{required && <em>*</em>}</span>{children}</label>
}
