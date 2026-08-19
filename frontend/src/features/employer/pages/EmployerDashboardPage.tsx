import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Bell, 
  ArrowRight, 
  ChevronRight,
  Plus, 
  FileText, 
  Users, 
  Check, 
  X 
} from 'lucide-react'
import headerImage from '../../../assets/requirements-header-image.png'
import styles from './EmployerDashboardPage.module.css'
import { useEmployerDashboard } from '../hooks/useEmployerDashboard'

export const EmployerDashboardPage: React.FC = () => {
  const navigate = useNavigate()
  const { summary, recentApplicants, notifications, isLoading, markAllAsRead } = useEmployerDashboard()

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
  const formatNumber = (num: number) => (num < 10 ? `0${num}` : `${num}`)

  if (isLoading || !summary) {
    return <div className={styles.loading}>Loading Dashboard...</div>
  }

  return (
    <main className={styles.pageContainer}>
      <header className={styles.heroHeader}>
        <div className={styles.heroBgWrapper}>
          <img src={headerImage} alt="" className={styles.heroBgImage} />
          <div className={styles.heroOverlay} />
        </div>

        <div className={styles.topNavbar}>
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
          <h1 className={styles.heroTitle}>Welcome, {summary.companyName}!</h1>
          <p className={styles.heroSubtitle}>Here is what’s happening with your opportunities.</p>
        </div>
      </header>

      <section className={styles.mainContent}>
        <div className={styles.topSectionGrid}>
          <div className={styles.statsQuad}>
            <div className={styles.blueStatCard}>
              <h3 className={styles.statLabel}>Active Opportunities</h3>
              <span className={styles.statNumber}>{formatNumber(summary.activeOpportunities)}</span>
            </div>

            <div className={styles.blueStatCard}>
              <h3 className={styles.statLabel}>Total Applicants</h3>
              <span className={styles.statNumber}>{formatNumber(summary.totalApplicants)}</span>
            </div>

            <div className={styles.blueStatCard}>
              <h3 className={styles.statLabel}>Pending Reviews</h3>
              <span className={styles.statNumber}>{formatNumber(summary.pendingReviews)}</span>
            </div>

            <div className={styles.blueStatCard}>
              <h3 className={styles.statLabel}>Acceptance Rate</h3>
              <span className={styles.statNumber}>{summary.acceptanceRate}%</span>
            </div>
          </div>

          <div className={styles.statusChartCard}>
            <h3 className={styles.statusCardTitle}>Applications Status</h3>
            
            <div className={styles.chartArea}>
              <div className={styles.donutWrapper}>
                <svg className={styles.donutSvg} viewBox="0 0 36 36">
                  <path
                    className={styles.donutTrack}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className={styles.donutSegment}
                    strokeDasharray={`${summary.acceptedPercentage}, 100`}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
              </div>

              <div className={styles.chartLegend}>
                <div className={styles.legendRow}>
                  <span className={`${styles.legendBox} ${styles.boxAccepted}`} />
                  <div className={styles.legendTexts}>
                    <strong>{summary.acceptedPercentage}%</strong>
                    <span>Accepted</span>
                  </div>
                </div>

                <div className={styles.legendRow}>
                  <span className={`${styles.legendBox} ${styles.boxRejected}`} />
                  <div className={styles.legendTexts}>
                    <strong>{summary.rejectedPercentage}%</strong>
                    <span>Rejected</span>
                  </div>
                </div>
              </div>
            </div>

            <button 
              type="button" 
              className={styles.viewAllAppsBtn}
              onClick={() => navigate('/employer/applicants')}
            >
              <span>View All Applications</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>

        <div className={styles.bottomSectionGrid}>
          <div className={styles.recentAppsContainer}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitle}>
                <h2 className={styles.sectionHeading}>Recent Applications</h2>
                <p>Latest applications submitted to your opportunities</p>
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

            <div className={styles.tableCard}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Position</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentApplicants.length > 0 ? (
                    recentApplicants.map((app) => (
                      <tr key={app.id}>
                        <td><strong>{app.name}</strong></td>
                        <td>{app.opportunityTitle}</td>
                        <td>{app.dateApplied}</td>
                        <td>
                          <span className={styles.statusCellText}>{app.status}</span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    Array(6).fill(null).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={4}>
                          <div className={styles.skeletonBar} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className={styles.quickActionsContainer}>
            <div className={styles.sectionTitle}>
              <h2 className={styles.sectionHeading}>Quick Actions</h2>
              <p>Manage opportunities and your company profile</p>
            </div>

            <div className={styles.actionsList}>
              <button
                type="button"
                className={styles.actionButton}
                onClick={() => navigate('/employer/opportunities/create')}
              >
                <Plus size={20} strokeWidth={2.5} />
                <span>Post Opportunities</span>
              </button>

              <button
                type="button"
                className={styles.actionButton}
                onClick={() => navigate('/employer/applicants')}
              >
                <FileText size={20} />
                <span>Review Applicants</span>
              </button>

              <button
                type="button"
                className={styles.actionButton}
                onClick={() => navigate('/employer/profile')}
              >
                <Users size={20} />
                <span>Update Profile</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

export default EmployerDashboardPage
