import { Eye, Search, SlidersHorizontal, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConfirmDeleteModal } from '../../../components/feedback/ConfirmDeleteModal';
import { DataTable, TABLE_COLUMN_WIDTHS, type DataTableColumn } from '../../../components/DataTable';
import { StatusBadge, TableActions, TableCellStack } from '../../../components/TablePrimitives';
import { useToastStore } from '../../../stores/useToastStore';
import type {
  EmployerInternshipHistorySummaryDto,
  EmployerInternshipListItemDto,
  PageMeta,
} from '../../../types/api';
import { getErrorMessage } from '../../../utils/error-message';
import { formatTableDate } from '../../../utils/date-only';
import { EmployerHero } from '../components/EmployerHero';
import { employerApiService } from '../services/employer-api.service';
import { assignmentStatusLabel, COMPANY_PAGE_SIZES, formatMinutes } from '../utils/internship-workflow';
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
  const columns: DataTableColumn<EmployerInternshipListItemDto>[] = [
    { key: 'intern', header: 'Intern', minWidth: TABLE_COLUMN_WIDTHS.identity, render: (row) => <TableCellStack primary={row.studentFullName} secondary={row.studentAccountCode} code /> },
    { key: 'opportunity', header: 'Opportunity', minWidth: TABLE_COLUMN_WIDTHS.placement, render: (row) => row.jobTitle },
    { key: 'progress', header: 'Progress', minWidth: TABLE_COLUMN_WIDTHS.progress, noWrap: true, render: (row) => <TableCellStack primary={`${formatMinutes(row.renderedMinutes)} rendered`} secondary={`${formatMinutes(row.requiredMinutes)} required`} tertiary={`${formatMinutes(row.remainingMinutes)} remaining`} /> },
    { key: 'period', header: 'Period', minWidth: TABLE_COLUMN_WIDTHS.period, noWrap: true, render: (row) => <TableCellStack primary={`Start: ${formatPeriodDate(row.startDate)}`} secondary={`End: ${formatPeriodDate(row.endDate || row.expectedEndDate)}`} /> },
    { key: 'status', header: 'Status', width: TABLE_COLUMN_WIDTHS.status, align: 'center', render: (row) => <StatusBadge value={assignmentStatusLabel(row.assignmentStatus)} /> },
    { key: 'actions', header: 'Actions', width: TABLE_COLUMN_WIDTHS.actions, align: 'center', headerAlign: 'center', render: (row) => <TableActions><button type="button" className={styles.viewButton} onClick={() => navigate(`/employer/internship-history/${row.internshipAssignmentId}`)} aria-label={`View ${row.studentFullName}'s internship`}><Eye size={16} aria-hidden="true" />View</button>{row.assignmentStatus === 'finalized' && <button type="button" className={styles.deleteButton} onClick={() => setDeleteTarget(row)} aria-label={`Delete ${row.studentFullName}'s internship`}><Trash2 size={16} aria-hidden="true" />Delete</button>}</TableActions> },
  ];

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
      <DataTable ariaLabel="Internship history" columns={columns} rows={rows} rowKey={(row) => row.internshipAssignmentId} minWidth={1440} loading={loading} error={error} emptyMessage="There are currently no internship records to display." filteredEmptyMessage="No internship records match the selected filters." hasActiveFilters={Boolean(search.trim()) || Boolean(status)} footer={<TablePagination page={page} pageSize={limit} totalRecords={meta.total} pageSizes={COMPANY_PAGE_SIZES} onPageChange={(value) => { beginReload(); setPage(value); }} onPageSizeChange={(value) => { beginReload(); setLimit(value); setPage(1); }} />} />
    </section>
    {deleteTarget && <ConfirmDeleteModal subject={`${deleteTarget.studentFullName}'s finalized internship record`} isDeleting={deleting} onClose={() => { if (!deleting) setDeleteTarget(null); }} onConfirm={deleteFinalizedInternship} />}
  </main>;
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return <article className={styles.summaryCard}><h2>{label}</h2><p>{String(value).padStart(2, '0')}</p></article>;
}

function formatPeriodDate(value?: string | null) {
  return formatTableDate(value) || '—';
}
