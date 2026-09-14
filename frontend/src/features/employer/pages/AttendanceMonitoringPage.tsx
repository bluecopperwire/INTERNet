import { CalendarDays, Eye, Search, SlidersHorizontal } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { EmployerAttendanceItemDto, EmployerAttendanceSummaryDto, PageMeta } from '../../../types/api';
import { todayDateOnly } from '../../../utils/date-only';
import { getErrorMessage } from '../../../utils/error-message';
import { EmployerHero } from '../components/EmployerHero';
import { employerApiService } from '../services/employer-api.service';
import { ATTENDANCE_MONITOR_COLUMNS, attendanceStatusLabel, COMPANY_PAGE_SIZES } from '../utils/internship-workflow';
import { TablePagination } from '../../../components/TablePagination';
import styles from './AttendanceMonitoringPage.module.css';

export function AttendanceMonitoringPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<EmployerAttendanceItemDto[]>([]);
  const [summary, setSummary] = useState<EmployerAttendanceSummaryDto>({ ongoingInterns: 0, presentInterns: 0, absentInterns: 0 });
  const [meta, setMeta] = useState<PageMeta>({ page: 1, limit: 5, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [date, setDate] = useState(todayDateOnly);
  const [limit, setLimit] = useState(5);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([
      employerApiService.getAttendanceSummary({ date }),
      employerApiService.getAttendance({ page, limit, date, search: search.trim() || undefined, status: status || undefined }),
    ]).then(([nextSummary, result]) => {
      if (!active) return;
      setSummary(nextSummary);
      setRows(result.data);
      setMeta(result.meta);
    }).catch((reason: unknown) => {
      if (active) setError(getErrorMessage(reason, 'Unable to load attendance monitoring.'));
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [date, limit, page, search, status]);

  const resetPage = () => setPage(1);
  const beginReload = () => { setLoading(true); setError(''); };

  return <main className={styles.pageContainer}>
    <EmployerHero title="Monitor Attendance" subtitle="Review scheduled interns for a selected date" comfortableSpacing />
    <section className={styles.mainContent}>
      <div className={`${styles.summaryGrid} ${styles.threeCards}`}>
        <SummaryCard label="Ongoing Interns" value={summary.ongoingInterns} />
        <SummaryCard label="Present Interns" value={summary.presentInterns} />
        <SummaryCard label="Absent Interns" value={summary.absentInterns} />
      </div>
      <div className={styles.toolbar}>
        <label className={styles.searchBox}><Search size={16} /><span className={styles.srOnly}>Search attendance</span><input value={search} onChange={(event) => { beginReload(); setSearch(event.target.value); resetPage(); }} placeholder="Search intern or job title..." /></label>
        <label className={styles.statusFilter}><SlidersHorizontal size={16} /><span className={styles.srOnly}>Filter by status</span><select value={status} onChange={(event) => { beginReload(); setStatus(event.target.value); resetPage(); }}><option value="">All</option><option value="pending">Pending</option><option value="present">Present</option><option value="absent">Absent</option><option value="incomplete">Incomplete</option></select></label>
        <label className={styles.dateFilter}><CalendarDays size={16} /><span className={styles.srOnly}>Selected date</span><input type="date" value={date} max={todayDateOnly()} onChange={(event) => { beginReload(); setDate(event.target.value); resetPage(); }} /></label>
      </div>
      <div className={styles.tableCard}><div className={styles.tableScroller}><table className={styles.table}><thead><tr>{ATTENDANCE_MONITOR_COLUMNS.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.internshipAssignmentId}><td>{row.studentFullName}</td><td>{row.jobTitle}</td><td>{row.strandProgram || 'N/A'}</td><td><span className={`${styles.statusPill} ${styles[row.status] ?? ''}`}>{attendanceStatusLabel(row.status)}</span></td><td><button type="button" className={styles.actionBtn} onClick={() => navigate(`/employer/attendance/${row.internshipAssignmentId}`, { state: { attendanceHistoryBackPath: '/employer/attendance' } })}><Eye size={14} />View</button></td></tr>)}</tbody></table></div>{loading && <p className={styles.noData}>Loading attendance...</p>}{error && <p className={styles.noData} role="alert">{error}</p>}{!loading && !error && rows.length === 0 && <p className={styles.noData}>No interns match the selected date and status.</p>}</div>
      <TablePagination page={page} pageSize={limit} totalRecords={meta.total} pageSizes={COMPANY_PAGE_SIZES} onPageChange={(value) => { beginReload(); setPage(value); }} onPageSizeChange={(value) => { beginReload(); setLimit(value); resetPage(); }} />
    </section>
  </main>;
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return <article className={styles.summaryCard}><h2>{label}</h2><p>{String(value).padStart(2, '0')}</p></article>;
}

export default AttendanceMonitoringPage;
