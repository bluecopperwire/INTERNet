import { ArrowLeft, Clock3, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { EmployerInternshipDetailDto } from '../../../types/api';
import { ConfirmDeleteModal } from '../../../components/feedback/ConfirmDeleteModal';
import { useToastStore } from '../../../stores/useToastStore';
import { getErrorMessage } from '../../../utils/error-message';
import { employerApiService } from '../services/employer-api.service';
import { assignmentStatusLabel, formatClockTime, formatMinutes, formatWorkingDays } from '../utils/internship-workflow';
import styles from './MonitorInternshipDetailsPage.module.css';

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
  const finalizedRemark = details.remarks.companyCompletionRemark
    ? { label: 'Company Review of the Student', value: details.remarks.companyCompletionRemark }
    : details.remarks.companyCancellationRemark
      ? { label: 'Company Cancellation Remark', value: details.remarks.companyCancellationRemark }
      : details.remarks.studentWithdrawalRemark
        ? { label: 'Student Withdrawal Remark', value: details.remarks.studentWithdrawalRemark }
        : null;
  const remark = status === 'withdrawn'
    ? { label: 'Student Withdrawal Remark', value: details.remarks.studentWithdrawalRemark }
    : status === 'cancelled'
      ? { label: 'Company Cancellation Remark', value: details.remarks.companyCancellationRemark }
      : ['complete_company', 'complete_student'].includes(status)
        ? { label: 'Company Review of the Student', value: details.remarks.companyCompletionRemark }
        : status === 'finalized' ? finalizedRemark : null;

  return <main className={styles.page}><div className={styles.wrap}>
    <button type="button" className={styles.backButton} onClick={() => navigate('/employer/internship-history')}><ArrowLeft size={19} />Back to Internship History</button>
    <section className={styles.studentSummary}><div><h1>{details.assignment.jobTitle} at {details.assignment.companyName}</h1><p>{details.intern.studentFullName} · {details.intern.strandProgram || 'Program / Strand not provided'}</p></div><span className={styles.statusTag}>{assignmentStatusLabel(status)}</span></section>
    <section className={styles.detailCard}><header className={styles.cardHeader}><div><h2>Internship Details</h2><p>Read-only Company internship history record.</p></div></header><div className={styles.formGrid}>
      <ReadField label="Student" value={details.intern.studentFullName} /><ReadField label="Program / Strand" value={details.intern.strandProgram || 'N/A'} /><ReadField label="Job Title" value={details.assignment.jobTitle} /><ReadField label="Working Days" value={formatWorkingDays(details.assignment.workingDays)} /><ReadField label="Start Date" value={details.assignment.startDate} /><ReadField label="Expected End Date" value={details.assignment.expectedEndDate || '-'} /><ReadField label="Actual End" value={details.assignment.endDate || '-'} /><ReadField label="Shift Start" value={formatClockTime(details.assignment.startShift)} /><ReadField label="Shift End" value={formatClockTime(details.assignment.endShift)} /><ReadField label="Required Hours" value={formatMinutes(details.assignment.requiredMinutes)} /><ReadField label="Rendered Hours" value={formatMinutes(details.status.renderedMinutes)} /><ReadField label="Remaining Hours" value={formatMinutes(details.status.remainingMinutes)} />
      {remark && <label className={styles.field}><span>{remark.label}</span><textarea className={styles.readOnlyRemark} value={remark.value || 'No remark recorded.'} readOnly rows={4} /></label>}
    </div></section>
    <section className={styles.statusCard}><header className={styles.statusHeader}><h2>History Actions</h2><p>Attendance remains available while this record is visible to the Company.</p></header><footer className={styles.statusActions}><button type="button" className={styles.completeButton} onClick={() => navigate(`/employer/attendance/${assignmentId}`, { state: { attendanceHistoryBackPath: `/employer/internship-history/${assignmentId}` } })}><Clock3 size={16} /> View Attendance History</button>{details.status.canDelete && <button type="button" className={styles.deleteRecordButton} onClick={() => setShowDelete(true)}><Trash2 size={16} /> Delete</button>}</footer></section>
    {showDelete && <ConfirmDeleteModal subject={`${details.intern.studentFullName}'s finalized internship record`} isDeleting={deleting} onClose={() => setShowDelete(false)} onConfirm={() => void deleteRecord()} />}
  </div></main>;
}

function ReadField({ label, value }: { label: string; value: string }) {
  return <label className={styles.field}><span>{label}</span><input value={value} readOnly /></label>;
}
