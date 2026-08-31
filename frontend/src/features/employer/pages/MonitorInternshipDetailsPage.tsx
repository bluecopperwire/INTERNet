import { ArrowLeft, Clock3, Pencil, UserRound } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { employerService } from '../services/employer.service'
import type { EmployerInternshipDetails } from '../types/employer.types'
import styles from './MonitorInternshipDetailsPage.module.css'
import { useToastStore } from '../../../stores/useToastStore'
import { getErrorMessage } from '../../../utils/error-message'

type InternshipForm = Pick<EmployerInternshipDetails, 'company' | 'jobTitle' | 'workingDays' | 'requiredHours' | 'startDate' | 'expectedEndDate' | 'shiftStartTime' | 'shiftEndTime'>

function toForm(details: EmployerInternshipDetails): InternshipForm {
  const { company, jobTitle, workingDays, requiredHours, startDate, expectedEndDate, shiftStartTime, shiftEndTime } = details
  return { company, jobTitle, workingDays, requiredHours, startDate, expectedEndDate, shiftStartTime, shiftEndTime }
}

export function MonitorInternshipDetailsPage() {
  const { applicantId } = useParams<{ applicantId: string }>()
  const navigate = useNavigate()
  const [details, setDetails] = useState<EmployerInternshipDetails | null>(null)
  const [form, setForm] = useState<InternshipForm | null>(null)
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const toast = useToastStore()

  useEffect(() => {
    if (!applicantId) return
    employerService.getInternshipDetails(applicantId).then((data) => {
      setDetails(data ?? null)
      setForm(data ? toForm(data) : null)
    })
  }, [applicantId])

  if (!details || !form) return <main className={styles.feedback}>Loading internship details...</main>

  const remainingHours = Math.max(details.requiredHours - details.renderedHours, 0)
  const update = <K extends keyof InternshipForm>(key: K, value: InternshipForm[K]) => setForm((current) => current ? { ...current, [key]: value } : current)
  const save = async () => {
    if (!applicantId) return
    setSaving(true)
    try {
      const saved = await employerService.updateInternshipDetails(applicantId, form)
      if (saved) {
        setDetails(saved)
        setForm(toForm(saved))
        setIsEditing(false)
        toast.success('Internship details updated.')
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to update internship details.'))
    } finally {
      setSaving(false)
    }
  }

  const updateInternshipStatus = async (status: EmployerInternshipDetails['status']) => {
    if (!applicantId) return
    setSaving(true)
    try {
      const updated = await employerService.updateInternshipDetails(applicantId, { status })
      if (updated) {
        setDetails(updated)
        setForm(toForm(updated))
        toast.success(`Internship status changed to ${status}.`)
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to update internship status.'))
    } finally {
      setSaving(false)
    }
  }

  const deleteRecord = async () => {
    if (!applicantId) return
    if (!window.confirm('Are you sure you want to delete this internship record?')) {
      return
    }
    setSaving(true)
    try {
      await employerService.deleteInternshipDetails(applicantId)
      toast.success('Internship record deleted.')
      navigate('/employer/manage-internship')
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to delete internship record. Only terminal assignments can be deleted.'))
    } finally {
      setSaving(false)
    }
  }

  const canMarkCompleted = details.renderedHours >= details.requiredHours && ['On Going', 'Awaiting Completion'].includes(details.status)
  const canDeleteRecord = ['Completed', 'Cancelled', 'Withdrawn by Student'].includes(details.status)

  return <main className={styles.page}>
    <div className={styles.wrap}>
      <button type="button" className={styles.backButton} onClick={() => navigate('/employer/manage-internship')}><ArrowLeft size={19} />Back to Manage Internship</button>
      <section className={styles.studentSummary}>
        <span className={styles.studentIcon}><UserRound size={28} /></span>
        <div><h1>{details.studentName}</h1><p>{details.jobTitle}</p></div>
        <div className={styles.hoursSummary}><Clock3 size={19} /><div><strong>{details.renderedHours} / {details.requiredHours} hours</strong><span>{remainingHours} hours remaining</span></div></div>
      </section>

      <section className={styles.detailCard}>
        <header className={styles.cardHeader}>
          <div><h2>Internship Details</h2><p>Current internship assignment and schedule.</p></div>
          {!isEditing && <button type="button" className={styles.editButton} onClick={() => setIsEditing(true)}><Pencil size={16} />Edit Details</button>}
        </header>
        <div className={styles.formGrid}>
          <Field label="Company"><input value={form.company} readOnly={!isEditing} onChange={(event) => update('company', event.target.value)} /></Field>
          <Field label="Job Title"><input value={form.jobTitle} readOnly={!isEditing} onChange={(event) => update('jobTitle', event.target.value)} /></Field>
          <Field label="Working Days">{isEditing ? <select value={form.workingDays} onChange={(event) => update('workingDays', event.target.value)}><option>Weekdays</option><option>Weekend</option><option>Flexible</option></select> : <input value={form.workingDays} readOnly />}</Field>
          <Field label="Required Hours"><input inputMode="numeric" value={form.requiredHours} readOnly={!isEditing} onChange={(event) => update('requiredHours', Number(event.target.value.replace(/\D/g, '')) || 0)} /></Field>
          <Field label="Start Date"><input value={form.startDate} readOnly={!isEditing} onChange={(event) => update('startDate', event.target.value)} /></Field>
          <Field label="Expected End Date"><input value={form.expectedEndDate} readOnly={!isEditing} onChange={(event) => update('expectedEndDate', event.target.value)} /></Field>
          <Field label="Shift Start Time"><input value={form.shiftStartTime} readOnly={!isEditing} onChange={(event) => update('shiftStartTime', event.target.value)} /></Field>
          <Field label="Shift End Time"><input value={form.shiftEndTime} readOnly={!isEditing} onChange={(event) => update('shiftEndTime', event.target.value)} /></Field>
        </div>
        {isEditing && <footer className={styles.footer}><button type="button" className={styles.cancelButton} onClick={() => { setForm(toForm(details)); setIsEditing(false) }}>Cancel</button><button type="button" className={styles.saveButton} disabled={saving} onClick={save}>{saving ? 'Saving...' : 'Save'}</button></footer>}
      </section>

      <section className={styles.statusCard}>
        <header className={styles.statusHeader}><h2>Internship Status</h2><p>Track and manage the intern's placement progress.</p></header>
        <div className={styles.statusGrid}>
          <StatusField label="Status" value={details.status} />
          <StatusField label="Target Hours" value={`${details.requiredHours} hours`} />
          <StatusField label="Rendered Hours" value={`${details.renderedHours} hours`} />
          <StatusField label="Remaining Hours" value={`${remainingHours} hours`} />
        </div>
        <footer className={styles.statusActions}>
          <button type="button" className={styles.completeButton} disabled={saving || !canMarkCompleted} onClick={() => updateInternshipStatus('Completed')}>Mark Internship as Completed</button>
          {canDeleteRecord
            ? <button type="button" className={styles.deleteRecordButton} disabled={saving} onClick={deleteRecord}>Delete Record</button>
            : <button type="button" className={styles.cancelInternshipButton} disabled={saving} onClick={() => updateInternshipStatus('Cancelled')}>Cancel Internship</button>}
        </footer>
      </section>
    </div>
  </main>
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className={styles.field}><span>{label}</span>{children}</label>
}

function StatusField({ label, value }: { label: string; value: string }) {
  return <label className={styles.field}><span>{label}</span><input value={value} readOnly /></label>
}
