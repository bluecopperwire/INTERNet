import { ArrowLeft, Building2, CalendarDays, ChartNoAxesColumnIncreasing, Pencil, User } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AttendanceProfileSummary } from '../../../components/AttendanceProfileSummary';
import { useToastStore } from '../../../stores/useToastStore';
import type { EmployerInternshipDetailDto } from '../../../types/api';
import { isValidDateOnly, todayDateOnly } from '../../../utils/date-only';
import { getErrorMessage } from '../../../utils/error-message';
import detailStyles from '../../intern-seeker/components/StudentInternshipDetails.module.css';
import { employerApiService } from '../services/employer-api.service';
import {
  assignmentStatusLabel,
  formatClockTime,
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

type DetailField = readonly [label: string, value: ReactNode];

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
      .then((result) => {
        setDetails(result);
        setForm(toForm(result));
      })
      .catch((reason: unknown) => setError(getErrorMessage(reason, 'Unable to load internship details.')))
      .finally(() => setLoading(false));
  }, [assignmentId]);

  if (!Number.isInteger(assignmentId)) return <main className={styles.feedback} role="alert">Internship assignment not found.</main>;
  if (loading) return <main className={styles.feedback}>Loading internship details...</main>;
  if (error && (!details || !form)) return <main className={styles.feedback} role="alert">{error}</main>;
  if (!details || !form) return <main className={styles.feedback} role="alert">Internship assignment not found.</main>;

  const update = <K extends keyof AssignmentForm>(key: K, value: AssignmentForm[K]) => {
    setForm((current) => current ? { ...current, [key]: value } : current);
  };

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
      if (transition === 'complete') {
        await employerApiService.completeInternship(assignmentId, remark);
        toast.success('Internship marked as complete.');
      } else {
        await employerApiService.cancelInternship(assignmentId, remark);
        toast.success('Internship cancelled.');
      }
      setTransition(null);
      navigate('/employer/manage-internship');
    } catch (reason: unknown) {
      toast.error(getErrorMessage(reason, `Failed to ${transition === 'complete' ? 'complete' : 'cancel'} internship.`));
    } finally {
      setSaving(false);
    }
  };

  const statusLabel = assignmentStatusLabel(details.status.assignmentStatus);
  const statusClass = ['complete_company', 'complete_student'].includes(details.status.assignmentStatus)
    ? 'completed'
    : details.status.assignmentStatus;
  const hasEnded = !['pending', 'ongoing'].includes(details.status.assignmentStatus);

  const internFields: DetailField[] = [
    ['Full Name', displayValue(details.intern.studentFullName)],
    ['Program / Strand', displayValue(details.intern.strandProgram)],
    ['Year Level', displayValue(details.intern.yearLevel)],
    ['School', displayValue(details.intern.schoolName)],
  ];

  const assignmentFields: DetailField[] = [
    ['Company', displayValue(details.assignment.companyName)],
    ['Job Title', displayValue(details.assignment.jobTitle)],
    ['Required Hours', editing ? (
      <input
        aria-label="Required Hours"
        className={styles.inlineInput}
        type="number"
        min={1}
        step={1}
        value={form.requiredHours}
        onChange={(event) => update('requiredHours', Number(event.target.value))}
      />
    ) : formatDetailMinutes(details.assignment.requiredMinutes)],
  ];

  const scheduleFields: DetailField[] = [
    ['Working Days', editing ? (
      <div className={styles.dayOptions} aria-label="Working Days">
        {DAY_NAMES.map((name, day) => (
          <label key={name}>
            <input
              type="checkbox"
              checked={form.workingDays.includes(day)}
              onChange={(event) => update('workingDays', event.target.checked
                ? [...form.workingDays, day].sort()
                : form.workingDays.filter((value) => value !== day))}
            />
            {name.slice(0, 3)}
          </label>
        ))}
      </div>
    ) : displayValue(formatWorkingDays(details.assignment.workingDays))],
    ['Start Date', editing ? (
      <input aria-label="Start Date" className={styles.inlineInput} type="date" min={todayDateOnly()} value={form.startDate} onChange={(event) => update('startDate', event.target.value)} />
    ) : formatAssignmentDate(details.assignment.startDate)],
    [hasEnded ? 'End Date' : 'Expected End Date', editing ? (
      <input aria-label="Expected End Date" className={styles.inlineInput} type="date" min={form.startDate} value={form.expectedEndDate} onChange={(event) => update('expectedEndDate', event.target.value)} />
    ) : formatAssignmentDate(hasEnded ? (details.assignment.endDate ?? details.assignment.endedAt) : details.assignment.expectedEndDate)],
    ['Shift Start', editing ? (
      <input aria-label="Shift Start" className={styles.inlineInput} type="time" value={form.startShift} onChange={(event) => update('startShift', event.target.value)} />
    ) : formatClockTime(details.assignment.startShift)],
    ['Shift End', editing ? (
      <input aria-label="Shift End" className={styles.inlineInput} type="time" value={form.endShift} onChange={(event) => update('endShift', event.target.value)} />
    ) : formatClockTime(details.assignment.endShift)],
  ];

  const statusFields: DetailField[] = [
    ['Status', statusLabel],
    ['Rendered Hours', formatDetailMinutes(details.status.renderedMinutes)],
    ['Remaining Hours', formatDetailMinutes(details.status.remainingMinutes)],
  ];

  return (
    <main className={styles.page}>
      <div className={styles.wrap}>
        <button type="button" className={styles.backButton} onClick={() => navigate('/employer/manage-internship')}>
          <ArrowLeft size={19} />Back to Manage Internship
        </button>

        <section className={`${detailStyles.detailsShell} ${styles.detailsShell}`} aria-labelledby="company-internship-title">
          <header className={detailStyles.pageHeading}>
            <div>
              <h1 id="company-internship-title">Internship Details</h1>
              <p>View the intern's assignment, approved schedule, and progress.</p>
            </div>
            <div className={styles.headingActions}>
              {details.status.canEdit && !editing && (
                <button type="button" className={styles.editButton} onClick={() => setEditing(true)}>
                  <Pencil size={16} />Edit Details
                </button>
              )}
              <span className={`${detailStyles.statusTag} ${detailStyles[statusClass] ?? ''}`}>{statusLabel}</span>
            </div>
          </header>

          <div className={detailStyles.content}>
            <AttendanceProfileSummary profile={{
              studentFullName: details.intern.studentFullName,
              studentContactEmail: details.intern.studentContactEmail,
              studentContactNumber: details.intern.studentContactNumber,
              studentAddress: details.intern.studentAddress,
              studentPhotoFilePath: details.intern.studentPhotoFilePath,
              studentProfileUpdatedAt: details.intern.studentProfileUpdatedAt,
              jobTitle: details.assignment.jobTitle,
              companyName: details.assignment.companyName,
            }} />

            <div className={detailStyles.sectionStack}>
              <DetailSection icon={<User size={18} />} title="Intern Information" fields={internFields} />
              <DetailSection icon={<Building2 size={18} />} title="Assignment Information" fields={assignmentFields} />
              <DetailSection icon={<CalendarDays size={18} />} title="Schedule Information" fields={scheduleFields} />
              <DetailSection icon={<ChartNoAxesColumnIncreasing size={18} />} title="Status Information" fields={statusFields} />
            </div>

            {error && <p className={styles.validationError} role="alert">{error}</p>}
            {editing && (
              <footer className={styles.editActions}>
                <button type="button" className={styles.cancelButton} disabled={saving} onClick={() => { setForm(toForm(details)); setError(''); setEditing(false); }}>Close</button>
                <button type="button" className={styles.saveButton} disabled={saving} onClick={() => void save()}>{saving ? 'Saving...' : 'Save Changes'}</button>
              </footer>
            )}
          </div>

        </section>

        <footer className={styles.companyActions}>
          <button
            type="button"
            className={styles.completeButton}
            disabled={!details.status.canComplete || saving}
            title={details.status.canComplete ? undefined : 'The intern must render all required internship hours before completion.'}
            onClick={() => setTransition('complete')}
          >
            Mark Internship as Complete
          </button>
          <button type="button" className={styles.cancelInternshipButton} disabled={!details.status.canCancel || saving} onClick={() => setTransition('cancel')}>
            Cancel Internship
          </button>
        </footer>
      </div>

      {transition && (
        <TransitionModal kind={transition} saving={saving} onClose={() => setTransition(null)} onSubmit={submitTransition} />
      )}
    </main>
  );
}

function DetailSection({ icon, title, fields }: { icon: ReactNode; title: string; fields: DetailField[] }) {
  const headingId = `company-${title.toLowerCase().replaceAll(' ', '-')}-heading`;
  return (
    <section className={detailStyles.infoCard} aria-labelledby={headingId}>
      <h2 className={detailStyles.sectionTitle} id={headingId}>
        <span>{icon}</span>
        {title}
      </h2>
      <dl className={detailStyles.infoList}>
        {fields.map(([label, value]) => (
          <div className={detailStyles.infoRow} key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
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
  return (
    <div className={styles.modalBackdrop} role="presentation" onMouseDown={onClose}>
      <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="transition-title" onMouseDown={(event) => event.stopPropagation()}>
        <h2 id="transition-title">{complete ? 'Mark Internship as Complete' : 'Cancel Internship'}</h2>
        <label className={styles.modalField}>
          <span>{complete ? 'Company Review of the Student' : 'Reason for Cancellation'}</span>
          <textarea value={remark} onChange={(event) => setRemark(event.target.value)} rows={5} autoFocus />
        </label>
        {validation && <p className={styles.validationError} role="alert">{validation}</p>}
        <div className={styles.modalActions}>
          <button type="button" className={styles.cancelButton} disabled={saving} onClick={onClose}>Close</button>
          <button type="button" className={complete ? styles.completeButton : styles.cancelInternshipButton} disabled={saving} onClick={submit}>{saving ? 'Saving...' : complete ? 'Mark Internship as Complete' : 'Cancel Internship'}</button>
        </div>
      </section>
    </div>
  );
}

function formatDetailMinutes(minutes: number): string {
  const safeMinutes = Math.max(0, Math.round(Number(minutes) || 0));
  const hours = Math.floor(safeMinutes / 60);
  const remainder = safeMinutes % 60;
  if (remainder === 0) return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  if (hours === 0) return `${remainder} ${remainder === 1 ? 'minute' : 'minutes'}`;
  return `${hours} ${hours === 1 ? 'hour' : 'hours'}, ${remainder} ${remainder === 1 ? 'minute' : 'minutes'}`;
}

function formatAssignmentDate(value?: string | null): string {
  if (!value) return 'Not specified';
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const parsed = new Date(dateOnly ? `${value}T00:00:00+08:00` : value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(parsed);
}

function displayValue(value?: string | null): string {
  return value?.trim() || 'Not specified';
}
