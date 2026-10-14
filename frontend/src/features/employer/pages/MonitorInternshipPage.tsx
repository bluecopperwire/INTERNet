import { Eye, Search, SlidersHorizontal } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type {
  EmployerInternshipListItemDto,
  EmployerManageInternshipSummaryDto,
  PageMeta,
} from '../../../types/api';
import { getErrorMessage } from '../../../utils/error-message';
import { formatTableDate } from '../../../utils/date-only';
import { EmployerHero } from '../components/EmployerHero';
import { employerApiService } from '../services/employer-api.service';
import { COMPANY_PAGE_SIZES, formatMinutes } from '../utils/internship-workflow';
import { TablePagination } from '../../../components/TablePagination';
import { DataTable, TABLE_COLUMN_WIDTHS, type DataTableColumn } from '../../../components/DataTable';
import { StatusBadge, TableActions, TableCellStack } from '../../../components/TablePrimitives';
import styles from './MonitorInternshipPage.module.css';

const EMPTY_META: PageMeta = { page: 1, limit: 5, total: 0, totalPages: 0 };

export function MonitorInternshipPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<EmployerInternshipListItemDto[]>([]);
  const [summary, setSummary] = useState<EmployerManageInternshipSummaryDto>({
    activeInternships: 0,
    pendingInternships: 0,
    ongoingInternships: 0,
    awaitingCompletion: 0,
  });
  const [meta, setMeta] = useState<PageMeta>(EMPTY_META);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([
      employerApiService.getInternshipSummary(),
      employerApiService.getInternships({
        page,
        limit,
        search: search.trim() || undefined,
        status: status || undefined,
      }),
    ])
      .then(([nextSummary, result]) => {
        if (!active) return;
        setSummary(nextSummary);
        setRows(result.data);
        setMeta(result.meta);
      })
      .catch((reason: unknown) => {
        if (active) setError(getErrorMessage(reason, 'Unable to load active internships.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [limit, page, search, status]);

  const resetPage = () => setPage(1);
  const beginReload = () => { setLoading(true); setError(''); };
  const columns: DataTableColumn<EmployerInternshipListItemDto>[] = [
    { key: 'intern', header: 'Intern', minWidth: TABLE_COLUMN_WIDTHS.identity, render: (internship) => <TableCellStack primary={internship.studentFullName} secondary={internship.studentAccountCode} code /> },
    { key: 'opportunity', header: 'Opportunity', minWidth: TABLE_COLUMN_WIDTHS.placement, render: (internship) => internship.jobTitle },
    { key: 'progress', header: 'Progress', minWidth: TABLE_COLUMN_WIDTHS.progress, noWrap: true, render: (internship) => <TableCellStack primary={`${formatMinutes(internship.renderedMinutes)} rendered`} secondary={`${formatMinutes(internship.requiredMinutes)} required`} tertiary={`${formatMinutes(internship.remainingMinutes)} remaining`} /> },
    { key: 'period', header: 'Period', minWidth: TABLE_COLUMN_WIDTHS.period, noWrap: true, render: (internship) => <TableCellStack primary={`Start: ${formatPeriodDate(internship.startDate)}`} secondary={`End: ${formatPeriodDate(internship.endDate || internship.expectedEndDate)}`} /> },
    { key: 'status', header: 'Status', width: TABLE_COLUMN_WIDTHS.status, align: 'center', render: (internship) => <StatusBadge value={internship.displayStatus} /> },
    { key: 'actions', header: 'Actions', width: TABLE_COLUMN_WIDTHS.actions, align: 'center', headerAlign: 'center', render: (internship) => <TableActions><button type="button" className={styles.viewButton} onClick={() => navigate(`/employer/manage-internship/${internship.internshipAssignmentId}`)} aria-label={`View ${internship.studentFullName}'s internship`}><Eye size={16} aria-hidden="true" />View</button></TableActions> },
  ];

  return <main className={styles.page}>
    <EmployerHero title="Manage Internship" subtitle="Manage operationally active internship assignments" comfortableSpacing />
    <section className={styles.content}>
      <div className={styles.summaryGrid}>
        <SummaryCard label="Active Internships" value={summary.activeInternships} />
        <SummaryCard label="Pending Internships" value={summary.pendingInternships} />
        <SummaryCard label="Ongoing Internships" value={summary.ongoingInternships} />
        <SummaryCard label="Awaiting Completion" value={summary.awaitingCompletion} />
      </div>

      <div className={styles.toolbar}>
        <label className={styles.searchBox}><Search size={17} /><span className={styles.srOnly}>Search internships</span><input value={search} onChange={(event) => { beginReload(); setSearch(event.target.value); resetPage(); }} placeholder="Search student or job title..." /></label>
        <label className={styles.statusFilter}><SlidersHorizontal size={16} /><span className={styles.srOnly}>Filter internship status</span><select value={status} onChange={(event) => { beginReload(); setStatus(event.target.value); resetPage(); }}><option value="">All</option><option value="pending">Pending</option><option value="ongoing">Ongoing</option><option value="awaiting_completion">Awaiting Completion</option></select></label>
      </div>

      <DataTable ariaLabel="Active internship assignments" columns={columns} rows={rows} rowKey={(internship) => internship.internshipAssignmentId} minWidth={1440} loading={loading} error={error} emptyMessage="There are currently no internships to manage." filteredEmptyMessage="No internships match the selected filters." hasActiveFilters={Boolean(search.trim()) || Boolean(status)} footer={<TablePagination page={page} pageSize={limit} totalRecords={meta.total} pageSizes={COMPANY_PAGE_SIZES} onPageChange={(value) => { beginReload(); setPage(value); }} onPageSizeChange={(value) => { beginReload(); setLimit(value); resetPage(); }} />} />
    </section>
  </main>;
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return <article className={styles.summaryCard}><h2>{label}</h2><p>{String(value).padStart(2, '0')}</p></article>;
}

function formatPeriodDate(value?: string | null) {
  return formatTableDate(value) || '—';
}
