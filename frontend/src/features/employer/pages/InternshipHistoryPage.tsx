import { ChevronLeft, ChevronRight, Eye, Search, SlidersHorizontal } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type {
  EmployerInternshipHistorySummaryDto,
  EmployerInternshipListItemDto,
  PageMeta,
} from '../../../types/api';
import { getErrorMessage } from '../../../utils/error-message';
import { EmployerHero } from '../components/EmployerHero';
import { employerApiService } from '../services/employer-api.service';
import { assignmentStatusLabel, COMPANY_PAGE_SIZES, INTERNSHIP_HISTORY_COLUMNS } from '../utils/internship-workflow';
import styles from './MonitorInternshipPage.module.css';

export function EmployerInternshipHistoryPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<EmployerInternshipListItemDto[]>([]);
  const [summary, setSummary] = useState<EmployerInternshipHistorySummaryDto>({ totalInternships: 0, activeInternships: 0, closedInternships: 0 });
  const [meta, setMeta] = useState<PageMeta>({ page: 1, limit: 5, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
        <label className={styles.statusFilter}><SlidersHorizontal size={16} /><span className={styles.srOnly}>Filter history status</span><select value={status} onChange={(event) => { beginReload(); setStatus(event.target.value); setPage(1); }}><option value="">All</option><option value="pending">Pending</option><option value="ongoing">Ongoing</option><option value="complete_company">Complete (Company)</option><option value="complete_student">Complete (Student)</option><option value="withdrawn">Withdrawn</option><option value="cancelled">Cancelled</option><option value="finalized">Finalized</option></select></label>
      </div>
      <div className={styles.tableCard}><div className={styles.tableScroller}><table className={styles.table}><thead><tr>{INTERNSHIP_HISTORY_COLUMNS.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.internshipAssignmentId}><td>{row.studentFullName}</td><td>{row.jobTitle}</td><td>{row.strandProgram || 'N/A'}</td><td><span className={`${styles.statusPill} ${styles[row.assignmentStatus.replaceAll('_', '')] ?? ''}`}>{assignmentStatusLabel(row.assignmentStatus)}</span></td><td><button type="button" className={styles.viewButton} onClick={() => navigate(`/employer/internship-history/${row.internshipAssignmentId}`)}><Eye size={16} />View</button></td></tr>)}</tbody></table></div>{loading && <p className={styles.emptyState}>Loading internship history...</p>}{error && <p className={styles.emptyState} role="alert">{error}</p>}{!loading && !error && rows.length === 0 && <div className={styles.emptyState}><strong>No internship history yet</strong><br />There are currently no internship records to display.</div>}</div>
      <div className={styles.paginationRow}><div className={styles.perPage}><span>View</span><span className={styles.selectWrap}><select value={limit} onChange={(event) => { beginReload(); setLimit(Number(event.target.value)); setPage(1); }}>{COMPANY_PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}</select></span><span>Students per page</span></div><div className={styles.pagination}><button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => { beginReload(); setPage((current) => current - 1); }}><ChevronLeft size={18} /></button><button type="button" className={styles.currentPage}>{page}</button><button type="button" aria-label="Next page" disabled={page >= Math.max(meta.totalPages, 1)} onClick={() => { beginReload(); setPage((current) => current + 1); }}><ChevronRight size={18} /></button></div></div>
    </section>
  </main>;
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return <article className={styles.summaryCard}><h2>{label}</h2><p>{String(value).padStart(2, '0')}</p></article>;
}
