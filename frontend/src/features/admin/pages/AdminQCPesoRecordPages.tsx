import React, { useEffect, useState } from 'react'
import { ArrowLeft, BriefcaseBusiness, Edit3, Mail, MapPin, Phone, UserRound, X } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { adminService } from '../services/admin.service'
import type { QCPesoRecord } from '../types/admin.types'
import detailStyles from './AdminStudentDetailsPage.module.css'
import formStyles from '../../intern-seeker/pages/ProfileEditorPage.module.css'

const fullNameOf = (record: QCPesoRecord) =>
  [record.firstName, record.middleName, record.lastName, record.suffix].filter(Boolean).join(' ') ||
  record.fullName

const addressOf = (record: QCPesoRecord) =>
  [record.addressLine, record.barangay, record.district && `District ${record.district}`, record.city]
    .filter(Boolean)
    .join(', ')

function prepareQCPesoFormData(record: QCPesoRecord): QCPesoRecord {
  let { firstName = '', middleName = '', lastName = '', suffix = '' } = record

  if (!firstName && !lastName && record.fullName) {
    const parts = record.fullName.trim().split(/\s+/)
    firstName = parts[0] || ''
    if (parts.length > 1) {
      lastName = parts.slice(1).join(' ')
    }
  }

  return {
    ...record,
    firstName,
    middleName: middleName || '',
    lastName,
    suffix: suffix || '',
    addressLine: record.addressLine || '',
    barangay: record.barangay || '',
    district: record.district || '',
    city: record.city || '',
    sex: record.sex || 'Male',
  }
}

export function AdminQCPesoDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [record, setRecord] = useState<QCPesoRecord | null>(null)
  const [suspending, setSuspending] = useState(false)

  useEffect(() => {
    if (id) {
      adminService.getQCPesoRecord(id).then(setRecord)
    }
  }, [id])

  if (!record) {
    return <main className={detailStyles.feedback}>Loading QC PESO profile...</main>
  }

  const updateStatus = async (status: QCPesoRecord['status']) => {
    if (!id) return
    const updated = await adminService.updateQCPesoRecord(id, { status })
    if (updated) setRecord(updated)
  }

  const name = fullNameOf(record)

  return (
    <main className={detailStyles.page}>
      <div className={detailStyles.wrap}>
        <button
          type="button"
          className={detailStyles.backButton}
          onClick={() => navigate('/admin/manage-qcpeso')}
        >
          <ArrowLeft size={19} aria-hidden="true" />
          Back to Manage QC PESO
        </button>

        <section className={detailStyles.profileCard}>
          <header className={detailStyles.profileHeader}>
            <h1>QC PESO Profile</h1>
            <p>View and manage QC PESO personnel information.</p>
          </header>

          <div className={detailStyles.body}>
            <section className={detailStyles.summary}>
              <span className={detailStyles.avatar}>
                <UserRound size={30} />
              </span>
              <div className={detailStyles.summaryInfo}>
                <h2>{name}</h2>
                <div>
                  <span>
                    <Mail size={16} />
                    {record.email}
                  </span>
                  <span>
                    <Phone size={16} />
                    {record.contactNumber}
                  </span>
                </div>
                <span>
                  <MapPin size={16} />
                  {record.department} — {record.position}
                </span>
              </div>
              <StatusPill status={record.status} />
            </section>

            <Card icon={<UserRound size={21} />} title="Personal Information">
              <Row label="Full Name" value={name} />
              <Row label="Address" value={addressOf(record)} />
              <Row label="Birthdate" value={record.birthdate} />
              <Row label="Sex" value={record.sex} />
            </Card>

            <Card icon={<Mail size={21} />} title="Contact Information">
              <Row label="Email" value={record.email} />
              <Row label="Mobile Number" value={record.contactNumber} />
            </Card>

            <Card icon={<BriefcaseBusiness size={21} />} title="Work Information">
              <Row label="Employee ID" value={record.employeeId} />
              <Row label="Department" value={record.department} />
              <Row label="Position" value={record.position} />
            </Card>
          </div>

          <footer className={detailStyles.actions}>
            <button
              type="button"
              className={detailStyles.editButton}
              onClick={() => navigate(`/admin/manage-qcpeso/${record.id}/edit`)}
            >
              <Edit3 size={17} />
              Edit Profile
            </button>
            <button
              type="button"
              className={detailStyles.suspendButton}
              disabled={record.status === 'Deactivated'}
              onClick={() => setSuspending(true)}
            >
              Suspend
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
            subject={name}
            onClose={() => setSuspending(false)}
            onConfirm={() => {
              updateStatus('Suspended')
              setSuspending(false)
            }}
          />
        )}
      </div>
    </main>
  )
}

export function AdminQCPesoEditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [form, setForm] = useState<QCPesoRecord | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (id) {
      adminService.getQCPesoRecord(id).then((data) => {
        setForm(data ? prepareQCPesoFormData(data) : null)
      })
    }
  }, [id])

  if (!form) {
    return <main className={formStyles.loading}>Loading QC PESO profile...</main>
  }

  const change = (key: keyof QCPesoRecord, value: string) => {
    setForm((current) => (current ? { ...current, [key]: value } : current))
  }

  const letters = (key: keyof QCPesoRecord, value: string) => {
    change(key, value.replace(/[^a-zA-ZÀ-ÿ .'-]/g, ''))
  }

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!id || !form) return
    setSaving(true)
    try {
      const fullName = fullNameOf(form)
      const updated = await adminService.updateQCPesoRecord(id, {
        ...form,
        fullName,
      })
      if (updated) {
        navigate(`/admin/manage-qcpeso/${updated.id}`)
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
        onClick={() => navigate(`/admin/manage-qcpeso/${form.id}`)}
      >
        <ArrowLeft size={19} aria-hidden="true" />
        Back to QC PESO Profile
      </button>

      <form className={formStyles.formCard} onSubmit={save}>
        <header className={formStyles.formHeader}>
          <h1>Edit QC PESO Profile</h1>
          <p>Keep personal, contact, and work information up to date.</p>
        </header>

        <div className={formStyles.formBody}>
          <EditorSection icon={<UserRound size={21} />} title="Personal Information">
            <div className={`${formStyles.fieldGrid} ${formStyles.nameGrid}`}>
              <Field label="First Name" required>
                <input
                  required
                  value={form.firstName}
                  placeholder="Enter first name"
                  onChange={(e) => letters('firstName', e.target.value)}
                />
              </Field>

              <Field label="Middle Name">
                <input
                  value={form.middleName}
                  placeholder="Enter middle name"
                  onChange={(e) => letters('middleName', e.target.value)}
                />
              </Field>

              <Field label="Last Name" required>
                <input
                  required
                  value={form.lastName}
                  placeholder="Enter last name"
                  onChange={(e) => letters('lastName', e.target.value)}
                />
              </Field>

              <Field label="Suffix">
                <input
                  value={form.suffix || ''}
                  placeholder="e.g., Jr."
                  onChange={(e) => letters('suffix', e.target.value)}
                />
              </Field>
            </div>

            <div className={`${formStyles.fieldGrid} ${formStyles.addressGrid}`}>
              <Field label="House / Block No. / Street" required>
                <input
                  required
                  value={form.addressLine || ''}
                  placeholder="Enter house / block no. / street"
                  onChange={(e) => change('addressLine', e.target.value)}
                />
              </Field>

              <Field label="Barangay" required>
                <input
                  required
                  value={form.barangay || ''}
                  placeholder="Enter barangay"
                  onChange={(e) => change('barangay', e.target.value)}
                />
              </Field>

              <Field label="District" required>
                <input
                  required
                  value={form.district || ''}
                  placeholder="If none, type N/A"
                  onChange={(e) => change('district', e.target.value)}
                />
              </Field>

              <Field label="City" required>
                <input
                  required
                  value={form.city || ''}
                  placeholder="Enter city"
                  onChange={(e) => change('city', e.target.value)}
                />
              </Field>
            </div>

            <div className={`${formStyles.fieldGrid} ${formStyles.personalDetailsGrid}`}>
              <Field label="Birthdate" required>
                <input
                  required
                  type="date"
                  value={form.birthdate}
                  onChange={(e) => change('birthdate', e.target.value)}
                />
              </Field>

              <div className={formStyles.choiceField}>
                <span>
                  Sex <em>*</em>
                </span>
                <div className={formStyles.radioGroup}>
                  <label>
                    <input
                      type="radio"
                      name="qcpeso-sex"
                      checked={form.sex === 'Male'}
                      onChange={() => change('sex', 'Male')}
                    />
                    Male
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="qcpeso-sex"
                      checked={form.sex === 'Female'}
                      onChange={() => change('sex', 'Female')}
                    />
                    Female
                  </label>
                </div>
              </div>
            </div>
          </EditorSection>

          <EditorSection icon={<Mail size={21} />} title="Contact Information">
            <div className={formStyles.fieldGrid}>
              <Field label="Email" required>
                <input
                  required
                  type="email"
                  placeholder="Enter email address"
                  value={form.email}
                  onChange={(e) => change('email', e.target.value)}
                />
              </Field>

              <Field label="Mobile Number" required>
                <input
                  required
                  type="tel"
                  placeholder="Enter contact number"
                  value={form.contactNumber}
                  onChange={(e) =>
                    change('contactNumber', e.target.value.replace(/\D/g, ''))
                  }
                />
              </Field>
            </div>
          </EditorSection>

          <EditorSection icon={<BriefcaseBusiness size={21} />} title="Work Information">
            <div className={formStyles.fieldGrid}>
              <Field label="Employee ID" required>
                <input
                  required
                  placeholder="Enter employee ID"
                  value={form.employeeId}
                  onChange={(e) => change('employeeId', e.target.value)}
                />
              </Field>

              <Field label="Department" required>
                <input
                  required
                  placeholder="Enter department"
                  value={form.department}
                  onChange={(e) => change('department', e.target.value)}
                />
              </Field>

              <Field label="Position" required>
                <input
                  required
                  placeholder="Enter position"
                  value={form.position}
                  onChange={(e) => change('position', e.target.value)}
                />
              </Field>
            </div>
          </EditorSection>
        </div>

        <footer className={formStyles.formFooter}>
          <button
            type="button"
            className={formStyles.cancelButton}
            onClick={() => navigate(`/admin/manage-qcpeso/${form.id}`)}
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
  onConfirm: () => void
}) {
  const [days, setDays] = useState('')

  return (
    <div className={detailStyles.dialogOverlay} onClick={onClose}>
      <section className={detailStyles.dialog} onClick={(e) => e.stopPropagation()}>
        <header className={detailStyles.dialogHeader}>
          <div>
            <h2>Suspend QC PESO Account</h2>
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
            onClick={onConfirm}
          >
            Suspend Account
          </button>
        </footer>
      </section>
    </div>
  )
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

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <article className={detailStyles.infoRow}>
      <span>{label}</span>
      <strong>{value || 'Not provided'}</strong>
    </article>
  )
}

function StatusPill({ status }: { status: QCPesoRecord['status'] }) {
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
