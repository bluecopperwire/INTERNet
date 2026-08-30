import { ArrowLeft } from 'lucide-react'
import type { AuditLog } from '../types/admin.types'
import styles from './AuditLogDetailsModal.module.css'

interface AuditLogDetailsModalProps {
  log: AuditLog
  onClose: () => void
}

export function AuditLogDetailsModal({ log, onClose }: AuditLogDetailsModalProps) {
  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'verified':
      case 'approved':
        return styles.badgeSuccess
      case 'pending':
        return styles.badgeWarning
      case 'inactive':
      case 'deactivated':
        return styles.badgeError
      default:
        return styles.badgeDefault
    }
  }

  const formatTimestamp = (isoString: string) => {
    const date = new Date(isoString)
    const options: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', year: 'numeric' }
    const formattedDate = date.toLocaleDateString('en-US', options)
    const formattedTime = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    return `${formattedDate} | ${formattedTime}`
  }

  const renderDynamicSection = () => {
    const { historyTable, details } = log

    if (!details) return null

    switch (historyTable) {
      case 'USER_ACCOUNT_STATUS':
        return (
          <>
            <div className={styles.infoRow}>
              <div className={styles.infoLabel}>Previous Account Status</div>
              <div className={styles.infoValue}>{details.previousStatus || 'N/A'}</div>
            </div>
            <div className={styles.infoRow}>
              <div className={styles.infoLabel}>New Account Status</div>
              <div className={styles.infoValue}>{details.newStatus || 'N/A'}</div>
            </div>
            <div className={styles.infoRow}>
              <div className={styles.infoLabel}>Changed By User</div>
              <div className={styles.infoValue}>{details.changedBy || 'N/A'}</div>
            </div>
            <div className={styles.infoRow}>
              <div className={styles.infoLabel}>Changed Date</div>
              <div className={styles.infoValue}>
                {details.changedDate ? formatTimestamp(details.changedDate) : 'N/A'}
              </div>
            </div>
          </>
        )
      case 'APPLICATION_STATUS':
        return (
          <>
            <div className={styles.infoRow}>
              <div className={styles.infoLabel}>Student</div>
              <div className={styles.infoValue}>{details.student || 'N/A'}</div>
            </div>
            <div className={styles.infoRow}>
              <div className={styles.infoLabel}>Opportunity</div>
              <div className={styles.infoValue}>{details.opportunity || 'N/A'}</div>
            </div>
            <div className={styles.infoRow}>
              <div className={styles.infoLabel}>Previous Application Status</div>
              <div className={styles.infoValue}>{details.previousStatus || 'N/A'}</div>
            </div>
            <div className={styles.infoRow}>
              <div className={styles.infoLabel}>New Application Status</div>
              <div className={styles.infoValue}>{details.newStatus || 'N/A'}</div>
            </div>
            <div className={styles.infoRow}>
              <div className={styles.infoLabel}>Changed By User</div>
              <div className={styles.infoValue}>{details.changedBy || 'N/A'}</div>
            </div>
          </>
        )
      case 'REFERRAL_STATUS':
        return (
          <>
            <div className={styles.infoRow}>
              <div className={styles.infoLabel}>Student</div>
              <div className={styles.infoValue}>{details.student || 'N/A'}</div>
            </div>
            <div className={styles.infoRow}>
              <div className={styles.infoLabel}>Company</div>
              <div className={styles.infoValue}>{details.company || 'N/A'}</div>
            </div>
            <div className={styles.infoRow}>
              <div className={styles.infoLabel}>Previous Referral Status</div>
              <div className={styles.infoValue}>{details.previousStatus || 'N/A'}</div>
            </div>
            <div className={styles.infoRow}>
              <div className={styles.infoLabel}>New Referral Status</div>
              <div className={styles.infoValue}>{details.newStatus || 'N/A'}</div>
            </div>
            <div className={styles.infoRow}>
              <div className={styles.infoLabel}>Changed By User</div>
              <div className={styles.infoValue}>{details.changedBy || 'N/A'}</div>
            </div>
          </>
        )
      case 'INTERNSHIP_ASSIGNMENT_STATUS':
        return (
          <>
            <div className={styles.infoRow}>
              <div className={styles.infoLabel}>Student</div>
              <div className={styles.infoValue}>{details.student || 'N/A'}</div>
            </div>
            <div className={styles.infoRow}>
              <div className={styles.infoLabel}>Company</div>
              <div className={styles.infoValue}>{details.company || 'N/A'}</div>
            </div>
            <div className={styles.infoRow}>
              <div className={styles.infoLabel}>Previous Assignment Status</div>
              <div className={styles.infoValue}>{details.previousStatus || 'N/A'}</div>
            </div>
            <div className={styles.infoRow}>
              <div className={styles.infoLabel}>New Assignment Status</div>
              <div className={styles.infoValue}>{details.newStatus || 'N/A'}</div>
            </div>
            <div className={styles.infoRow}>
              <div className={styles.infoLabel}>Changed By User</div>
              <div className={styles.infoValue}>{details.changedBy || 'N/A'}</div>
            </div>
          </>
        )
      case 'PESO_PERSONNEL_VERIFICATION':
        return (
          <>
            <div className={styles.infoRow}>
              <div className={styles.infoLabel}>Personnel Name</div>
              <div className={styles.infoValue}>{details.personnelName || 'N/A'}</div>
            </div>
            <div className={styles.infoRow}>
              <div className={styles.infoLabel}>Previous Verification Status</div>
              <div className={styles.infoValue}>{details.previousStatus || 'N/A'}</div>
            </div>
            <div className={styles.infoRow}>
              <div className={styles.infoLabel}>New Verification Status</div>
              <div className={styles.infoValue}>{details.newStatus || 'N/A'}</div>
            </div>
            <div className={styles.infoRow}>
              <div className={styles.infoLabel}>Reviewer</div>
              <div className={styles.infoValue}>{details.reviewer || 'N/A'}</div>
            </div>
            <div className={styles.infoRow}>
              <div className={styles.infoLabel}>Review Date</div>
              <div className={styles.infoValue}>
                {details.reviewDate ? formatTimestamp(details.reviewDate) : 'N/A'}
              </div>
            </div>
          </>
        )
      default:
        return (
          <div className={styles.infoRow}>
            <div className={styles.infoLabel}>Details</div>
            <div className={styles.infoValue}>{JSON.stringify(details, null, 2)}</div>
          </div>
        )
    }
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <button className={styles.backBtn} onClick={onClose}>
            <ArrowLeft size={16} />
            <span>Return</span>
          </button>
          <h1 className={styles.headerTitle}>Audit Log Details</h1>
          <p className={styles.headerSubtitle}>View comprehensive information about this system event.</p>
        </div>

        <div className={styles.modalContent}>
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Event Information</h3>
            <div className={styles.infoBox}>
              <div className={styles.infoRow}>
                <div className={styles.infoLabel}>Log ID</div>
                <div className={styles.infoValue}>{log.id}</div>
              </div>
              <div className={styles.infoRow}>
                <div className={styles.infoLabel}>Timestamp</div>
                <div className={styles.infoValue}>{formatTimestamp(log.timestamp)}</div>
              </div>
              <div className={styles.infoRow}>
                <div className={styles.infoLabel}>Action Type</div>
                <div className={styles.infoValue}>{log.actionType}</div>
              </div>
              <div className={styles.infoRow}>
                <div className={styles.infoLabel}>Module</div>
                <div className={styles.infoValue}>{log.moduleName || 'System'}</div>
              </div>
              <div className={styles.infoRow}>
                <div className={styles.infoLabel}>Performed By</div>
                <div className={styles.infoValue}>{log.performedBy || 'System'}</div>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>User Information</h3>
            <div className={styles.infoBox}>
              <div className={styles.infoRow}>
                <div className={styles.infoLabel}>User ID</div>
                <div className={styles.infoValue}>{log.userId}</div>
              </div>
              <div className={styles.infoRow}>
                <div className={styles.infoLabel}>Full Name</div>
                <div className={styles.infoValue}>{log.userFullName}</div>
              </div>
              <div className={styles.infoRow}>
                <div className={styles.infoLabel}>Role</div>
                <div className={styles.infoValue}>{log.role}</div>
              </div>
              <div className={styles.infoRow}>
                <div className={styles.infoLabel}>Email</div>
                <div className={styles.infoValue}>{log.userEmail}</div>
              </div>
              <div className={styles.infoRow}>
                <div className={styles.infoLabel}>Current Account Status</div>
                <div className={styles.infoValue}>
                  <span className={`${styles.statusBadge} ${getStatusBadgeClass(log.accountStatus)}`}>
                    {log.accountStatus}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {log.details && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Change Details</h3>
              <div className={styles.infoBox}>
                {renderDynamicSection()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AuditLogDetailsModal