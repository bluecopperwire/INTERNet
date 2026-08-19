import React from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  ShieldCheck, 
  Activity, 
  HardDrive, 
  Users, 
  ChevronRight,
  Database,
  RefreshCw
} from 'lucide-react'
import headerImage from '../../../assets/requirements-header-image.png'
import peopleIcon from '../../../assets/people.svg'
import suitcaseIcon from '../../../assets/suitcase.svg'
import styles from './AdminDashboardPage.module.css'
import { useAdminDashboard } from '../hooks/useAdminDashboard'

export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate()
  const { 
    summary, 
    recentLogs, 
    isLoading, 
    isBackingUp, 
    triggerBackup 
  } = useAdminDashboard()

  if (isLoading || !summary) {
    return <div className={styles.loading}>Loading Super Admin Dashboard...</div>
  }

  const formatLogTimestamp = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <main className={styles.pageContainer}>
      <header className={styles.heroHeader}>
        <div className={styles.heroBgWrapper}>
          <img src={headerImage} alt="" className={styles.heroBgImage} />
          <div className={styles.heroOverlay} />
        </div>

        <div className={styles.heroContent}>
          <div className={styles.superBadge}>
            <ShieldCheck size={16} />
            <span>Super Administrator Control Center</span>
          </div>
          <h1 className={styles.heroTitle}>Main Dashboard</h1>
          <p className={styles.heroSubtitle}>QCPESO Information Summary & System Status</p>
        </div>
      </header>

      <section className={styles.mainContent}>
        {/* Metric Summary Quad */}
        <div className={styles.summaryGrid}>
          <div className={`${styles.summaryCard} ${styles.cardBlue}`}>
            <h3 className={styles.cardTitle}>Total Students</h3>
            <p className={styles.cardValue}>{summary.totalStudents}</p>
            <img className={`${styles.summaryIcon} ${styles.peopleIcon}`} src={peopleIcon} alt="" />
          </div>

          <div className={`${styles.summaryCard} ${styles.cardGradient}`}>
            <h3 className={styles.cardTitleDark}>Active Students</h3>
            <p className={styles.cardValueDark}>{summary.activeStudents}</p>
            <img className={`${styles.summaryIcon} ${styles.peopleIcon}`} src={peopleIcon} alt="" />
          </div>

          <div className={`${styles.summaryCard} ${styles.cardGradient}`}>
            <h3 className={styles.cardTitleDark}>Total Employers</h3>
            <p className={styles.cardValueDark}>{summary.totalEmployers}</p>
            <img className={`${styles.summaryIcon} ${styles.suitcaseIcon}`} src={suitcaseIcon} alt="" />
          </div>

          <div className={`${styles.summaryCard} ${styles.cardBlue}`}>
            <h3 className={styles.cardTitle}>Total Available Opportunities</h3>
            <p className={styles.cardValue}>{summary.totalAvailableOpportunities}</p>
            <img className={`${styles.summaryIcon} ${styles.suitcaseIcon}`} src={suitcaseIcon} alt="" />
          </div>
        </div>

        {/* Super Admin Health & Quick Oversight Section */}
        <div className={styles.systemHealthBar}>
          <div className={styles.healthItem}>
            <span className={styles.healthLabel}>System Status</span>
            <div className={styles.statusIndicator}>
              <span className={styles.statusDotGreen} />
              <strong>{summary.systemHealth.serverStatus} ({summary.systemHealth.uptime})</strong>
            </div>
          </div>

          <div className={styles.healthItem}>
            <span className={styles.healthLabel}>Active Sessions</span>
            <strong>{summary.systemHealth.activeSessions} Users Online</strong>
          </div>

          <div className={styles.healthItem}>
            <span className={styles.healthLabel}>Database Load</span>
            <strong>{summary.systemHealth.databaseLoad}</strong>
          </div>

          <div className={styles.healthItem}>
            <span className={styles.healthLabel}>Automated Backup</span>
            <strong>{summary.systemHealth.lastBackup}</strong>
          </div>
        </div>

        {/* Lower Grid: Audit Trail & Super Admin Quick Actions */}
        <div className={styles.dashboardSplitGrid}>
          {/* Audit Logs Overview */}
          <div className={styles.auditCard}>
            <div className={styles.cardHeaderWithAction}>
              <div className={styles.sectionTitle}>
                <h2 className={styles.sectionHeading}>Recent System Audit Events</h2>
                <p className={styles.sectionSubtext}>Live security events & administrator operations</p>
              </div>
              <button 
                type="button" 
                className={styles.outlineViewAllBtn}
                onClick={() => navigate('/admin/audit-logs')}
              >
                <span>View Full Trail</span>
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            </div>

            <div className={styles.tableCard}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Action</th>
                    <th>Actor</th>
                    <th>Target Module</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLogs.map((log) => (
                    <tr key={log.id}>
                      <td className={styles.timeCell}>{formatLogTimestamp(log.timestamp)}</td>
                      <td>
                        <strong>{log.actionType}</strong>
                        <div className={styles.logSubDesc}>{log.actionPerformed}</div>
                      </td>
                      <td>{log.performedBy}</td>
                      <td>
                        <span className={styles.moduleBadge}>{log.moduleName}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Super Admin Quick Actions */}
          <div className={styles.quickActionsContainer}>
            <div className={styles.quickActionsHeader}>
              <h2 className={styles.sectionHeading}>Super Admin Actions</h2>
              <p className={styles.sectionSubtext}>Immediate administrative operations</p>
            </div>

            <div className={styles.actionsList}>
              <button
                type="button"
                className={styles.actionButton}
                onClick={() => navigate('/admin/manage-students')}
              >
                <Users size={20} />
                <span>Manage Student Records</span>
              </button>

              <button
                type="button"
                className={styles.actionButton}
                onClick={() => navigate('/admin/manage-employers')}
              >
                <Activity size={20} />
                <span>Verify Employer Registrations</span>
              </button>

              <button
                type="button"
                className={styles.actionButton}
                onClick={() => navigate('/admin/audit-logs')}
              >
                <ShieldCheck size={20} />
                <span>Access Security Logs</span>
              </button>

              <button
                type="button"
                className={`${styles.actionButton} ${styles.actionButtonHighlight}`}
                onClick={triggerBackup}
                disabled={isBackingUp}
              >
                {isBackingUp ? (
                  <RefreshCw size={20} className={styles.spinIcon} />
                ) : (
                  <Database size={20} />
                )}
                <span>{isBackingUp ? 'Generating Backup...' : 'Trigger PostgreSQL Backup'}</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

export default AdminDashboardPage
