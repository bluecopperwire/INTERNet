import { useState } from 'react'
import {
  CheckCircle2,
  Database,
  Download,
  HardDrive,
  Play,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import headerImage from '../../../assets/requirements-header-image.png'
import type { BackupRecord } from '../types/admin.types'
import styles from './BackupsMaintenancePage.module.css'

const INITIAL_BACKUPS: BackupRecord[] = [
  {
    id: 'BK-20260814-001',
    filename: 'internet_backup_20260814_020000.sql.gz',
    timestamp: '2026-08-14 02:00:00 AM',
    triggerType: 'Automated',
    fileSize: '142.5 MB',
    status: 'Successful',
  },
  {
    id: 'BK-20260813-001',
    filename: 'internet_backup_20260813_020000.sql.gz',
    timestamp: '2026-08-13 02:00:00 AM',
    triggerType: 'Automated',
    fileSize: '140.2 MB',
    status: 'Successful',
  },
  {
    id: 'BK-20260812-002',
    filename: 'internet_backup_20260812_161530_manual.sql.gz',
    timestamp: '2026-08-12 04:15:30 PM',
    triggerType: 'Manual',
    fileSize: '139.8 MB',
    status: 'Successful',
  },
  {
    id: 'BK-20260812-001',
    filename: 'internet_backup_20260812_020000.sql.gz',
    timestamp: '2026-08-12 02:00:00 AM',
    triggerType: 'Automated',
    fileSize: '138.9 MB',
    status: 'Successful',
  },
  {
    id: 'BK-20260811-001',
    filename: 'internet_backup_20260811_020000.sql.gz',
    timestamp: '2026-08-11 02:00:00 AM',
    triggerType: 'Automated',
    fileSize: '136.4 MB',
    status: 'Successful',
  },
]

export function BackupsMaintenancePage() {
  const [backups, setBackups] = useState<BackupRecord[]>(INITIAL_BACKUPS)
  const [isBackingUp, setIsBackingUp] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)

  const handleTriggerManualBackup = () => {
    setIsBackingUp(true)
    setFeedbackMessage('Initiating system database snapshot...')

    setTimeout(() => {
      const now = new Date()
      const timestampStr = now.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      })

      const newBackup: BackupRecord = {
        id: `BK-${Date.now()}`,
        filename: `internet_backup_${now.toISOString().slice(0, 10).replace(/-/g, '')}_manual.sql.gz`,
        timestamp: timestampStr,
        triggerType: 'Manual',
        fileSize: '143.1 MB',
        status: 'Successful',
      }

      setBackups((prev) => [newBackup, ...prev])
      setIsBackingUp(false)
      setFeedbackMessage(`Manual system backup created successfully: ${newBackup.filename}`)
    }, 1500)
  }

  const handleOptimizeDatabase = () => {
    setFeedbackMessage('Optimizing database tables and indexes...')
    setTimeout(() => {
      setFeedbackMessage('Database tables optimization completed. Query performance enhanced.')
    }, 1200)
  }

  const handleClearCache = () => {
    setFeedbackMessage('Clearing application view & API response caches...')
    setTimeout(() => {
      setFeedbackMessage('System caches successfully flushed.')
    }, 1000)
  }

  const handleExportAuditLogs = () => {
    setFeedbackMessage('Generating CSV export of security audit logs...')
    setTimeout(() => {
      setFeedbackMessage('Security audit log CSV exported successfully.')
    }, 1200)
  }

  const handleDeleteBackup = (id: string) => {
    setBackups((prev) => prev.filter((b) => b.id !== id))
    setFeedbackMessage('Backup archive removed from system storage.')
  }

  return (
    <main className={styles.pageContainer}>
      {/* Hero Header matching design spec */}
      <header className={styles.heroHeader}>
        <img src={headerImage} alt="" className={styles.heroBgImage} />
        <div className={styles.heroOverlay} />
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>Backups and Maintenance</h1>
          <p className={styles.heroSubtitle}>
            Monitor system status and control automated or manual backups.
          </p>
        </div>
      </header>

      {/* Main Section Content */}
      <section className={styles.mainContent}>
        {feedbackMessage && (
          <div className={styles.feedbackBanner} role="status">
            <CheckCircle2 size={18} />
            <span>{feedbackMessage}</span>
          </div>
        )}

        {/* Card 1: System Status */}
        <section className={styles.sectionCard} aria-labelledby="system-status-title">
          <div className={styles.cardHeader}>
            <div className={styles.cardTitleGroup}>
              <ShieldCheck size={22} color="#160e6f" />
              <h2 id="system-status-title" className={styles.cardTitle}>
                System Status
              </h2>
            </div>
            <div className={styles.statusIndicatorBadge}>
              <span className={styles.statusDot} />
              <span>Daily Auto-Backup Active</span>
            </div>
          </div>

          <div className={styles.statusGrid}>
            <div className={styles.statusMetricBox}>
              <div className={styles.metricTop}>
                <span>Storage Utilization</span>
                <HardDrive size={16} />
              </div>
              <span className={styles.metricValue}>2.4 GB / 50 GB</span>
              <div className={styles.progressBarTrack}>
                <div className={styles.progressBarFill} style={{ width: '4.8%' }} />
              </div>
              <span className={styles.metricSubtext}>4.8% of backup storage used</span>
            </div>

            <div className={styles.statusMetricBox}>
              <div className={styles.metricTop}>
                <span>Database Status</span>
                <Database size={16} />
              </div>
              <span className={styles.metricValue}>Operational</span>
              <span className={styles.metricSubtext}>MySQL 8.0 Engine connected</span>
            </div>

            <div className={styles.statusMetricBox}>
              <div className={styles.metricTop}>
                <span>Daily Auto-Backup</span>
                <RefreshCw size={16} />
              </div>
              <span className={styles.metricValue}>Active</span>
              <span className={styles.metricSubtext}>Scheduled daily at 02:00 AM UTC</span>
            </div>

            <div className={styles.statusMetricBox}>
              <div className={styles.metricTop}>
                <span>System Uptime</span>
                <ShieldAlert size={16} />
              </div>
              <span className={styles.metricValue}>99.98%</span>
              <span className={styles.metricSubtext}>12,482 Security events logged</span>
            </div>
          </div>
        </section>

        {/* Card 2: Maintenance Tools */}
        <section className={styles.sectionCard} aria-labelledby="maintenance-tools-title">
          <div className={styles.cardHeader}>
            <div className={styles.cardTitleGroup}>
              <RefreshCw size={22} color="#160e6f" />
              <h2 id="maintenance-tools-title" className={styles.cardTitle}>
                Maintenance Tools
              </h2>
            </div>
          </div>

          <div className={styles.toolsGrid}>
            <div className={styles.toolCard}>
              <div className={styles.toolHeader}>
                <div className={styles.toolIconBox}>
                  <Play size={20} />
                </div>
                <div className={styles.toolTitleGroup}>
                  <h3 className={styles.toolTitle}>Trigger Manual Backup</h3>
                  <p className={styles.toolDesc}>
                    Create an immediate full database and file system snapshot archive.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className={styles.toolActionBtn}
                disabled={isBackingUp}
                onClick={handleTriggerManualBackup}
              >
                {isBackingUp ? (
                  <>
                    <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Creating Backup...</span>
                  </>
                ) : (
                  <>
                    <Play size={16} />
                    <span>Trigger Immediate Backup</span>
                  </>
                )}
              </button>
            </div>

            <div className={styles.toolCard}>
              <div className={styles.toolHeader}>
                <div className={styles.toolIconBox}>
                  <Database size={20} />
                </div>
                <div className={styles.toolTitleGroup}>
                  <h3 className={styles.toolTitle}>Database Optimization</h3>
                  <p className={styles.toolDesc}>
                    Re-index relational tables and clean stale query cache files.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className={styles.secondaryToolBtn}
                onClick={handleOptimizeDatabase}
              >
                <RotateCcw size={16} />
                <span>Optimize Tables</span>
              </button>
            </div>

            <div className={styles.toolCard}>
              <div className={styles.toolHeader}>
                <div className={styles.toolIconBox}>
                  <RefreshCw size={20} />
                </div>
                <div className={styles.toolTitleGroup}>
                  <h3 className={styles.toolTitle}>Clear System Cache</h3>
                  <p className={styles.toolDesc}>
                    Flush application view templates and cached session states.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className={styles.secondaryToolBtn}
                onClick={handleClearCache}
              >
                <RefreshCw size={16} />
                <span>Clear Caches</span>
              </button>
            </div>

            <div className={styles.toolCard}>
              <div className={styles.toolHeader}>
                <div className={styles.toolIconBox}>
                  <Download size={20} />
                </div>
                <div className={styles.toolTitleGroup}>
                  <h3 className={styles.toolTitle}>Export Audit Logs</h3>
                  <p className={styles.toolDesc}>
                    Generate a CSV download of security events and activity logs.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className={styles.secondaryToolBtn}
                onClick={handleExportAuditLogs}
              >
                <Download size={16} />
                <span>Export Audit Logs (CSV)</span>
              </button>
            </div>
          </div>
        </section>

        {/* Card 3: System Backups */}
        <section className={styles.sectionCard} aria-labelledby="system-backups-title">
          <div className={styles.cardHeader}>
            <div className={styles.cardTitleGroup}>
              <HardDrive size={22} color="#160e6f" />
              <h2 id="system-backups-title" className={styles.cardTitle}>
                System Backups
              </h2>
            </div>
          </div>

          <div className={styles.backupTableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Backup File Name</th>
                  <th>Date & Time</th>
                  <th>Trigger Type</th>
                  <th>File Size</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {backups.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong style={{ color: '#160e6f' }}>{item.filename}</strong>
                    </td>
                    <td>{item.timestamp}</td>
                    <td>
                      <span
                        className={`${styles.triggerTag} ${
                          item.triggerType === 'Automated'
                            ? styles.triggerAutomated
                            : styles.triggerManual
                        }`}
                      >
                        {item.triggerType}
                      </span>
                    </td>
                    <td>{item.fileSize}</td>
                    <td>
                      <span className={styles.statusPillSuccessful}>{item.status}</span>
                    </td>
                    <td>
                      <div className={styles.tableActionGroup}>
                        <button
                          type="button"
                          className={styles.tableIconBtn}
                          title="Download Backup SQL"
                          onClick={() => setFeedbackMessage(`Downloading ${item.filename}...`)}
                        >
                          <Download size={15} />
                        </button>
                        <button
                          type="button"
                          className={styles.tableIconBtn}
                          title="Restore from Backup"
                          onClick={() =>
                            setFeedbackMessage(`Initiating dry-run restore check for ${item.filename}...`)
                          }
                        >
                          <RotateCcw size={15} />
                        </button>
                        <button
                          type="button"
                          className={`${styles.tableIconBtn} ${styles.tableIconBtnDelete}`}
                          title="Delete Backup Archive"
                          onClick={() => handleDeleteBackup(item.id)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  )
}

export default BackupsMaintenancePage
