import { ArrowLeft, Building2, CalendarDays, ChartNoAxesColumnIncreasing, User } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AttendanceProfileSummary } from '../../../components/AttendanceProfileSummary';
import { ConfirmDeleteModal } from '../../../components/feedback/ConfirmDeleteModal';
import { useToastStore } from '../../../stores/useToastStore';
import type { EmployerInternshipDetailDto } from '../../../types/api';
import { getErrorMessage } from '../../../utils/error-message';
import detailStyles from '../../intern-seeker/components/StudentInternshipDetails.module.css';
import studentPageStyles from '../../intern-seeker/pages/StudentInternshipPages.module.css';
import { employerApiService } from '../services/employer-api.service';
import { assignmentStatusLabel, formatClockTime, formatWorkingDays } from '../utils/internship-workflow';
import styles from './MonitorInternshipDetailsPage.module.css';

type DetailField = readonly [label: string, value: string];
type OutcomeRemark = { title: string; remark: string; icon: ReactNode };

export function EmployerInternshipHistoryDetailsPage() {
  const { assignmentId: routeId } = useParams<{ assignmentId: string }>();
  const assignmentId = Number(routeId);
  const navigate = useNavigate();
  const toast = useToastStore();
  const [details, setDetails] = useState<EmployerInternshipDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!Number.isInteger(assignmentId)) return;
    employerApiService.getInternshipHistoryDetail(assignmentId)
      .then(setDetails)
      .catch((reason: unknown) => setError(getErrorMessage(reason, 'Unable to load internship history details.')))
      .finally(() => setLoading(false));
  }, [assignmentId]);

  if (!Number.isInteger(assignmentId)) return <main className={styles.feedback} role="alert">Internship assignment not found.</main>;
  if (loading) return <main className={styles.feedback}>Loading internship history...</main>;
  if (error || !details) return <main className={styles.feedback} role="alert">{error || 'Internship assignment not found.'}</main>;

  const deleteRecord = async () => {
    setDeleting(true);
    try {
      await employerApiService.deleteInternship(assignmentId);
      toast.success('Internship record hidden from Company history.');
      navigate('/employer/internship-history');
    } catch (reason: unknown) {
      toast.error(getErrorMessage(reason, 'Failed to hide internship record.'));
      setDeleting(false);
    }
  };

  const status = details.status.assignmentStatus;
  const statusLabel = assignmentStatusLabel(status);
  const statusClass = ['complete_company', 'complete_student'].includes(status) ? 'completed' : status;
  const hasEnded = !['pending', 'ongoing'].includes(status);
  const outcomeRemark = resolveOutcomeRemark(details);

  const internFields: DetailField[] = [
    ['Full Name', displayValue(details.intern.studentFullName)],
    ['Program / Strand', displayValue(details.intern.strandProgram)],
    ['Year Level', displayValue(details.intern.yearLevel)],
    ['School', displayValue(details.intern.schoolName)],
  ];

  const assignmentFields: DetailField[] = [
    ['Company', displayValue(details.assignment.companyName)],
    ['Job Title', displayValue(details.assignment.jobTitle)],
    ['Required Hours', formatDetailMinutes(details.assignment.requiredMinutes)],
  ];

  const scheduleFields: DetailField[] = [
    ['Working Days', displayValue(formatWorkingDays(details.assignment.workingDays))],
    ['Start Date', formatAssignmentDate(details.assignment.startDate)],
    [hasEnded ? 'End Date' : 'Expected End Date', formatAssignmentDate(hasEnded ? (details.assignment.endDate ?? details.assignment.endedAt) : details.assignment.expectedEndDate)],
    ['Shift Start', formatClockTime(details.assignment.startShift)],
    ['Shift End', formatClockTime(details.assignment.endShift)],
  ];

  const statusFields: DetailField[] = [
    ['Status', statusLabel],
    ['Rendered Hours', formatDetailMinutes(details.status.renderedMinutes)],
    ['Remaining Hours', formatDetailMinutes(details.status.remainingMinutes)],
  ];

  return (
    <main className={styles.page}>
      <div className={styles.wrap}>
        <button type="button" className={styles.backButton} onClick={() => navigate('/employer/internship-history')}>
          <ArrowLeft size={19} />Back to Internship History
        </button>

        <section className={`${detailStyles.detailsShell} ${styles.detailsShell}`} aria-labelledby="company-history-title">
          <header className={detailStyles.pageHeading}>
            <div>
              <h1 id="company-history-title">Internship Details</h1>
              <p>View the intern's assignment, approved schedule, progress, and outcome.</p>
            </div>
            <span className={`${detailStyles.statusTag} ${detailStyles[statusClass] ?? ''}`}>{statusLabel}</span>
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
              {outcomeRemark && (
                <section className={detailStyles.infoCard} aria-labelledby="company-history-remark-heading">
                  <h2 className={detailStyles.sectionTitle} id="company-history-remark-heading">
                    <span>{outcomeRemark.icon}</span>
                    {outcomeRemark.title}
                  </h2>
                  <p className={detailStyles.outcomeRemark}>{outcomeRemark.remark}</p>
                </section>
              )}
            </div>
          </div>
        </section>

        <button type="button" className={studentPageStyles.attendanceButton} onClick={() => navigate(`/employer/attendance/${assignmentId}`, { state: { attendanceHistoryBackPath: `/employer/internship-history/${assignmentId}` } })}>
          View Attendance History
        </button>

        {details.status.canDelete && (
          <footer className={styles.companyActions}>
            <button type="button" className={styles.deleteRecordButton} onClick={() => setShowDelete(true)}>
              Delete
            </button>
          </footer>
        )}

        {showDelete && (
          <ConfirmDeleteModal
            subject={`${details.intern.studentFullName}'s finalized internship record`}
            isDeleting={deleting}
            onClose={() => setShowDelete(false)}
            onConfirm={() => void deleteRecord()}
          />
        )}
      </div>
    </main>
  );
}

function DetailSection({ icon, title, fields }: { icon: ReactNode; title: string; fields: DetailField[] }) {
  const headingId = `company-history-${title.toLowerCase().replaceAll(' ', '-')}-heading`;
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

function resolveOutcomeRemark(details: EmployerInternshipDetailDto): OutcomeRemark | null {
  const { assignmentStatus } = details.status;
  const { studentWithdrawalRemark, companyCancellationRemark, companyCompletionRemark } = details.remarks;

  if (assignmentStatus === 'withdrawn' || (assignmentStatus === 'finalized' && studentWithdrawalRemark)) {
    return {
      title: 'Internship Withdrawal Remark',
      remark: studentWithdrawalRemark || 'No withdrawal remark was provided.',
      icon: <User size={18} />,
    };
  }
  if (assignmentStatus === 'cancelled' || (assignmentStatus === 'finalized' && companyCancellationRemark)) {
    return {
      title: 'Internship Cancellation Remark',
      remark: companyCancellationRemark || 'No cancellation remark was provided.',
      icon: <Building2 size={18} />,
    };
  }
  if (['complete_company', 'complete_student'].includes(assignmentStatus) || (assignmentStatus === 'finalized' && companyCompletionRemark)) {
    return {
      title: 'Internship Completion Remark',
      remark: companyCompletionRemark || 'No completion remark was provided.',
      icon: <ChartNoAxesColumnIncreasing size={18} />,
    };
  }
  return null;
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
