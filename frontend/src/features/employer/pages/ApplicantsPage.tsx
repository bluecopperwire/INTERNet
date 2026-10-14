import { useState, useEffect, useMemo } from 'react'
import { Search, SlidersHorizontal, Eye, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { EmployerHero } from '../components/EmployerHero'
import { DataTable, TABLE_COLUMN_WIDTHS, type DataTableColumn } from '../../../components/DataTable'
import { StatusBadge, TableActions, TableCellStack } from '../../../components/TablePrimitives'
import { employerService } from '../services/employer.service'
import type { Applicant } from '../types/employer.types'
import styles from './ApplicantsPage.module.css'
import { ConfirmDeleteModal } from '../../../components/feedback/ConfirmDeleteModal'
import { TablePagination } from '../../../components/TablePagination'
import { useToastStore } from '../../../stores/useToastStore'
import { getErrorMessage } from '../../../utils/error-message'
import { openReferralForReview } from '../services/employer-review-flow'
import {
  REFERRAL_CLOSED_STATUSES,
  REFERRAL_HISTORY_STATUSES,
  REFERRAL_ONGOING_STATUSES,
} from '../../workflow/status-mappings'

export function ApplicantsPage() {
  const navigate = useNavigate()
  const [applicants, setApplicants] = useState<Applicant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const toast = useToastStore()

  // Pagination & Filtering state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)
  const [searchQuery, setSearchQuery] = useState('')
  
  const [statusFilter, setStatusFilter] = useState('All')

  useEffect(() => {
    employerService.getAllApplicants().then((data) => {
      setApplicants(data)
      setIsLoading(false)
    })
  }, [])

  // Extract unique values for filter dropdowns
  const uniqueStatuses = ['All', 'For Review', 'Under Review', 'For Interview']

  const reviewSummary = useMemo(() => ({
    forReview: applicants.filter((app) => app.reviewStatus === 'For Review').length,
    underReview: applicants.filter((app) => app.reviewStatus === 'Under Review').length,
    forInterview: applicants.filter((app) => app.reviewStatus === 'For Interview').length,
  }), [applicants])

  const filteredApplicants = useMemo(() => {
    return applicants.filter((app) => {
      let matches = true

      if (searchQuery) {
        matches = matches && `${app.name} ${app.opportunityTitle} ${app.course}`.toLowerCase().includes(searchQuery.toLowerCase())
      }
      if (statusFilter !== 'All') {
        matches = matches && app.reviewStatus === statusFilter
      }
      return matches
    })
  }, [applicants, searchQuery, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredApplicants.length / itemsPerPage))
  
  // Ensure current page is valid when filtering changes total pages
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1)
    }
  }, [totalPages, currentPage])

  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredApplicants.slice(indexOfFirstItem, indexOfLastItem)

  const handleOpenReferral = async (referral: Applicant) => {
    await openReferralForReview(referral, {
      markUnderReview: employerService.markApplicantUnderReview,
      navigate,
      onMutationError: (error) => toast.error(getErrorMessage(error, 'Failed to start referral review.')),
    })
  }

  const columns: DataTableColumn<Applicant>[] = [
    { key: 'applicant', header: 'Applicant', minWidth: TABLE_COLUMN_WIDTHS.identity, render: (app) => <TableCellStack primary={app.name} secondary={app.accountCode} code /> },
    { key: 'academic', header: 'Academic Information', minWidth: TABLE_COLUMN_WIDTHS.academic, render: (app) => <TableCellStack primary={app.school} secondary={app.course} truncateSecondary /> },
    { key: 'opportunity', header: 'Opportunity', minWidth: TABLE_COLUMN_WIDTHS.opportunity, render: (app) => app.opportunityTitle },
    { key: 'timeline', header: 'Timeline', minWidth: TABLE_COLUMN_WIDTHS.timeline, noWrap: true, render: (app) => <TableCellStack primary={`Applied: ${app.applicationDate || '—'}`} secondary={`Referred: ${app.referralDate || '—'}`} /> },
    { key: 'status', header: 'Status', width: TABLE_COLUMN_WIDTHS.status, align: 'center', render: (app) => <StatusBadge value={app.reviewStatus} /> },
    { key: 'actions', header: 'Actions', width: TABLE_COLUMN_WIDTHS.actions, align: 'center', headerAlign: 'center', render: (app) => <TableActions><button className={styles.reviewBtn} type="button" onClick={() => void handleOpenReferral(app)} aria-label={`Review ${app.name}'s referral`}><Eye size={16} aria-hidden="true" /><span>Review</span></button></TableActions> },
  ]

  return (
    <main className={styles.pageContainer}>
      <EmployerHero
        title="Review Referrals"
        subtitle="Review student referrals endorsed to your company."
        comfortableSpacing
      />

      <section className={styles.mainContent}>
        <SummaryCards items={[
          ['For Review Referrals', reviewSummary.forReview],
          ['Under Review Referrals', reviewSummary.underReview],
          ['For Interview Referrals', reviewSummary.forInterview],
        ]} />

        <div className={styles.toolbar}>
          <div className={styles.searchBox}>
            <Search size={18} color="#160e6f" />
            <input 
              type="text" 
              placeholder="Search referrals..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
            />
          </div>
          <div className={styles.statusFilter}>
            <SlidersHorizontal size={18} aria-hidden="true" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter referrals by status">
              {uniqueStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </div>
        </div>

        <DataTable ariaLabel="Referrals awaiting company review" columns={columns} rows={currentItems} rowKey={(app) => app.id} minWidth={1420} loading={isLoading} emptyMessage="No referrals are awaiting review." filteredEmptyMessage="No referrals match the selected filters." hasActiveFilters={Boolean(searchQuery.trim()) || statusFilter !== 'All'} footer={<TablePagination page={currentPage} pageSize={itemsPerPage} totalRecords={filteredApplicants.length} onPageChange={setCurrentPage} onPageSizeChange={(value) => { setItemsPerPage(value); setCurrentPage(1) }} />} />
      </section>
    </main>
  )
}

export function ReferralsHistoryPage() {
  const navigate = useNavigate()
  const toast = useToastStore()
  const [referrals, setReferrals] = useState<Applicant[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('All')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(5)
  const [deleteTarget, setDeleteTarget] = useState<Applicant | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    employerService.getReferralHistory().then(setReferrals)
  }, [])

  const historySummary = useMemo(() => ({
    total: referrals.length,
    active: referrals.filter((referral) =>
      REFERRAL_ONGOING_STATUSES.includes(
        referral.historyStatus ?? 'For Review (Employer)',
      ),
    ).length,
    closed: referrals.filter((referral) =>
      REFERRAL_CLOSED_STATUSES.includes(
        referral.historyStatus ?? 'For Review (Employer)',
      ),
    ).length,
  }), [referrals])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return referrals.filter((referral) => {
      const matchesSearch = !query ||
        `${referral.name} ${referral.opportunityTitle} ${referral.course} ${referral.historyStatus}`
          .toLowerCase().includes(query)
      const matchesStatus = status === 'All' ||
        (status === 'Active' && REFERRAL_ONGOING_STATUSES.includes(referral.historyStatus ?? 'For Review (Employer)')) ||
        (status === 'Closed' && REFERRAL_CLOSED_STATUSES.includes(referral.historyStatus ?? 'For Review (Employer)')) ||
        referral.historyStatus === status
      return matchesSearch && matchesStatus
    })
  }, [referrals, search, status])

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const rows = filtered.slice((page - 1) * perPage, page * perPage)

  useEffect(() => {
    if (page > totalPages) setPage(1)
  }, [page, totalPages])

  const deleteReferral = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await employerService.deleteReferral(deleteTarget.id)
      setReferrals((current) => current.filter((item) => item.id !== deleteTarget.id))
      setDeleteTarget(null)
      toast.success('Referral deleted.')
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to delete referral.'))
    } finally {
      setIsDeleting(false)
    }
  }
  const columns: DataTableColumn<Applicant>[] = [
    { key: 'applicant', header: 'Applicant', minWidth: TABLE_COLUMN_WIDTHS.identity, render: (referral) => <TableCellStack primary={referral.name} secondary={referral.accountCode} code /> },
    { key: 'academic', header: 'Academic Information', minWidth: TABLE_COLUMN_WIDTHS.academic, render: (referral) => <TableCellStack primary={referral.school} secondary={referral.course} truncateSecondary /> },
    { key: 'opportunity', header: 'Opportunity', minWidth: TABLE_COLUMN_WIDTHS.opportunity, render: (referral) => referral.opportunityTitle },
    { key: 'timeline', header: 'Timeline', minWidth: TABLE_COLUMN_WIDTHS.timeline, noWrap: true, render: (referral) => <TableCellStack primary={`Applied: ${referral.applicationDate || '—'}`} secondary={`Referred: ${referral.referralDate || '—'}`} /> },
    { key: 'status', header: 'Status', width: TABLE_COLUMN_WIDTHS.status, align: 'center', render: (referral) => <StatusBadge value={referral.historyStatus} /> },
    { key: 'actions', header: 'Actions', width: TABLE_COLUMN_WIDTHS.actions, align: 'center', headerAlign: 'center', render: (referral) => <TableActions><button className={styles.reviewBtn} type="button" onClick={() => navigate(`/employer/referrals-history/${referral.id}`)} aria-label={`View ${referral.name}'s referral`}><Eye size={16} aria-hidden="true" />View</button>{referral.canHide && <button className={styles.deleteBtn} type="button" onClick={() => setDeleteTarget(referral)} aria-label={`Delete ${referral.name}'s referral`}><Trash2 size={16} aria-hidden="true" />Delete</button>}</TableActions> },
  ]

  return <main className={styles.pageContainer}>
    <EmployerHero title="Referrals History" subtitle="View the complete lifecycle of every referral sent to your company." comfortableSpacing />
    <section className={styles.mainContent}>
      <SummaryCards items={[
        ['Total Referrals', historySummary.total],
        ['Active Referrals', historySummary.active],
        ['Closed Referrals', historySummary.closed],
      ]} />

      <div className={styles.toolbar}>
        <div className={styles.searchBox}><Search size={18} color="#160e6f" /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Search referrals..." /></div>
        <div className={styles.statusFilter}><SlidersHorizontal size={18} /><select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }} aria-label="Filter referral history by status"><option value="All">All</option><option>Active</option><option>Closed</option>{REFERRAL_HISTORY_STATUSES.map((value) => <option key={value}>{value}</option>)}</select></div>
      </div>
      <DataTable ariaLabel="Referral history" columns={columns} rows={rows} rowKey={(referral) => referral.id} minWidth={1420} emptyMessage="No referral history is available yet." filteredEmptyMessage="No referrals match the selected filters." hasActiveFilters={Boolean(search.trim()) || status !== 'All'} footer={<TablePagination page={page} pageSize={perPage} totalRecords={filtered.length} onPageChange={setPage} onPageSizeChange={(value) => { setPerPage(value); setPage(1) }} />} />
    </section>
    {deleteTarget && <ConfirmDeleteModal subject={`${deleteTarget.name}'s referral`} isDeleting={isDeleting} onClose={() => setDeleteTarget(null)} onConfirm={() => void deleteReferral()} />}
  </main>
}

function SummaryCards({ items }: { items: Array<[string, number]> }) {
  return <div className={styles.summaryGrid}>
    {items.map(([label, value]) => <article className={styles.summaryCard} key={label}>
      <h2>{label}</h2>
      <p>{String(value).padStart(2, '0')}</p>
    </article>)}
  </div>
}

export default ApplicantsPage
