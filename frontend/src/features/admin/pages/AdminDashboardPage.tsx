import type { CSSProperties, FC } from 'react'
import { ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PageHero } from '../../../components/PageHero'
import type { AccountStatusSummary } from '../types/admin.types'
import { useAdminDashboard } from '../hooks/useAdminDashboard'
import styles from './AdminDashboardPage.module.css'

interface AccountStatusCardProps {
  title: string
  accounts: AccountStatusSummary
  destination: string
}

const STATUS_COLORS = {
  active: '#16a34a',
  suspended: '#eab308',
  deactivated: '#cc0001',
}

const percentage = (count: number, total: number) => (
  total > 0 ? Math.round((count / total) * 100) : 0
)

const share = (count: number, total: number) => (
  total > 0 ? (count / total) * 100 : 0
)

function AccountStatusCard({ title, accounts, destination }: AccountStatusCardProps) {
  const navigate = useNavigate()
  const activeEnd = share(accounts.active, accounts.total)
  const suspendedEnd = activeEnd + share(accounts.suspended, accounts.total)
  const donutBackground = accounts.total > 0
    ? `conic-gradient(
        ${STATUS_COLORS.active} 0% ${activeEnd}%,
        ${STATUS_COLORS.suspended} ${activeEnd}% ${suspendedEnd}%,
        ${STATUS_COLORS.deactivated} ${suspendedEnd}% 100%
      )`
    : '#e2e8f0'

  const statusRows = [
    { label: 'Active', count: accounts.active, color: STATUS_COLORS.active },
    { label: 'Suspended', count: accounts.suspended, color: STATUS_COLORS.suspended },
    { label: 'Deactivated', count: accounts.deactivated, color: STATUS_COLORS.deactivated },
  ]

  return (
    <article className={styles.statusCard}>
      <h2 className={styles.statusCardTitle}>{title}</h2>
      <div className={styles.statusCardBody}>
        <div
          className={styles.donut}
          style={{ '--donut-background': donutBackground } as CSSProperties}
          role="img"
          aria-label={`${title}: ${accounts.active} active, ${accounts.suspended} suspended, ${accounts.deactivated} deactivated`}
        >
          <span className={styles.donutHole} aria-hidden="true" />
        </div>

        <div className={styles.statusLegend}>
          {statusRows.map((status) => (
            <div className={styles.legendRow} key={status.label}>
              <span className={styles.legendBox} style={{ backgroundColor: status.color }} />
              <div className={styles.legendText}>
                <strong>{percentage(status.count, accounts.total)}%</strong>
                <span>{status.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        className={styles.viewAccountsButton}
        onClick={() => navigate(destination)}
      >
        <span>View All Accounts</span>
        <ArrowRight size={18} aria-hidden="true" />
      </button>
    </article>
  )
}

export const AdminDashboardPage: FC = () => {
  const { summary, isLoading, error, refetch } = useAdminDashboard()
  const formatNumber = (value: number) => String(value).padStart(2, '0')

  if (isLoading) {
    return <div className={styles.loading}>Loading Admin Dashboard...</div>
  }

  if (error || !summary) {
    return (
      <div className={styles.loading} role="alert">
        <p>{error ?? 'Dashboard data is unavailable.'}</p>
        <button type="button" className={styles.retryButton} onClick={() => void refetch()}>
          Try Again
        </button>
      </div>
    )
  }

  const summaryCards = [
    ['Total Accounts', summary.totalAccounts],
    ['Student Accounts', summary.studentAccounts.total],
    ['QC PESO Accounts', summary.pesoAccounts.total],
    ['Employer Accounts', summary.employerAccounts.total],
  ] as const

  return (
    <main className={styles.pageContainer}>
      <PageHero title="Main Dashboard" subtitle="QCPESO Information Summary & System Status" />

      <section className={styles.mainContent}>
        <div className={styles.summaryGrid}>
          {summaryCards.map(([label, value]) => (
            <article className={styles.summaryCard} key={label}>
              <h2 className={styles.cardTitle}>{label}</h2>
              <span className={styles.cardValue}>{formatNumber(value)}</span>
            </article>
          ))}
        </div>

        <div className={styles.statusGrid}>
          <AccountStatusCard
            title="Student Account Status"
            accounts={summary.studentAccounts}
            destination="/admin/manage-students"
          />
          <AccountStatusCard
            title="QC PESO Account Status"
            accounts={summary.pesoAccounts}
            destination="/admin/manage-qcpeso"
          />
          <AccountStatusCard
            title="Employer Account Status"
            accounts={summary.employerAccounts}
            destination="/admin/manage-employers"
          />
        </div>
      </section>
    </main>
  )
}

export default AdminDashboardPage
