import React from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  ArrowRight, 
  ChevronRight,
  Plus, 
  FileText, 
  BriefcaseBusiness,
} from 'lucide-react'
import { PageHero } from '../../../components/PageHero'
import { DataTable, type DataTableColumn } from '../../../components/DataTable'
import { TableCellStack } from '../../../components/TablePrimitives'
import styles from './EmployerDashboardPage.module.css'
import { useEmployerDashboard } from '../hooks/useEmployerDashboard'

export const EmployerDashboardPage: React.FC = () => {
  const navigate = useNavigate()
  const { summary, recentApplicants, isLoading, error, refetch } = useEmployerDashboard()
  const formatNumber = (num: number) => (num < 10 ? `0${num}` : `${num}`)
  const recentColumns: DataTableColumn<(typeof recentApplicants)[number]>[] = [
    { key: 'applicant', header: 'Applicant', render: (app) => <TableCellStack primary={app.name} secondary={app.course} /> },
    { key: 'opportunity', header: 'Opportunity', render: (app) => app.opportunityTitle },
    { key: 'referred', header: 'Referred', render: (app) => app.referralDate },
  ]

  if (isLoading) {
    return <div className={styles.loading}>Loading Dashboard...</div>
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

  return (
    <main className={styles.pageContainer}>
      <PageHero title={`Welcome, ${summary.companyName}!`} subtitle="Company Dashboard" />

      <section className={styles.mainContent}>
        <div className={styles.topSectionGrid}>
          <div className={styles.statsQuad}>
            <div className={styles.blueStatCard}>
              <h3 className={styles.statLabel}>Active Referrals</h3>
              <span className={styles.statNumber}>{formatNumber(summary.activeReferrals)}</span>
            </div>

            <div className={styles.blueStatCard}>
              <h3 className={styles.statLabel}>Active Internships</h3>
              <span className={styles.statNumber}>{formatNumber(summary.activeInternships)}</span>
            </div>

            <div className={styles.blueStatCard}>
              <h3 className={styles.statLabel}>Awaiting Referral Review</h3>
              <span className={styles.statNumber}>{formatNumber(summary.awaitingReview)}</span>
            </div>

            <div className={styles.blueStatCard}>
              <h3 className={styles.statLabel}>Awaiting Internship Completion</h3>
              <span className={styles.statNumber}>{formatNumber(summary.awaitingCompletion)}</span>
            </div>
          </div>

          <div className={styles.statusChartCard}>
              <h3 className={styles.statusCardTitle}>Referral Status</h3>
            
            <div className={styles.chartArea}>
              <div className={styles.donutWrapper}>
                <svg className={styles.donutSvg} viewBox="0 0 36 36">
                  <title>{`Referral history: ${summary.activePercentage}% active, ${summary.closedPercentage}% closed`}</title>
                  <path
                    className={styles.donutTrack}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className={styles.donutSegment}
                    strokeDasharray={`${summary.activePercentage}, 100`}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
              </div>

              <div className={styles.chartLegend}>
                <div className={styles.legendRow}>
                  <span className={`${styles.legendBox} ${styles.boxActive}`} />
                  <div className={styles.legendTexts}>
                    <strong>{summary.activePercentage}%</strong>
                    <span>Active</span>
                  </div>
                </div>

                <div className={styles.legendRow}>
                  <span className={`${styles.legendBox} ${styles.boxClosed}`} />
                  <div className={styles.legendTexts}>
                    <strong>{summary.closedPercentage}%</strong>
                    <span>Closed</span>
                  </div>
                </div>
              </div>
            </div>

            <button 
              type="button" 
              className={styles.viewAllAppsBtn}
              onClick={() => navigate('/employer/referrals-history')}
            >
              <span>View All Referrals</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>

        <div className={styles.bottomSectionGrid}>
          <div className={styles.recentAppsContainer}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitle}>
                <h2 className={styles.sectionHeading}>Recent Referrals</h2>
                <p>Latest referrals awaiting your review</p>
              </div>
              <button 
                type="button" 
                className={styles.outlineViewAllBtn}
                onClick={() => navigate('/employer/applicants')}
              >
                <span>View All</span>
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            </div>

            <DataTable ariaLabel="Recent referrals awaiting review" columns={recentColumns} rows={recentApplicants} rowKey={(app) => app.id} variant="compact" minWidth={620} emptyMessage="No referrals are awaiting review." />
          </div>

          <div className={styles.quickActionsContainer}>
            <div className={styles.sectionTitle}>
              <h2 className={styles.sectionHeading}>Quick Actions</h2>
              <p>Manage opportunities, referrals, and internships</p>
            </div>

            <div className={styles.actionsList}>
              <button
                type="button"
                className={styles.actionButton}
                onClick={() => navigate('/employer/opportunities/create')}
              >
                <Plus size={20} strokeWidth={2.5} />
                <span>Post Opportunity</span>
              </button>

              <button
                type="button"
                className={styles.actionButton}
                onClick={() => navigate('/employer/applicants')}
              >
                <FileText size={20} />
                <span>Review Referrals</span>
              </button>

              <button
                type="button"
                className={styles.actionButton}
                onClick={() => navigate('/employer/manage-internship')}
              >
                <BriefcaseBusiness size={20} />
                <span>Manage Internships</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

export default EmployerDashboardPage
