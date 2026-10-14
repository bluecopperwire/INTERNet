import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { FileSpreadsheet, Filter, Search } from 'lucide-react'
import { Navigate, useParams } from 'react-router-dom'
import { DataTable, type DataTableColumn } from '../../../components/DataTable'
import { PageHero } from '../../../components/PageHero'
import { StatusTransition, TableCellStack } from '../../../components/TablePrimitives'
import { TablePagination } from '../../../components/TablePagination'
import { TableToolbar } from '../../../components/TableToolbar'
import { useToastStore } from '../../../stores/useToastStore'
import { todayDateOnly } from '../../../utils/date-only'
import { adminApiService } from '../services/admin-api.service'
import type {
  AdminAuditLogCategory,
  AdminAuditLogItem,
  AdminAuditLogQuery,
} from '../types/admin.types'
import styles from './AuditLogsPage.module.css'

const PAGE_CONFIG: Record<
  AdminAuditLogCategory,
  { title: string; subtitle: string; filename: string }
> = {
  accounts: {
    title: 'Accounts Audit Logs',
    subtitle: 'Review account creation, suspension, reactivation, and deactivation events.',
    filename: 'accounts-audit-logs.csv',
  },
  'applications-referrals': {
    title: 'Applications and Referrals Audit Logs',
    subtitle: 'Review every recorded application and referral status change.',
    filename: 'applications-referrals-audit-logs.csv',
  },
  internships: {
    title: 'Internships Audit Logs',
    subtitle: 'Review the complete status lifecycle of internship assignments.',
    filename: 'internships-audit-logs.csv',
  },
}

const ACTIONS: Record<AdminAuditLogCategory, Array<[string, string]>> = {
  accounts: [
    ['account_created', 'Account Created'],
    ['account_suspended', 'Account Suspended'],
    ['account_deactivated', 'Account Deactivated'],
    ['account_unsuspended', 'Account Unsuspended'],
  ],
  'applications-referrals': [
    ['application_submitted', 'Application Submitted'],
    ['qc_peso_review_started', 'QC PESO Review Started'],
    ['application_referred_to_employer', 'Application Referred to Employer'],
    ['application_rejected_by_qc_peso', 'Application Rejected by QC PESO'],
    ['employer_review_started', 'Employer Review Started'],
    ['interview_scheduled', 'Interview Scheduled'],
    ['offer_extended_by_employer', 'Offer Extended by Employer'],
    ['referral_rejected_by_employer', 'Referral Rejected by Employer'],
    ['offer_accepted_by_student', 'Offer Accepted by Student'],
    ['offer_declined_by_student', 'Offer Declined by Student'],
    ['application_withdrawn_by_student', 'Application Withdrawn by Student'],
    ['application_or_referral_expired', 'Application or Referral Expired'],
  ],
  internships: [
    ['internship_created', 'Internship Created'],
    ['internship_started', 'Internship Started'],
    ['internship_marked_complete_by_company', 'Internship Marked Complete by Company'],
    ['internship_completion_confirmed_by_student', 'Internship Completion Confirmed by Student'],
    ['internship_withdrawn_by_student', 'Internship Withdrawn by Student'],
    ['internship_cancelled_by_company', 'Internship Cancelled by Company'],
    ['internship_finalized_by_qc_peso', 'Internship Finalized by QC PESO'],
  ],
}

const isCategory = (value?: string): value is AdminAuditLogCategory =>
  value === 'accounts' || value === 'applications-referrals' || value === 'internships'

export function AuditLogsPage() {
  const { category: routeCategory } = useParams<{ category: string }>()
  if (!isCategory(routeCategory)) {
    return <Navigate to="/admin/audit-logs/accounts" replace />
  }
  return <AuditLogsView key={routeCategory} category={routeCategory} />
}

function AuditLogsView({ category }: { category: AdminAuditLogCategory }) {
  const config = PAGE_CONFIG[category]
  const toast = useToastStore()
  const [logs, setLogs] = useState<AdminAuditLogItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<5 | 10 | 15>(5)
  const [searchInput, setSearchInput] = useState('')
  const deferredSearch = useDeferredValue(searchInput.trim())
  const [action, setAction] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState('')
  const [retryKey, setRetryKey] = useState(0)

  const filters = useMemo<Omit<AdminAuditLogQuery, 'page' | 'limit'>>(
    () => ({
      ...(deferredSearch ? { search: deferredSearch } : {}),
      ...(action ? { action } : {}),
      ...(dateFrom ? { dateFrom } : {}),
      ...(dateTo ? { dateTo } : {}),
    }),
    [action, dateFrom, dateTo, deferredSearch],
  )

  useEffect(() => {
    let active = true
    void adminApiService
      .getAuditLogs(category, { ...filters, page, limit: pageSize })
      .then((response) => {
        if (!active) return
        setLogs(response.data)
        setTotal(response.meta.total)
        setError('')
      })
      .catch((requestError: unknown) => {
        if (!active) return
        setLogs([])
        setTotal(0)
        setError(apiMessage(requestError, 'Audit logs could not be loaded.'))
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => {
      active = false
    }
  }, [category, filters, page, pageSize, retryKey])

  const resetPage = () => setPage(1)
  const exportCsv = async () => {
    if (total === 0) {
      toast.info('No audit logs match the current filters.')
      return
    }
    setIsExporting(true)
    try {
      const blob = await adminApiService.exportAuditLogs(category, filters)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = config.filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      toast.success('Audit logs exported to CSV.')
    } catch (requestError) {
      toast.error(apiMessage(requestError, 'Audit logs could not be exported.'))
    } finally {
      setIsExporting(false)
    }
  }

  const columns: DataTableColumn<AdminAuditLogItem>[] = [
    {
      key: 'occurredAt',
      header: 'Date & Time',
      render: (log) => {
        const timestamp = formatTimestamp(log.occurredAt)
        return <TableCellStack primary={timestamp.date} secondary={timestamp.time} />
      },
    },
    { key: 'action', header: 'Action', render: (log) => log.action },
    { key: 'entity', header: 'Entity', render: (log) => <TableCellStack primary={log.entityEmail} secondary={log.entityCode} code /> },
    { key: 'status', header: 'Status Change', align: 'center', render: (log) => <StatusTransition previous={log.previousStatus} next={log.newStatus} /> },
    { key: 'actor', header: 'Actor', render: (log) => <TableCellStack primary={log.actorEmail} secondary={log.actorCode} code /> },
  ]

  return (
    <main className={styles.pageContainer}>
      <PageHero title={config.title} subtitle={config.subtitle} />

      <div className={styles.mainContent}>
        <div className={styles.topToolbar}>
          <p className={styles.scopeNote}>Times are displayed in Philippine Standard Time.</p>
          <button
            type="button"
            className={styles.exportBtn}
            onClick={() => void exportCsv()}
            disabled={isExporting || isLoading}
          >
            <FileSpreadsheet size={17} aria-hidden="true" />
            {isExporting ? 'Exporting…' : 'Export to CSV'}
          </button>
        </div>

        <TableToolbar className={styles.filterRow} hasActiveFilters={Boolean(searchInput.trim() || action || dateFrom || dateTo)} onClearFilters={() => { setSearchInput(''); setAction(''); setDateFrom(''); setDateTo(''); resetPage() }}>
          <label className={styles.searchBox}>
            <Search size={18} aria-hidden="true" />
            <span className={styles.srOnly}>Search audit logs</span>
            <input
              type="search"
              placeholder="Search entity or actor email/code"
              value={searchInput}
              onChange={(event) => {
                setSearchInput(event.target.value)
                resetPage()
              }}
            />
          </label>

          <label className={styles.actionFilter}>
            <Filter size={18} aria-hidden="true" />
            <span className={styles.srOnly}>Filter by action</span>
            <select
              value={action}
              onChange={(event) => {
                setAction(event.target.value)
                resetPage()
              }}
            >
              <option value="">All Actions</option>
              {ACTIONS[category].map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>

          <div className={styles.dateRangeBox} aria-label="Date range">
            <label>
              <span>From</span>
              <input
                type="date"
                value={dateFrom}
                max={dateTo || todayDateOnly()}
                onChange={(event) => {
                  setDateFrom(event.target.value)
                  resetPage()
                }}
              />
            </label>
            <label>
              <span>To</span>
              <input
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                max={todayDateOnly()}
                onChange={(event) => {
                  setDateTo(event.target.value)
                  resetPage()
                }}
              />
            </label>
          </div>
        </TableToolbar>

        <DataTable
          ariaLabel={`${config.title} records`}
          columns={columns}
          rows={logs}
          rowKey={(log) => log.auditEventId}
          minWidth={1050}
          loading={isLoading}
          error={error}
          onRetry={() => {
            setIsLoading(true)
            setError('')
            setRetryKey((value) => value + 1)
          }}
          emptyMessage="No audit events have been recorded yet."
          filteredEmptyMessage="No audit logs match the current filters."
          hasActiveFilters={Boolean(deferredSearch || action || dateFrom || dateTo)}
          footer={(
            <TablePagination
              page={page}
              pageSize={pageSize}
              totalRecords={total}
              onPageChange={setPage}
              onPageSizeChange={(value) => {
                setPageSize(value as 5 | 10 | 15)
                resetPage()
              }}
            />
          )}
        />
      </div>
    </main>
  )
}

function formatTimestamp(value: string) {
  const date = new Date(value)
  return {
    date: new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date),
    time: new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Manila',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(date),
  }
}

function apiMessage(error: unknown, fallback: string) {
  const candidate = error as { response?: { data?: { message?: string | string[] } } }
  const message = candidate.response?.data?.message
  return Array.isArray(message) ? message.join(', ') : message || fallback
}
