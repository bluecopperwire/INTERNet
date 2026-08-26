import { useState } from 'react'
import {
  Grid2X2,
  ChevronDown,
  ChevronRight,
  Users,
  Search,
  Settings,
  LogOut,
  Menu,
} from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import internetLogo from '../../../assets/internet-logo.svg'
import { useAuthStore } from '../../../stores/useAuthStore'
import styles from './AdminSidebar.module.css'

interface AdminSidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const [search, setSearch] = useState('')
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false)
  const navigate = useNavigate()
  const { logout: authLogout } = useAuthStore()

  const logout = async () => {
    onClose()
    await authLogout()
    navigate('/', { replace: true })
  }

  const matchesSearch = (text: string) => {
    if (!search.trim()) return true
    return text.toLowerCase().includes(search.trim().toLowerCase())
  }

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
                    Manage Students
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
                    Manage Employers
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
                    Manage QC PESO
                  </NavLink>
                )}
              </div>}
            </div>
          )}

          {matchesSearch('Audit Logs') && (
            <NavLink
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.activeNavItem : ''}`
              }
              to="/admin/audit-logs"
              onClick={onClose}
              tabIndex={isOpen ? 0 : -1}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={styles.customNavIcon}
              >
                <circle cx="6" cy="6" r="3.5" />
                <polyline points="6 4 6 6 7.5 6" />
                <line x1="12" y1="19" x2="12" y2="15" />
                <line x1="16" y1="19" x2="16" y2="12" />
                <line x1="20" y1="19" x2="20" y2="9" />
              </svg>
              <span>Audit Logs</span>
            </NavLink>
          )}

          {matchesSearch('Backups and Maintenance') && (
            <NavLink
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.activeNavItem : ''}`
              }
              to="/admin/backups-maintenance"
              onClick={onClose}
              tabIndex={isOpen ? 0 : -1}
            >
              <Search size={20} />
              <span className={styles.multilineText}>
                Backups and<br />Maintenance
              </span>
            </NavLink>
          )}
        </div>

        {/* Bottom Section: Settings & Log Out */}
        <div className={styles.bottomNavGroup}>
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
