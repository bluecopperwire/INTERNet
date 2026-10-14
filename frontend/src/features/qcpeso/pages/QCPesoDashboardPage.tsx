import type { FC } from 'react'
import { ArrowRight, BriefcaseBusiness, Building2, ChevronRight, FileText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { DataTable, type DataTableColumn } from '../../../components/DataTable'
import { TableCellStack } from '../../../components/TablePrimitives'
import QCPesoHero from '../components/QCPesoHero'
import styles from '../../employer/pages/EmployerDashboardPage.module.css'
import { useQCPeso } from '../hooks/useQCPeso'

export const QCPesoDashboardPage: FC = () => {
  const { summary, profile, students, isLoading, error, refetch } = useQCPeso()
  const navigate = useNavigate()
  const formatNumber = (value: number) => String(value).padStart(2, '0')
  const firstName = profile?.firstName.trim() || 'User'
  const recentColumns: DataTableColumn<(typeof students)[number]>[] = [
    { key: 'applicant', header: 'Applicant', render: (student) => <TableCellStack primary={student.studentName} /> },
    { key: 'opportunity', header: 'Opportunity', render: (student) => <TableCellStack primary={student.jobTitle} secondary={student.company} /> },
    { key: 'submitted', header: 'Submitted', render: (student) => student.dateApplied },
  ]

  if (isLoading) return <div className={styles.loading}>Loading Dashboard...</div>

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
      <QCPesoHero title={`Welcome, ${firstName}!`} subtitle="QC PESO Dashboard" />

      <section className={styles.mainContent}>
        <div className={styles.topSectionGrid}>
          <div className={styles.statsQuad}>
            <article className={styles.blueStatCard}>
              <h2 className={styles.statLabel}>Active Applications</h2>
              <span className={styles.statNumber}>{formatNumber(summary.activeApplications)}</span>
            </article>

            <article className={styles.blueStatCard}>
              <h2 className={styles.statLabel}>Active Internships</h2>
              <span className={styles.statNumber}>{formatNumber(summary.activeInternships)}</span>
            </article>

            <article className={styles.blueStatCard}>
              <h2 className={styles.statLabel}>Awaiting Application Review</h2>
              <span className={styles.statNumber}>{formatNumber(summary.pendingApplications)}</span>
            </article>

            <article className={styles.blueStatCard}>
              <h2 className={styles.statLabel}>Awaiting Internship Finalization</h2>
              <span className={styles.statNumber}>{formatNumber(summary.awaitingFinalization)}</span>
            </article>
          </div>

          <section className={styles.statusChartCard}>
            <h2 className={styles.statusCardTitle}>Application Status</h2>
            <div className={styles.chartArea}>
              <div className={styles.donutWrapper}>
                <svg className={styles.donutSvg} viewBox="0 0 36 36">
                  <title>{`Application history: ${summary.activePercentage}% active, ${summary.closedPercentage}% closed`}</title>
                  <path className={styles.donutTrack} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className={styles.donutSegment} strokeDasharray={`${summary.activePercentage}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
              </div>

              <div className={styles.chartLegend}>
                <div className={styles.legendRow}>
                  <span className={`${styles.legendBox} ${styles.boxActive}`} />
                  <div className={styles.legendTexts}><strong>{summary.activePercentage}%</strong><span>Active</span></div>
                </div>
                <div className={styles.legendRow}>
                  <span className={`${styles.legendBox} ${styles.boxClosed}`} />
                  <div className={styles.legendTexts}><strong>{summary.closedPercentage}%</strong><span>Closed</span></div>
                </div>
              </div>
            </div>

            <button type="button" className={styles.viewAllAppsBtn} onClick={() => navigate('/qcpeso/manage-applicants/history')}>
              <span>View All Applications</span>
              <ArrowRight size={18} />
            </button>
          </section>
        </div>

        <div className={styles.bottomSectionGrid}>
          <section className={styles.recentAppsContainer}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitle}>
                <h2 className={styles.sectionHeading}>Recent Applications</h2>
                <p>Latest applications awaiting QC PESO review</p>
              </div>
              <button type="button" className={styles.outlineViewAllBtn} onClick={() => navigate('/qcpeso/manage-applicants/review')}>
                <span>View All</span>
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            </div>

            <DataTable ariaLabel="Recent applications awaiting review" columns={recentColumns} rows={students} rowKey={(student) => student.id} variant="compact" minWidth={620} emptyMessage="No applications are awaiting review." />
          </section>

          <section className={styles.quickActionsContainer}>
            <div className={styles.sectionTitle}>
              <h2 className={styles.sectionHeading}>Quick Actions</h2>
              <p>Manage accounts, applicants, and internships</p>
            </div>
            <div className={styles.actionsList}>
              <button type="button" className={styles.actionButton} onClick={() => navigate('/qcpeso/monitor-users/employers/create')}><Building2 size={20} /><span>Create Employer Account</span></button>
              <button type="button" className={styles.actionButton} onClick={() => navigate('/qcpeso/manage-applicants/review')}><FileText size={20} /><span>Review Applications</span></button>
              <button type="button" className={styles.actionButton} onClick={() => navigate('/qcpeso/manage-interns/internships')}><BriefcaseBusiness size={20} /><span>Finalize Internships</span></button>
            </div>
          </section>
        </div>
      </section>
    </main>
  )
}

export default QCPesoDashboardPage
