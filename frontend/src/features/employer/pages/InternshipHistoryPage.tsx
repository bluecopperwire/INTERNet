import { Eye, Search, SlidersHorizontal, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConfirmDeleteModal } from '../../../components/feedback/ConfirmDeleteModal';
import { useToastStore } from '../../../stores/useToastStore';
import type {
  EmployerInternshipHistorySummaryDto,
  EmployerInternshipListItemDto,
  PageMeta,
} from '../../../types/api';
import { getErrorMessage } from '../../../utils/error-message';
import { EmployerHero } from '../components/EmployerHero';
import { employerApiService } from '../services/employer-api.service';
import { assignmentStatusLabel, COMPANY_PAGE_SIZES, INTERNSHIP_HISTORY_COLUMNS } from '../utils/internship-workflow';
import { TablePagination } from '../../../components/TablePagination';
import styles from './MonitorInternshipPage.module.css';

export function EmployerInternshipHistoryPage() {
  const navigate = useNavigate();
  const toast = useToastStore();
  const [rows, setRows] = useState<EmployerInternshipListItemDto[]>([]);
  const [summary, setSummary] = useState<EmployerInternshipHistorySummaryDto>({ totalInternships: 0, activeInternships: 0, closedInternships: 0 });
  const [meta, setMeta] = useState<PageMeta>({ page: 1, limit: 5, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<EmployerInternshipListItemDto | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      employerApiService.getInternshipHistorySummary(),
      employerApiService.getInternshipHistory({ page, limit, search: search.trim() || undefined, status: status || undefined }),
    ]).then(([nextSummary, result]) => {
      if (!active) return;
      setSummary(nextSummary);
      setRows(result.data);
      setMeta(result.meta);
    }).catch((reason: unknown) => {
      if (active) setError(getErrorMessage(reason, 'Unable to load internship history.'));
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [limit, page, search, status]);

  const beginReload = () => { setLoading(true); setError(''); };

  const deleteFinalizedInternship = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      await employerApiService.deleteInternship(deleteTarget.internshipAssignmentId);
      setRows((current) => current.filter((row) => row.internshipAssignmentId !== deleteTarget.internshipAssignmentId));
      setMeta((current) => {
        const total = Math.max(0, current.total - 1);
        return { ...current, total, totalPages: total === 0 ? 0 : Math.ceil(total / current.limit) };
      });
      setSummary((current) => ({
        ...current,
        totalInternships: Math.max(0, current.totalInternships - 1),
        closedInternships: Math.max(0, current.closedInternships - 1),
      }));
      if (rows.length === 1 && page > 1) setPage((current) => current - 1);
      toast.success('Internship record hidden from Company history.');
      setDeleteTarget(null);
    } catch (reason: unknown) {
      toast.error(getErrorMessage(reason, 'Failed to hide internship record.'));
    } finally {
      setDeleting(false);
    }
  };

  return <main className={styles.page}>
    <EmployerHero title="Internship History" subtitle="Review current and historical internship assignments" comfortableSpacing />
    <section className={styles.content}>
      <div className={`${styles.summaryGrid} ${styles.historySummaryGrid}`}>
        <SummaryCard label="Total Internships" value={summary.totalInternships} />
        <SummaryCard label="Active Internships" value={summary.activeInternships} />
        <SummaryCard label="Closed Internships" value={summary.closedInternships} />
      </div>
      <div className={styles.toolbar}>
        <label className={styles.searchBox}><Search size={17} /><span className={styles.srOnly}>Search internship history</span><input value={search} onChange={(event) => { beginReload(); setSearch(event.target.value); setPage(1); }} placeholder="Search student or job title..." /></label>
        <label className={styles.statusFilter}><SlidersHorizontal size={16} /><span className={styles.srOnly}>Filter history status</span><select value={status} onChange={(event) => { beginReload(); setStatus(event.target.value); setPage(1); }}><option value="">All</option><option value="active">Active</option><option value="closed">Closed</option><option value="pending">Pending</option><option value="ongoing">Ongoing</option><option value="complete_company">Complete (Company)</option><option value="complete_student">Complete (Student)</option><option value="withdrawn">Withdrawn</option><option value="cancelled">Cancelled</option><option value="finalized">Finalized</option></select></label>
      </div>
      <div className={styles.tableCard}><div className={styles.tableScroller}><table className={styles.table}><thead><tr>{INTERNSHIP_HISTORY_COLUMNS.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.internshipAssignmentId}><td>{row.studentFullName}</td><td>{row.jobTitle}</td><td>{row.strandProgram || 'N/A'}</td><td><span className={`${styles.statusPill} ${styles[row.assignmentStatus.replaceAll('_', '')] ?? ''}`}>{assignmentStatusLabel(row.assignmentStatus)}</span></td><td><div className={styles.rowActions}><button type="button" className={styles.viewButton} onClick={() => navigate(`/employer/internship-history/${row.internshipAssignmentId}`)}><Eye size={16} />View</button>{row.assignmentStatus === 'finalized' && <button type="button" className={styles.deleteButton} onClick={() => setDeleteTarget(row)}><Trash2 size={16} />Delete</button>}</div></td></tr>)}</tbody></table></div>{loading && <p className={styles.emptyState}>Loading internship history...</p>}{error && <p className={styles.emptyState} role="alert">{error}</p>}{!loading && !error && rows.length === 0 && <div className={styles.emptyState}><strong>No internship history yet</strong><br />There are currently no internship records to display.</div>}</div>
      <TablePagination page={page} pageSize={limit} totalRecords={meta.total} pageSizes={COMPANY_PAGE_SIZES} onPageChange={(value) => { beginReload(); setPage(value); }} onPageSizeChange={(value) => { beginReload(); setLimit(value); setPage(1); }} />
    </section>
    {deleteTarget && <ConfirmDeleteModal subject={`${deleteTarget.studentFullName}'s finalized internship record`} isDeleting={deleting} onClose={() => { if (!deleting) setDeleteTarget(null); }} onConfirm={deleteFinalizedInternship} />}
  </main>;
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return <article className={styles.summaryCard}><h2>{label}</h2><p>{String(value).padStart(2, '0')}</p></article>;
}
