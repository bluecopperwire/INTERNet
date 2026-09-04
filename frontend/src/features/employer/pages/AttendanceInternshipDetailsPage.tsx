import { ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { EmployerAttendanceHistoryDto } from '../../../types/api';
import { getErrorMessage } from '../../../utils/error-message';
import { employerApiService } from '../services/employer-api.service';
import { ATTENDANCE_HISTORY_COLUMNS, attendanceStatusLabel, COMPANY_PAGE_SIZES, formatClockTime, formatMinutes } from '../utils/internship-workflow';
import styles from './AttendanceInternshipDetailsPage.module.css';
import controls from './AttendanceMonitoringPage.module.css';

export function AttendanceInternshipDetailsPage() {
  const { applicantId } = useParams<{ applicantId: string }>();
  const assignmentId = Number(applicantId);
  const navigate = useNavigate();
  const [result, setResult] = useState<EmployerAttendanceHistoryDto | null>(null);
  const [status, setStatus] = useState('');
  const [date, setDate] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!Number.isInteger(assignmentId)) return;
    let active = true;
    employerApiService.getAssignmentAttendanceHistory(assignmentId, { page, limit, status: status || undefined, date: date || undefined })
      .then((data) => { if (active) setResult(data); })
      .catch((reason: unknown) => { if (active) setError(getErrorMessage(reason, 'Unable to load attendance history.')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [assignmentId, date, limit, page, status]);

  if (!Number.isInteger(assignmentId)) return <main className={styles.feedback} role="alert">Internship assignment not found.</main>;
  if (!result && loading) return <main className={styles.feedback}>Loading attendance history...</main>;
  if (!result) return <main className={styles.feedback} role="alert">{error || 'Attendance history not found.'}</main>;

  const { header, summary, history } = result;
  return <main className={styles.page}><div className={styles.wrap}>
    <button type="button" className={styles.backButton} onClick={() => navigate('/employer/attendance')}><ArrowLeft size={19} />Back to Monitor Attendance</button>
    <section className={styles.studentSummary}><div><h1>{header.jobTitle} at {header.companyName}</h1><p>{header.studentFullName} · {header.strandProgram || 'Program / Strand not provided'}</p></div></section>
    <div className={controls.summaryGrid}>
      <SummaryCard label="Days Present" value={String(summary.daysPresent)} />
      <SummaryCard label="Days Absent" value={String(summary.daysAbsent)} />
      <SummaryCard label="Rendered Hours" value={formatMinutes(summary.renderedMinutes)} compact />
      <SummaryCard label="Remaining Hours" value={formatMinutes(summary.remainingMinutes)} compact />
    </div>
    <div className={controls.toolbar}>
      <label className={controls.statusFilter}><SlidersHorizontal size={16} /><span className={controls.srOnly}>Attendance status</span><select value={status} onChange={(event) => { setLoading(true); setError(''); setStatus(event.target.value); setPage(1); }}><option value="">All</option><option value="present">Present</option><option value="absent">Absent</option><option value="incomplete">Incomplete</option></select></label>
      <label className={controls.dateFilter}><CalendarDays size={16} /><span className={controls.srOnly}>Attendance date</span><input type="date" value={date} onChange={(event) => { setLoading(true); setError(''); setDate(event.target.value); setPage(1); }} /></label>
    </div>
    <section className={styles.detailCard}><header className={styles.cardHeader}><div><h2>Attendance History</h2><p>Persisted daily attendance records for this internship assignment.</p></div></header><div className={styles.tableScroller}><table className={styles.attendanceTable}><thead><tr>{ATTENDANCE_HISTORY_COLUMNS.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{history.data.map((record) => <tr key={record.attendanceRecordId}><td>{record.date}</td><td>{formatClockTime(record.timeIn)}</td><td>{formatClockTime(record.timeOut)}</td><td>{formatMinutes(record.renderedMinutes)}</td><td><StatusPill value={attendanceStatusLabel(record.attendanceStatus)} /></td></tr>)}</tbody></table></div>{loading && <p className={styles.noRecords}>Loading attendance history...</p>}{error && <p className={styles.noRecords} role="alert">{error}</p>}{!loading && !error && history.data.length === 0 && <p className={styles.noRecords}>No attendance records match the selected filters.</p>}</section>
    <div className={controls.paginationRow}><div className={controls.leftControls}><span>View</span><div className={controls.viewSelectBox}><select value={limit} onChange={(event) => { setLoading(true); setError(''); setLimit(Number(event.target.value)); setPage(1); }}>{COMPANY_PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}</select></div><span>Records per page</span></div><div className={controls.pagination}><button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => { setLoading(true); setError(''); setPage((current) => current - 1); }}><ChevronLeft size={18} /></button><button type="button" className={controls.active}>{page}</button><button type="button" aria-label="Next page" disabled={page >= Math.max(history.meta.totalPages, 1)} onClick={() => { setLoading(true); setError(''); setPage((current) => current + 1); }}><ChevronRight size={18} /></button></div></div>
  </div></main>;
}

function SummaryCard({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return <article className={controls.summaryCard}><h2>{label}</h2><p className={compact ? styles.compactValue : undefined}>{value}</p></article>;
}

function StatusPill({ value }: { value: string }) {
  return <span className={`${styles.statusPill} ${styles[value.toLowerCase()] ?? ''}`}>{value}</span>;
}
