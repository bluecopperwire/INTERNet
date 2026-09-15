import { useEffect, useState } from 'react'
import {
  Grid2X2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Users,
  Settings,
  UserRound,
  GraduationCap,
  Building2,
  BriefcaseBusiness,
  FileText,
  LogOut,
  Menu,
} from 'lucide-react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import internetLogo from '../../../assets/internet-logo.svg'
import { useAuthStore } from '../../../stores/useAuthStore'
import { adminProfileService } from '../services/admin-profile.service'
import type { AdminProfile } from '../types/admin-profile.types'
import styles from './AdminSidebar.module.css'

interface AdminSidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const location = useLocation()
  const [search, setSearch] = useState('')
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false)
  const [isAuditLogsOpen, setIsAuditLogsOpen] = useState(() =>
    location.pathname.startsWith('/admin/audit-logs/'),
  )
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const navigate = useNavigate()
  const { user, logout: authLogout } = useAuthStore()

  useEffect(() => {
    let isMounted = true
    void adminProfileService.getProfile()
      .then((loadedProfile) => {
        if (isMounted) setProfile(loadedProfile)
      })
      .catch(() => undefined)
    return () => {
      isMounted = false
    }
  }, [])

  const logout = async () => {
    onClose()
    await authLogout()
    navigate('/', { replace: true })
  }

  const matchesSearch = (text: string) => {
    if (!search.trim()) return true
    return text.toLowerCase().includes(search.trim().toLowerCase())
  }

  const displayName = profile?.fullName || user?.email.split('@')[0] || 'Administrator'
  const userInitials = displayName.substring(0, 2).toUpperCase()

  return (
    <aside
      className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}
      id="admin-sidebar"
      aria-hidden={!isOpen}
    >
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.logoBox}>
            <img src={internetLogo} alt="INTERNet Logo" />
          </span>
          <span>INTERNet</span>
        </div>
        <div className={styles.headerActions}>
          <button type="button" aria-label="Close navigation" onClick={onClose}>
            <Menu />
          </button>
        </div>
      </div>

      <label className={styles.searchLabel}>
        <span className={styles.srOnly}>Search navigation</span>
        <input
          type="search"
          placeholder="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          tabIndex={isOpen ? 0 : -1}
        />
      </label>

      {/* Navigation Links */}
      <nav className={styles.navigation} aria-label="System Admin navigation">
        <div className={styles.navGroup}>
          {matchesSearch('Dashboard') && (
            <NavLink
              end
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.activeNavItem : ''}`
              }
              to="/admin/dashboard"
              onClick={onClose}
              tabIndex={isOpen ? 0 : -1}
            >
              <Grid2X2 size={20} />
              <span>Dashboard</span>
            </NavLink>
          )}

          {matchesSearch('Admin Profile') && (
            <NavLink
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.activeNavItem : ''}`
              }
              to="/admin/profile"
              onClick={onClose}
              tabIndex={isOpen ? 0 : -1}
            >
              <UserRound size={20} />
              <span>Admin Profile</span>
            </NavLink>
          )}

          {(matchesSearch('User Management') ||
            matchesSearch('Manage Students') ||
            matchesSearch('Manage Employers') ||
          matchesSearch('Manage QC PESO')) && (
            <div className={styles.userManagementSection}>
              <button
                type="button"
                className={styles.navGroupHeader}
                onClick={() => setIsUserManagementOpen((current) => !current)}
                aria-expanded={isUserManagementOpen}
              >
                <span className={styles.navGroupTitle}><Users size={20} /><span>User Management</span></span>
                {isUserManagementOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              </button>

              {isUserManagementOpen && <div className={styles.subItemsList}>
                {matchesSearch('Manage Students') && (
                  <NavLink
                    className={({ isActive }) =>
                      `${styles.subItem} ${isActive ? styles.activeSubItem : ''}`
                    }
                    to="/admin/manage-students"
                    onClick={onClose}
                    tabIndex={isOpen ? 0 : -1}
                  >
                    <GraduationCap size={17} aria-hidden="true" />
                    <span>Manage Students</span>
                  </NavLink>
                )}

                {matchesSearch('Manage QC PESO') && (
                  <NavLink
                    className={({ isActive }) =>
                      `${styles.subItem} ${isActive ? styles.activeSubItem : ''}`
                    }
                    to="/admin/manage-qcpeso"
                    onClick={onClose}
                    tabIndex={isOpen ? 0 : -1}
                  >
                    <BriefcaseBusiness size={17} aria-hidden="true" />
                    <span>Manage QC PESO</span>
                  </NavLink>
                )}

                {matchesSearch('Manage Employers') && (
                  <NavLink
                    className={({ isActive }) =>
                      `${styles.subItem} ${isActive ? styles.activeSubItem : ''}`
                    }
                    to="/admin/manage-employers"
                    onClick={onClose}
                    tabIndex={isOpen ? 0 : -1}
                  >
                    <Building2 size={17} aria-hidden="true" />
                    <span>Manage Employers</span>
                  </NavLink>
                )}
              </div>}
            </div>
          )}

          {(matchesSearch('Audit Logs') || matchesSearch('Accounts') ||
            matchesSearch('Applications and Referrals') || matchesSearch('Internships')) && (
            <div className={styles.userManagementSection}>
              <button
                type="button"
                className={styles.navGroupHeader}
                onClick={() => setIsAuditLogsOpen((current) => !current)}
                aria-expanded={isAuditLogsOpen}
                tabIndex={isOpen ? 0 : -1}
              >
                <span className={styles.navGroupTitle}>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="6" cy="6" r="3.5" />
                    <polyline points="6 4 6 6 7.5 6" />
                    <line x1="12" y1="19" x2="12" y2="15" />
                    <line x1="16" y1="19" x2="16" y2="12" />
                    <line x1="20" y1="19" x2="20" y2="9" />
                  </svg>
                  <span>Audit Logs</span>
                </span>
                {isAuditLogsOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              </button>

              {isAuditLogsOpen && <div className={styles.subItemsList}>
                {matchesSearch('Accounts') && (
                  <NavLink
                    className={({ isActive }) => `${styles.subItem} ${isActive ? styles.activeSubItem : ''}`}
                    to="/admin/audit-logs/accounts"
                    onClick={onClose}
                    tabIndex={isOpen ? 0 : -1}
                  >
                    <UserRound size={17} aria-hidden="true" />
                    <span>Accounts</span>
                  </NavLink>
                )}
                {matchesSearch('Applications and Referrals') && (
                  <NavLink
                    className={({ isActive }) => `${styles.subItem} ${isActive ? styles.activeSubItem : ''}`}
                    to="/admin/audit-logs/applications-referrals"
                    onClick={onClose}
                    tabIndex={isOpen ? 0 : -1}
                  >
                    <FileText size={17} aria-hidden="true" />
                    <span>Applications and Referrals</span>
                  </NavLink>
                )}
                {matchesSearch('Internships') && (
                  <NavLink
                    className={({ isActive }) => `${styles.subItem} ${isActive ? styles.activeSubItem : ''}`}
                    to="/admin/audit-logs/internships"
                    onClick={onClose}
                    tabIndex={isOpen ? 0 : -1}
                  >
                    <BriefcaseBusiness size={17} aria-hidden="true" />
                    <span>Internships</span>
                  </NavLink>
                )}
              </div>}
            </div>
          )}

          {matchesSearch('Settings') && (
            <NavLink
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.activeNavItem : ''}`
              }
              to="/admin/settings"
              onClick={onClose}
              tabIndex={isOpen ? 0 : -1}
            >
              <Settings size={20} />
              <span>Settings</span>
            </NavLink>
          )}
        </div>

        {/* Bottom Section: Profile shortcut and Log Out */}
        <div className={styles.bottomNavGroup}>
          <button
            type="button"
            className={styles.userSummary}
            onClick={() => { onClose(); navigate('/admin/profile') }}
            tabIndex={isOpen ? 0 : -1}
          >
            <span className={styles.avatar} aria-hidden="true">
              {profile?.avatarUrl ? <img src={profile.avatarUrl} alt="" /> : userInitials}
            </span>
            <span className={styles.userText}>
              <strong>{displayName}</strong>
              <small>{user?.email}</small>
            </span>
            <ExternalLink aria-hidden="true" />
          </button>

          <button
            type="button"
            className={styles.logout}
            onClick={logout}
            tabIndex={isOpen ? 0 : -1}
          >
            <LogOut size={20} />
            <span>Log out</span>
          </button>
        </div>
      </nav>
    </aside>
  )
}

export default AdminSidebar
