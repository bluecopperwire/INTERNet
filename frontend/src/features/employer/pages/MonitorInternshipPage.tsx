import { ChevronLeft, ChevronRight, Eye, Search, SlidersHorizontal } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type {
  EmployerInternshipListItemDto,
  EmployerManageInternshipSummaryDto,
  PageMeta,
} from '../../../types/api';
import { getErrorMessage } from '../../../utils/error-message';
import { EmployerHero } from '../components/EmployerHero';
import { employerApiService } from '../services/employer-api.service';
import { COMPANY_PAGE_SIZES, formatMinutes, MANAGE_INTERNSHIP_COLUMNS } from '../utils/internship-workflow';
import styles from './MonitorInternshipPage.module.css';

const EMPTY_META: PageMeta = { page: 1, limit: 10, total: 0, totalPages: 0 };

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
  const [limit, setLimit] = useState(10);
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

      <div className={styles.tableCard}>
        <div className={styles.tableScroller}>
          <table className={styles.table}><thead><tr>{MANAGE_INTERNSHIP_COLUMNS.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{rows.map((internship) => <tr key={internship.internshipAssignmentId}><td><strong>{internship.studentFullName}</strong></td><td>{internship.jobTitle}</td><td>{internship.strandProgram || 'N/A'}</td><td>{formatMinutes(internship.remainingMinutes)}</td><td><span className={`${styles.statusPill} ${styles[internship.displayStatus.replaceAll(' ', '').toLowerCase()] ?? ''}`}>{internship.displayStatus}</span></td><td><button type="button" className={styles.viewButton} onClick={() => navigate(`/employer/manage-internship/${internship.internshipAssignmentId}`)}><Eye size={16} />View</button></td></tr>)}</tbody></table>
        </div>
        {!loading && !error && rows.length === 0 && <div className={styles.emptyState}><strong>No active internships</strong><br />There are currently no internships to manage.</div>}
        {loading && <p className={styles.emptyState}>Loading active internships...</p>}
        {error && <p className={styles.emptyState} role="alert">{error}</p>}
      </div>

      <div className={styles.paginationRow}>
        <div className={styles.perPage}><span>View</span><span className={styles.selectWrap}><select value={limit} onChange={(event) => { beginReload(); setLimit(Number(event.target.value)); resetPage(); }}>{COMPANY_PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}</select></span><span>Students per page</span></div>
        <div className={styles.pagination}><button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => { beginReload(); setPage((current) => current - 1); }}><ChevronLeft size={18} /></button><button type="button" className={styles.currentPage} aria-current="page">{page}</button><button type="button" aria-label="Next page" disabled={page >= Math.max(meta.totalPages, 1)} onClick={() => { beginReload(); setPage((current) => current + 1); }}><ChevronRight size={18} /></button></div>
      </div>
    </section>
  </main>;
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return <article className={styles.summaryCard}><h2>{label}</h2><p>{String(value).padStart(2, '0')}</p></article>;
}
