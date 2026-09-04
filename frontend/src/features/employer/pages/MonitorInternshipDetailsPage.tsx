import { ArrowLeft, Pencil } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { EmployerInternshipDetailDto } from '../../../types/api';
import { useToastStore } from '../../../stores/useToastStore';
import { isValidDateOnly, todayDateOnly } from '../../../utils/date-only';
import { getErrorMessage } from '../../../utils/error-message';
import { employerApiService } from '../services/employer-api.service';
import {
  assignmentStatusLabel,
  formatClockTime,
  formatMinutes,
  formatWorkingDays,
} from '../utils/internship-workflow';
import styles from './MonitorInternshipDetailsPage.module.css';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

type AssignmentForm = {
  workingDays: number[];
  requiredHours: number;
  startDate: string;
  expectedEndDate: string;
  startShift: string;
  endShift: string;
};

function toForm(details: EmployerInternshipDetailDto): AssignmentForm {
  return {
    workingDays: [...details.assignment.workingDays],
    requiredHours: details.assignment.requiredHours,
    startDate: details.assignment.startDate,
    expectedEndDate: details.assignment.expectedEndDate || '',
    startShift: details.assignment.startShift.slice(0, 5),
    endShift: details.assignment.endShift.slice(0, 5),
  };
}

export function MonitorInternshipDetailsPage() {
  const { applicantId } = useParams<{ applicantId: string }>();
  const assignmentId = Number(applicantId);
  const navigate = useNavigate();
  const toast = useToastStore();
  const [details, setDetails] = useState<EmployerInternshipDetailDto | null>(null);
  const [form, setForm] = useState<AssignmentForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [transition, setTransition] = useState<'complete' | 'cancel' | null>(null);

  useEffect(() => {
    if (!Number.isInteger(assignmentId)) return;
    employerApiService.getInternship(assignmentId)
      .then((result) => { setDetails(result); setForm(toForm(result)); })
      .catch((reason: unknown) => setError(getErrorMessage(reason, 'Unable to load internship details.')))
      .finally(() => setLoading(false));
  }, [assignmentId]);

  if (!Number.isInteger(assignmentId)) return <main className={styles.feedback} role="alert">Internship assignment not found.</main>;
  if (loading) return <main className={styles.feedback}>Loading internship details...</main>;
  if (error || !details || !form) return <main className={styles.feedback} role="alert">{error || 'Internship assignment not found.'}</main>;

  const update = <K extends keyof AssignmentForm>(key: K, value: AssignmentForm[K]) => setForm((current) => current ? { ...current, [key]: value } : current);
  const save = async () => {
    if (!isValidDateOnly(form.startDate) || (form.expectedEndDate && !isValidDateOnly(form.expectedEndDate))) return setError('Enter valid start and expected end dates.');
    if (form.expectedEndDate && form.expectedEndDate < form.startDate) return setError('Expected end date must be on or after the start date.');
    if (!form.workingDays.length) return setError('Select at least one working day.');
    if (!Number.isInteger(form.requiredHours) || form.requiredHours < 1) return setError('Required Hours must be a positive whole number.');
    if (form.endShift <= form.startShift) return setError('Shift End must be later than Shift Start.');
    setError('');
    setSaving(true);
    try {
      const updated = await employerApiService.updateInternship(assignmentId, {
        ...form,
        expectedEndDate: form.expectedEndDate || null,
      });
      setDetails(updated);
      setForm(toForm(updated));
      setEditing(false);
      toast.success('Internship details updated.');
    } catch (reason: unknown) {
      toast.error(getErrorMessage(reason, 'Failed to update internship details.'));
    } finally {
      setSaving(false);
    }
  };

  const submitTransition = async (remark: string) => {
    if (!transition) return;
    setSaving(true);
    try {
      if (transition === 'complete') await employerApiService.completeInternship(assignmentId, remark);
      else await employerApiService.cancelInternship(assignmentId, remark);
      toast.success(transition === 'complete' ? 'Internship marked as completed.' : 'Internship cancelled.');
      setTransition(null);
      navigate('/employer/manage-internship');
    } catch (reason: unknown) {
      toast.error(getErrorMessage(reason, `Failed to ${transition} internship.`));
    } finally {
      setSaving(false);
    }
  };

  const active = ['pending', 'ongoing'].includes(details.status.assignmentStatus);

  return <main className={styles.page}>
    <div className={styles.wrap}>
      <button type="button" className={styles.backButton} onClick={() => navigate('/employer/manage-internship')}><ArrowLeft size={19} />Back to Manage Internship</button>
      <section className={styles.studentSummary}>
        <div><h1>{details.assignment.jobTitle} at {details.assignment.companyName}</h1><p>{details.intern.studentFullName} · {details.intern.strandProgram || 'Program / Strand not provided'}</p></div>
        <span className={styles.statusTag}>{assignmentStatusLabel(details.status.assignmentStatus)}</span>
      </section>

      <section className={styles.detailCard}>
        <header className={styles.cardHeader}><div><h2>Internship Details</h2><p>Assignment schedule and required internship duration.</p></div>{details.status.canEdit && !editing && <button type="button" className={styles.editButton} onClick={() => setEditing(true)}><Pencil size={16} />Edit Details</button>}</header>
        <div className={styles.formGrid}>
          <ReadField label="Student" value={details.intern.studentFullName} />
          <ReadField label="Program / Strand" value={details.intern.strandProgram || 'N/A'} />
          <ReadField label="Job Title" value={details.assignment.jobTitle} />
          <label className={styles.field}><span>Working Days</span>{editing ? <div className={styles.dayOptions}>{DAY_NAMES.map((name, day) => <label key={name}><input type="checkbox" checked={form.workingDays.includes(day)} onChange={(event) => update('workingDays', event.target.checked ? [...form.workingDays, day].sort() : form.workingDays.filter((value) => value !== day))} />{name.slice(0, 3)}</label>)}</div> : <input value={formatWorkingDays(details.assignment.workingDays)} readOnly />}</label>
          <label className={styles.field}><span>Start Date</span><input type="date" min={todayDateOnly()} value={form.startDate} readOnly={!editing} onChange={(event) => update('startDate', event.target.value)} /></label>
          <label className={styles.field}><span>Expected End Date</span><input type="date" min={form.startDate} value={form.expectedEndDate} readOnly={!editing} onChange={(event) => update('expectedEndDate', event.target.value)} /></label>
          <label className={styles.field}><span>Shift Start</span><input type={editing ? 'time' : 'text'} value={editing ? form.startShift : formatClockTime(details.assignment.startShift)} readOnly={!editing} onChange={(event) => update('startShift', event.target.value)} /></label>
          <label className={styles.field}><span>Shift End</span><input type={editing ? 'time' : 'text'} value={editing ? form.endShift : formatClockTime(details.assignment.endShift)} readOnly={!editing} onChange={(event) => update('endShift', event.target.value)} /></label>
          <label className={styles.field}><span>Required Hours</span><input type={editing ? 'number' : 'text'} min={1} step={1} value={editing ? form.requiredHours : formatMinutes(details.assignment.requiredMinutes)} readOnly={!editing} onChange={(event) => update('requiredHours', Number(event.target.value))} /></label>
          <ReadField label="Rendered Hours" value={formatMinutes(details.status.renderedMinutes)} />
          <ReadField label="Remaining Hours" value={formatMinutes(details.status.remainingMinutes)} />
        </div>
        {error && <p className={styles.validationError} role="alert">{error}</p>}
        {editing && <footer className={styles.footer}><button type="button" className={styles.cancelButton} onClick={() => { setForm(toForm(details)); setError(''); setEditing(false); }}>Close</button><button type="button" className={styles.saveButton} disabled={saving} onClick={() => void save()}>{saving ? 'Saving...' : 'Save Changes'}</button></footer>}
      </section>

      <section className={styles.statusCard}>
        <header className={styles.statusHeader}><h2>Internship Actions</h2><p>{active ? 'Available actions are enforced by the assignment lifecycle.' : 'This assignment is no longer active. Use Internship History for its read-only record.'}</p></header>
        {active && <footer className={styles.statusActions}>{details.status.canComplete && <button type="button" className={styles.completeButton} disabled={saving} onClick={() => setTransition('complete')}>Mark Internship as Completed</button>}{details.status.canCancel && <button type="button" className={styles.cancelInternshipButton} disabled={saving} onClick={() => setTransition('cancel')}>Cancel Internship</button>}</footer>}
      </section>
      {transition && <TransitionModal kind={transition} saving={saving} onClose={() => setTransition(null)} onSubmit={submitTransition} />}
    </div>
  </main>;
}

function ReadField({ label, value }: { label: string; value: string }) {
  return <label className={styles.field}><span>{label}</span><input value={value} readOnly /></label>;
}

function TransitionModal({ kind, saving, onClose, onSubmit }: { kind: 'complete' | 'cancel'; saving: boolean; onClose: () => void; onSubmit: (remark: string) => Promise<void> }) {
  const [remark, setRemark] = useState('');
  const [validation, setValidation] = useState('');
  const complete = kind === 'complete';
  const submit = () => {
    const normalized = remark.trim();
    if (!normalized) return setValidation(complete ? 'Company Review of the Student is required.' : 'Reason for Cancellation is required.');
    setValidation('');
    void onSubmit(normalized);
  };
  return <div className={styles.modalBackdrop} role="presentation"><section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="transition-title"><h2 id="transition-title">{complete ? 'Mark Internship as Completed' : 'Cancel Internship'}</h2><label className={styles.modalField}><span>{complete ? 'Company Review of the Student' : 'Reason for Cancellation'}</span><textarea value={remark} onChange={(event) => setRemark(event.target.value)} rows={5} autoFocus /></label>{validation && <p className={styles.validationError} role="alert">{validation}</p>}<div className={styles.modalActions}><button type="button" className={styles.cancelButton} disabled={saving} onClick={onClose}>Close</button><button type="button" className={complete ? styles.completeButton : styles.cancelInternshipButton} disabled={saving} onClick={submit}>{saving ? 'Saving...' : complete ? 'Mark Internship as Completed' : 'Cancel Internship'}</button></div></section></div>;
}
