import { useState, useEffect, useMemo } from 'react'
import { Search, Filter, FileSpreadsheet, ChevronLeft, ChevronRight, Eye } from 'lucide-react'
import headerImage from '../../../assets/requirements-header-image.png'
import { adminService } from '../services/admin.service'
import type { AuditLog } from '../types/admin.types'
import { AuditLogDetailsModal } from '../components/AuditLogDetailsModal'
import styles from './AuditLogsPage.module.css'

export function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  
  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRole, setSelectedRole] = useState('All')
  const [selectedAction, setSelectedAction] = useState('All')
  const [selectedStatus, setSelectedStatus] = useState('All')
  const [startDate, setStartDate] = useState('2026-07-01')
  const [endDate, setEndDate] = useState('2026-07-31')
  const [showFilters, setShowFilters] = useState(false)

  // Pagination State
  const [itemsPerPage, setItemsPerPage] = useState(7)
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    adminService.getAuditLogs().then(data => {
      setLogs(data)
      setIsLoading(false)
    })
  }, [])

  // Filter Logic
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch = 
        log.userId.toLowerCase().includes(q) ||
        log.actionPerformed.toLowerCase().includes(q) ||
        log.actionType.toLowerCase().includes(q) ||
        log.role.toLowerCase().includes(q)
      
      const matchesRole = selectedRole === 'All' || log.role === selectedRole
      const matchesAction = selectedAction === 'All' || log.actionType === selectedAction
      const matchesStatus = selectedStatus === 'All' || log.accountStatus === selectedStatus

      // Date logic
      let matchesDate = true
      if (startDate && endDate) {
        const logDate = new Date(log.timestamp)
        const start = new Date(startDate)
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999) // include the entire end day
        matchesDate = logDate >= start && logDate <= end
      }

      return matchesSearch && matchesRole && matchesAction && matchesStatus && matchesDate
    })
  }, [logs, searchQuery, selectedRole, selectedAction, selectedStatus, startDate, endDate])

  // Pagination Logic
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1
  const displayedLogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredLogs.slice(start, start + itemsPerPage)
  }, [filteredLogs, currentPage, itemsPerPage])

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

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      alert("No logs to export based on current filters.")
      return
    }

    const headers = ['Timestamp', 'User ID', 'Role', 'Action Type', 'Action Performed', 'IP Address', 'Account Status']
    const csvRows = [headers.join(',')]

    for (const log of filteredLogs) {
      const values = [
        `"${formatTimestamp(log.timestamp)}"`,
        `"${log.userId}"`,
        `"${log.role}"`,
        `"${log.actionType}"`,
        `"${log.actionPerformed}"`,
        `"${log.ipAddress}"`,
        `"${log.accountStatus}"`
      ]
      csvRows.push(values.join(','))
    }

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.setAttribute('hidden', '')
    a.setAttribute('href', url)
    a.setAttribute('download', 'audit_logs_export.csv')
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  if (isLoading) {
    return <div className={styles.pageContainer} style={{ padding: '40px', textAlign: 'center' }}>Loading Audit Logs...</div>
  }

  return (
    <main className={styles.pageContainer}>
      <header className={styles.hero}><img src={headerImage} alt="" className={styles.heroImage} /><div className={styles.heroOverlay} /><div className={styles.heroContent}><h1>Audit Logs</h1><p>Monitor system activity, user actions, and security events.</p></div></header>

      <div className={styles.mainContent}>
        {/* Top Toolbar */}
        <div className={styles.topToolbar}>
          <div className={styles.lastUpdatedBox}>
            <div className={styles.blueDot}></div>
            <p className={styles.lastUpdatedText}>Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} | {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
          <button className={styles.exportBtn} onClick={handleExportCSV}>
            <FileSpreadsheet size={16} />
            Export to CSV
          </button>
        </div>

        {/* Search & Filter Toolbar */}
        <div className={styles.filterRow}>
          <div className={styles.searchBox}>
            <Search size={18} color="#160e6f" />
            <input 
              type="text" 
              placeholder="Search by User ID, Name, Email, or Action" 
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
            />
          </div>

          <div className={styles.dateRangeBox}>
            <input 
              type="date" 
              className={styles.dateInput} 
              value={startDate} 
              onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
            />
            <span>to</span>
            <input 
              type="date" 
              className={styles.dateInput} 
              value={endDate} 
              onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
            />
          </div>

          <div className={styles.filterMenuContainer}>
            <button className={styles.filterBtn} onClick={() => setShowFilters(!showFilters)}>
              <Filter size={18} />
              Filter
            </button>
            
            {showFilters && (
              <div className={styles.filterDropdown}>
                <div className={styles.filterGroup}>
                  <label>Role</label>
                  <select value={selectedRole} onChange={(e) => { setSelectedRole(e.target.value); setCurrentPage(1); }}>
                    <option value="All">All Roles</option>
                    <option value="Student">Student</option>
                    <option value="Employer">Employer</option>
                    <option value="QC PESO Personnel">QC PESO Personnel</option>
                  </select>
                </div>
                <div className={styles.filterGroup}>
                  <label>Action Type</label>
                  <select value={selectedAction} onChange={(e) => { setSelectedAction(e.target.value); setCurrentPage(1); }}>
                    <option value="All">All Actions</option>
                    <option value="LOGIN">LOGIN</option>
                    <option value="PROFILE_UPDATE">PROFILE_UPDATE</option>
                    <option value="APPLICATION_SUBMIT">APPLICATION_SUBMIT</option>
                    <option value="ACCOUNT_VERIFIED">ACCOUNT_VERIFIED</option>
                    <option value="ACCOUNT_DEACTIVATED">ACCOUNT_DEACTIVATED</option>
                    <option value="REQUIREMENTS_UPLOAD">REQUIREMENTS_UPLOAD</option>
                    <option value="PASSWORD_CHANGE">PASSWORD_CHANGE</option>
                  </select>
                </div>
                <div className={styles.filterGroup}>
                  <label>Account Status</label>
                  <select value={selectedStatus} onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}>
                    <option value="All">All Statuses</option>
                    <option value="Active">Active</option>
                    <option value="Pending">Pending</option>
                    <option value="Deactivated">Deactivated</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Table Area */}
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User ID</th>
                <th>Role</th>
                <th>Action Performed</th>
                <th>IP Address</th>
                <th>Account Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {displayedLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className={styles.noData}>No audit logs match your search criteria.</td>
                </tr>
              ) : (
                displayedLogs.map((log) => (
                  <tr key={log.id}>
                    <td>{formatTimestamp(log.timestamp)}</td>
                    <td><strong>{log.userId}</strong></td>
                    <td>{log.role}</td>
                    <td>{log.actionPerformed}</td>
                    <td>{log.ipAddress}</td>
                    <td>
                      <span className={`${styles.statusBadge} ${getStatusBadgeClass(log.accountStatus)}`}>
                        {log.accountStatus}
                      </span>
                    </td>
                    <td>
                      <button className={styles.detailsBtn} onClick={() => setSelectedLog(log)}>
                        <Eye size={16} aria-hidden="true" />Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className={styles.paginationRow}>
          <div className={styles.rowsPerPage}>
            <span>View</span>
            <select 
              className={styles.viewSelect}
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value))
                setCurrentPage(1)
              }}
            >
              <option value={7}>7</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
            <span>Rows per page</span>
          </div>

          <div className={styles.paginationControls}>
            <button 
              className={styles.navIconBtn} 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            >
              <ChevronLeft size={20} />
            </button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
              <button 
                key={pageNum}
                className={`${styles.pageBtn} ${pageNum === currentPage ? styles.active : ''}`}
                onClick={() => setCurrentPage(pageNum)}
              >
                {pageNum}
              </button>
            ))}

            <button 
              className={styles.navIconBtn}
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

      </div>

      {selectedLog && (
        <AuditLogDetailsModal
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </main>
  )
}
