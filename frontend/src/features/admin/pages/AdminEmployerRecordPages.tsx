import React, { useEffect, useState } from 'react'
import { ArrowLeft, Building2, Edit3, Mail, MapPin, Phone, UserRound, X } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { adminService } from '../services/admin.service'
import type { EmployerRecord } from '../types/admin.types'
import detailStyles from './AdminStudentDetailsPage.module.css'
import formStyles from '../../intern-seeker/pages/ProfileEditorPage.module.css'

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

const addressOf = (record: EmployerRecord) =>
  [record.addressLine, record.addressBarangay, record.addressDistrict, record.addressCity].filter(Boolean).join(', ') ||
  record.location

const contactNameOf = (record: EmployerRecord) =>
  [record.contactFirstName, record.contactMiddleName, record.contactLastName, record.contactSuffix].filter(Boolean).join(' ') ||
  record.contactPerson

function prepareEmployerFormData(record: EmployerRecord): EmployerRecord {
  let { contactFirstName = '', contactMiddleName = '', contactLastName = '', contactSuffix = '' } = record

  if (!contactFirstName && !contactLastName && record.contactPerson) {
    const parts = record.contactPerson.trim().split(/\s+/)
    contactFirstName = parts[0] || ''
    if (parts.length > 1) {
      contactLastName = parts.slice(1).join(' ')
    }
  }

  return {
    ...record,
    contactFirstName,
    contactMiddleName: contactMiddleName || '',
    contactLastName,
    contactSuffix: contactSuffix || '',
    addressLine: record.addressLine || '',
    addressBarangay: record.addressBarangay || '',
    addressDistrict: record.addressDistrict || '',
    addressCity: record.addressCity || '',
    companyWebsite: record.companyWebsite || '',
    description: record.description || '',
  }
}

export function AdminEmployerDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [record, setRecord] = useState<EmployerRecord | null>(null)
  const [suspending, setSuspending] = useState(false)
  const [unsuspending, setUnsuspending] = useState(false)

  useEffect(() => {
    if (id) {
      adminService.getEmployerRecord(id).then(setRecord)
    }
  }, [id])

  if (!record) {
    return <main className={detailStyles.feedback}>Loading employer profile...</main>
  }

  const updateStatus = async (status: EmployerRecord['status']) => {
    if (!id) return
    const updated = await adminService.updateEmployerRecord(id, { status })
    if (updated) setRecord(updated)
  }

  return (
    <main className={detailStyles.page}>
      <div className={detailStyles.wrap}>
        <button
          type="button"
          className={detailStyles.backButton}
          onClick={() => navigate('/admin/manage-employers')}
        >
          <ArrowLeft size={19} aria-hidden="true" />
          Back to Manage Employers
        </button>

        <section className={detailStyles.profileCard}>
          <header className={detailStyles.profileHeader}>
            <h1>Company Profile</h1>
            <p>View and manage the employer's company and contact information.</p>
          </header>

          <div className={detailStyles.body}>
            <section className={detailStyles.summary}>
              <span className={detailStyles.avatar}>
                <Building2 size={30} />
              </span>
              <div className={detailStyles.summaryInfo}>
                <h2>{record.companyName}</h2>
                <div>
                  <span>
                    <Mail size={16} />
                    {record.contactEmail || record.email}
                  </span>
                  <span>
                    <Phone size={16} />
                    {record.contactNumber}
                  </span>
                </div>
                <span>
                  <MapPin size={16} />
                  {addressOf(record)}
                </span>
              </div>
              <StatusPill status={record.status} />
            </section>

            <Card icon={<Building2 size={21} />} title="About Company">
              <p className={detailStyles.descriptionText}>
                {record.description || 'No company description provided.'}
              </p>
            </Card>

            <Card icon={<Building2 size={21} />} title="Company Information">
              <Row label="Company Name" value={record.companyName} />
              <Row label="Company Type" value={record.companyType} />
              <Row label="Industry" value={record.industry} />
              <Row label="Company Address" value={addressOf(record)} />
              <Row label="Company Size" value={record.companySize} />
              <Row label="Company Year Established" value={record.yearEstablished} />
              <Row label="Website URL" value={record.companyWebsite} />
            </Card>

            <Card icon={<UserRound size={21} />} title="Contact Information">
              <Row label="Contact Person" value={contactNameOf(record)} />
              <Row label="Contact Email" value={record.contactEmail || record.email} />
              <Row label="Contact Number" value={record.contactNumber} />
            </Card>
          </div>

          <footer className={detailStyles.actions}>
            <button
              type="button"
              className={detailStyles.editButton}
              onClick={() => navigate(`/admin/manage-employers/${record.id}/edit`)}
              disabled={record.status === 'Deactivated'}
            >
              <Edit3 size={17} />
              Edit Profile
            </button>
            <button
              type="button"
              className={detailStyles.suspendButton}
              disabled={record.status === 'Deactivated'}
              onClick={() => record.status === 'Suspended' ? setUnsuspending(true) : setSuspending(true)}
            >
              {record.status === 'Suspended' ? 'Unsuspend' : 'Suspend'}
            </button>
            <button
              type="button"
              className={detailStyles.deactivateButton}
              disabled={record.status === 'Deactivated'}
              onClick={() => updateStatus('Deactivated')}
            >
              Deactivate
            </button>
          </footer>
        </section>

        {suspending && (
          <SuspendDialog
            subject={record.companyName}
            onClose={() => setSuspending(false)}
            onConfirm={(days) => {
              if (!id) return
              adminService.updateEmployerRecord(id, { status: 'Suspended', suspensionDaysRemaining: days }).then((updated) => { if (updated) setRecord(updated) })
              setSuspending(false)
            }}
          />
        )}
        {unsuspending && <UnsuspendDialog subject={record.companyName} days={record.suspensionDaysRemaining ?? 0} onClose={() => setUnsuspending(false)} onConfirm={() => { if (!id) return; adminService.updateEmployerRecord(id, { status: 'Active', suspensionDaysRemaining: undefined }).then((updated) => { if (updated) setRecord(updated) }); setUnsuspending(false) }} />}
      </div>
    </main>
  )
}

export function AdminEmployerEditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [form, setForm] = useState<EmployerRecord | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (id) {
      adminService.getEmployerRecord(id).then((data) => {
        setForm(data ? prepareEmployerFormData(data) : null)
      })
    }
  }, [id])

  if (!form) {
    return <main className={formStyles.loading}>Loading employer profile...</main>
  }

  if (form.status === 'Deactivated') {
    return <main className={formStyles.loading}>Profile editing is unavailable for deactivated accounts.</main>
  }

  const change = (key: keyof EmployerRecord, value: string) => {
    setForm((current) => (current ? { ...current, [key]: value } : current))
  }

  const letters = (key: keyof EmployerRecord, value: string) => {
    change(key, value.replace(/[^a-zA-ZÀ-ÿ .'-]/g, ''))
  }

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!id || !form) return
    setSaving(true)
    try {
      const location = addressOf(form)
      const contactPerson = contactNameOf(form)
      const updated = await adminService.updateEmployerRecord(id, {
        ...form,
        location,
        contactPerson,
      })
      if (updated) {
        navigate(`/admin/manage-employers/${updated.id}`)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className={formStyles.page}>
      <button
        type="button"
        className={formStyles.backButton}
        onClick={() => navigate(`/admin/manage-employers/${form.id}`)}
      >
        <ArrowLeft size={19} aria-hidden="true" />
        Back to Company Profile
      </button>

      <form className={formStyles.formCard} onSubmit={save}>
        <header className={formStyles.formHeader}>
          <h1>Edit Company Profile</h1>
          <p>Keep company and contact information up to date.</p>
        </header>

        <div className={formStyles.formBody}>
          <EditorSection icon={<Building2 size={21} />} title="Company Information">
            <div className={formStyles.fieldGrid}>
              <Field label="Company Name" required>
                <input
                  required
                  value={form.companyName}
                  placeholder="Enter company name"
                  onChange={(e) => change('companyName', e.target.value)}
                />
              </Field>

              <Field label="Company Type" required>
                <select
                  required
                  value={form.companyType}
                  onChange={(e) => change('companyType', e.target.value)}
                >
                  <option value="Private">Private</option>
                  <option value="Government">Government</option>
                </select>
              </Field>

              <Field label="Industry" required>
                <select
                  required
                  value={form.industry}
                  onChange={(e) => change('industry', e.target.value)}
                >
                  {INDUSTRIES.map((industry) => (
                    <option key={industry} value={industry}>
                      {industry}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Company Size">
                <input
                  inputMode="numeric"
                  placeholder="Enter number of employees"
                  value={form.companySize || ''}
                  onChange={(e) => change('companySize', e.target.value.replace(/\D/g, ''))}
                />
              </Field>

              <Field label="Company Year Established">
                <input
                  inputMode="numeric"
                  placeholder="e.g., 2015"
                  value={form.yearEstablished || ''}
                  onChange={(e) => change('yearEstablished', e.target.value.replace(/\D/g, ''))}
                />
              </Field>

              <Field label="Website URL">
                <input
                  type="url"
                  placeholder="https://example.com"
                  value={form.companyWebsite || ''}
                  onChange={(e) => change('companyWebsite', e.target.value)}
                />
              </Field>
            </div>

            <div className={`${formStyles.fieldGrid} ${formStyles.addressGrid}`}>
              <Field label="Address Line" required>
                <input
                  required
                  value={form.addressLine || ''}
                  placeholder="Enter house / building / street"
                  onChange={(e) => change('addressLine', e.target.value)}
                />
              </Field>

              <Field label="Barangay" required>
                <input
                  required
                  value={form.addressBarangay || ''}
                  placeholder="Enter barangay"
                  onChange={(e) => change('addressBarangay', e.target.value)}
                />
              </Field>

              <Field label="District">
                <input
                  value={form.addressDistrict || ''}
                  placeholder="If none, type N/A"
                  onChange={(e) => change('addressDistrict', e.target.value)}
                />
              </Field>

              <Field label="City" required>
                <input
                  required
                  value={form.addressCity || ''}
                  placeholder="Enter city"
                  onChange={(e) => change('addressCity', e.target.value)}
                />
              </Field>
            </div>

            <Field label="About Company" required>
              <textarea
                required
                value={form.description || ''}
                placeholder="Describe your company"
                onChange={(e) => change('description', e.target.value)}
              />
            </Field>
          </EditorSection>

          <EditorSection icon={<UserRound size={21} />} title="Contact Information">
            <div className={`${formStyles.fieldGrid} ${formStyles.nameGrid}`}>
              <Field label="Contact Person First Name" required>
                <input
                  required
                  value={form.contactFirstName || ''}
                  placeholder="Enter first name"
                  onChange={(e) => letters('contactFirstName', e.target.value)}
                />
              </Field>

              <Field label="Contact Person Middle Name">
                <input
                  value={form.contactMiddleName || ''}
                  placeholder="Enter middle name"
                  onChange={(e) => letters('contactMiddleName', e.target.value)}
                />
              </Field>

              <Field label="Contact Person Last Name" required>
                <input
                  required
                  value={form.contactLastName || ''}
                  placeholder="Enter last name"
                  onChange={(e) => letters('contactLastName', e.target.value)}
                />
              </Field>

              <Field label="Suffix">
                <input
                  value={form.contactSuffix || ''}
                  placeholder="e.g., Jr."
                  onChange={(e) => letters('contactSuffix', e.target.value)}
                />
              </Field>
            </div>

            <div className={formStyles.fieldGrid}>
              <Field label="Contact Email" required>
                <input
                  required
                  type="email"
                  placeholder="Enter company email"
                  value={form.contactEmail || form.email || ''}
                  onChange={(e) => change('contactEmail', e.target.value)}
                />
              </Field>

              <Field label="Contact Number" required>
                <input
                  required
                  type="tel"
                  placeholder="Enter contact number"
                  value={form.contactNumber || ''}
                  onChange={(e) =>
                    change('contactNumber', e.target.value.replace(/[^0-9()+ -]/g, ''))
                  }
                />
              </Field>
            </div>
          </EditorSection>
        </div>

        <footer className={formStyles.formFooter}>
          <button
            type="button"
            className={formStyles.cancelButton}
            onClick={() => navigate(`/admin/manage-employers/${form.id}`)}
          >
            Cancel
          </button>
          <button type="submit" className={formStyles.saveButton} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </footer>
      </form>
    </main>
  )
}

function SuspendDialog({
  subject,
  onClose,
  onConfirm,
}: {
  subject: string
  onClose: () => void
  onConfirm: (days: number) => void
}) {
  const [days, setDays] = useState('')

  return (
    <div className={detailStyles.dialogOverlay} onClick={onClose}>
      <section className={detailStyles.dialog} onClick={(e) => e.stopPropagation()}>
        <header className={detailStyles.dialogHeader}>
          <div>
            <h2>Suspend Employer Account</h2>
            <p>Set the suspension duration for {subject}.</p>
          </div>
          <button
            type="button"
            className={detailStyles.closeButton}
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </header>

        <div className={detailStyles.dialogBody}>
          <label>
            Suspension Duration (Days)
            <input
              autoFocus
              type="number"
              min="1"
              inputMode="numeric"
              value={days}
              onChange={(e) => setDays(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter number of days"
            />
          </label>
        </div>

        <footer className={detailStyles.dialogActions}>
          <button type="button" className={detailStyles.cancelButton} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={detailStyles.confirmSuspend}
            disabled={!days}
            onClick={() => onConfirm(Number(days))}
          >
            Suspend Account
          </button>
        </footer>
      </section>
    </div>
  )
}

function UnsuspendDialog({ subject, days, onClose, onConfirm }: { subject: string; days: number; onClose: () => void; onConfirm: () => void }) {
  return <div className={detailStyles.dialogOverlay} onClick={onClose}><section className={detailStyles.dialog} onClick={(event) => event.stopPropagation()}><header className={detailStyles.dialogHeader}><div><h2>Unsuspend Employer Account</h2><p>{subject} has {days} day(s) remaining on its suspension.</p></div><button type="button" className={detailStyles.closeButton} onClick={onClose} aria-label="Close"><X size={20} /></button></header><div className={detailStyles.dialogBody}><p className={detailStyles.dialogHint}>Are you sure you want to restore this account now?</p></div><footer className={detailStyles.dialogActions}><button type="button" className={detailStyles.cancelButton} onClick={onClose}>Cancel</button><button type="button" className={detailStyles.confirmSuspend} onClick={onConfirm}>Confirm Unsuspend</button></footer></section></div>
}

function Card({
  children,
  icon,
  title,
}: {
  children: React.ReactNode
  icon: React.ReactNode
  title: string
}) {
  return (
    <section className={detailStyles.infoCard}>
      <header>
        <span>{icon}</span>
        <h2>{title}</h2>
      </header>
      <div>{children}</div>
    </section>
  )
}

function Row({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <article className={detailStyles.infoRow}>
      <span>{label}</span>
      <strong>{value || 'Not provided'}</strong>
    </article>
  )
}

function StatusPill({ status }: { status: EmployerRecord['status'] }) {
  const tone =
    status === 'Active'
      ? detailStyles.active
      : status === 'Suspended'
        ? detailStyles.suspended
        : detailStyles.deactivated
  return <span className={`${detailStyles.statusPill} ${tone}`}>{status}</span>
}

function EditorSection({
  children,
  icon,
  title,
}: {
  children: React.ReactNode
  icon: React.ReactNode
  title: string
}) {
  return (
    <section className={formStyles.section}>
      <header className={formStyles.sectionHeader}>
        <span className={formStyles.sectionIcon}>{icon}</span>
        <h2>{title}</h2>
      </header>
      <div className={formStyles.sectionBody}>{children}</div>
    </section>
  )
}

function Field({
  children,
  label,
  required,
}: {
  children: React.ReactNode
  label: string
  required?: boolean
}) {
  return (
    <label className={formStyles.field}>
      <span>
        {label}
        {required && <em>*</em>}
      </span>
      {children}
    </label>
  )
}
