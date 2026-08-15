import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { 
  Menu, 
  Bell, 
  Check, 
  X, 
  ShieldCheck, 
  Activity, 
  HardDrive, 
  Users, 
  ArrowRight,
  Database,
  RefreshCw
} from 'lucide-react'
import headerImage from '../../../assets/requirements-header-image.png'
import qcLogos from '../../../assets/qc-logos.svg'
import styles from './AdminDashboardPage.module.css'
import { useAdminDashboard } from '../hooks/useAdminDashboard'
import type { AdminLayoutContext } from '../components/AdminLayout'

export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate()
  const { openSidebar } = useOutletContext<AdminLayoutContext>()
  const { 
    summary, 
    recentLogs, 
    notifications, 
    isLoading, 
    isBackingUp, 
    markAllAsRead, 
    triggerBackup 
  } = useAdminDashboard()

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const notificationRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false)
      }
    }
    if (isNotificationsOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isNotificationsOpen])

  const unreadCount = notifications.filter((item) => !item.isRead).length

  if (isLoading || !summary) {
    return <div className={styles.loading}>Loading Super Admin Dashboard...</div>
  }

  const UsersBgIcon = ({ isWhite = false }: { isWhite?: boolean }) => (
    <svg
      className={`${styles.bgIcon} ${isWhite ? styles.bgIconWhite : styles.bgIconBlue}`}
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M44 54v-6a8 8 0 0 0-8-8H20a8 8 0 0 0-8 8v6" />
      <circle cx="28" cy="24" r="8" />
      <path d="M52 54v-4a6 6 0 0 0-4-5.6" />
      <path d="M42 16.4a6 6 0 0 1 0 11.2" />
    </svg>
  )

  const BriefcaseBgIcon = ({ isWhite = false }: { isWhite?: boolean }) => (
    <svg
      className={`${styles.bgIcon} ${isWhite ? styles.bgIconWhite : styles.bgIconBlue}`}
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="10" y="24" width="44" height="30" rx="4" ry="4" />
      <path d="M42 24V14a2 2 0 0 0-2-2H24a2 2 0 0 0-2 2v10" />
      <line x1="10" y1="40" x2="54" y2="40" />
      <circle cx="32" cy="40" r="3" fill={isWhite ? '#ffffff' : 'currentColor'} />
    </svg>
  )

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

        <div className={styles.topNavbar}>
          <div className={styles.navbarLeft}>
            <button
              type="button"
              className={styles.menuBtn}
              onClick={openSidebar}
              aria-label="Open Sidebar"
            >
              <Menu size={24} color="#ffffff" />
            </button>
            <div className={styles.dashboardTitleWrapper}>
              <span className={styles.dashboardTitle}>Super Admin Dashboard</span>
              <img src={qcLogos} alt="QC PESO Logo" className={styles.qcLogosImg} />
            </div>
          </div>

          <div className={styles.navbarRight} ref={notificationRef}>
            <button
              type="button"
              className={styles.bellBtn}
              onClick={() => setIsNotificationsOpen((prev) => !prev)}
              aria-label="Toggle notifications"
            >
              <Bell size={24} color="#ffffff" />
              {unreadCount > 0 && <span className={styles.redDot} />}
            </button>

            {isNotificationsOpen && (
              <div className={styles.notificationDropdown}>
                <div className={styles.dropdownHeader}>
                  <div className={styles.dropdownTitleGroup}>
                    <h3>Notifications</h3>
                    <button
                      type="button"
                      className={styles.markReadBtn}
                      onClick={markAllAsRead}
                    >
                      <Check size={14} strokeWidth={2.5} />
                      <span>Mark all as read</span>
                    </button>
                  </div>
                  <button
                    type="button"
                    className={styles.closeDropdownBtn}
                    onClick={() => setIsNotificationsOpen(false)}
                    aria-label="Close"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className={styles.notificationList}>
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`${styles.notificationItem} ${!n.isRead ? styles.unread : ''}`}
                    >
                      <h4 className={styles.itemTitle}>{n.title}</h4>
                      <p className={styles.itemMessage}>{n.message}</p>
                      <span className={styles.itemTime}>{n.timeAgo}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
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
            <UsersBgIcon isWhite={false} />
          </div>

          <div className={`${styles.summaryCard} ${styles.cardGradient}`}>
            <h3 className={styles.cardTitleDark}>Active Students</h3>
            <p className={styles.cardValueDark}>{summary.activeStudents}</p>
            <UsersBgIcon isWhite={true} />
          </div>

          <div className={`${styles.summaryCard} ${styles.cardGradient}`}>
            <h3 className={styles.cardTitleDark}>Total Employers</h3>
            <p className={styles.cardValueDark}>{summary.totalEmployers}</p>
            <BriefcaseBgIcon isWhite={true} />
          </div>

          <div className={`${styles.summaryCard} ${styles.cardBlue}`}>
            <h3 className={styles.cardTitle}>Total Available Opportunities</h3>
            <p className={styles.cardValue}>{summary.totalAvailableOpportunities}</p>
            <BriefcaseBgIcon isWhite={false} />
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
              <div>
                <h2 className={styles.sectionHeading}>Recent System Audit Events</h2>
                <p className={styles.sectionSubtext}>Live security events & administrator operations</p>
              </div>
              <button 
                type="button" 
                className={styles.outlineViewAllBtn}
                onClick={() => navigate('/admin/audit-logs')}
              >
                View Full Trail
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
            <h2 className={styles.sectionHeading}>Super Admin Actions</h2>
            <p className={styles.sectionSubtext}>Immediate administrative operations</p>

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