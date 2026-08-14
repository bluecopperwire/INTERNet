import { useState } from 'react'
import {
  Search,
  Grid2X2,
  Building2,
  Briefcase,
  Users,
  Clock,
  FileText,
  Settings,
  LogOut,
  X,
} from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import internetLogo from '../../../assets/internet-logo.svg'
import styles from './EmployerSidebar.module.css'

interface EmployerSidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function EmployerSidebar({ isOpen, onClose }: EmployerSidebarProps) {
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  const handleLogout = () => {
    onClose()
    navigate('/')
  }

  const matchesSearch = (text: string) => {
    if (!search.trim()) return true
    return text.toLowerCase().includes(search.trim().toLowerCase())
  }

  return (
    <aside
      className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}
      id="employer-sidebar"
      aria-hidden={!isOpen}
    >
      <div className={styles.header}>
        <div className={styles.brand}>
          <div className={styles.logoBox}>
            <img src={internetLogo} alt="INTERNet Logo" />
          </div>
          <span className={styles.brandName}>INTERNet</span>
        </div>
        <button
          type="button"
          className={styles.closeBtn}
          aria-label="Close navigation"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>

      <div className={styles.searchWrapper}>
        <Search size={18} color="rgba(255, 255, 255, 0.8)" />
        <input
          type="search"
          className={styles.searchInput}
          placeholder="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          tabIndex={isOpen ? 0 : -1}
        />
      </div>

      <nav className={styles.navigation} aria-label="Employer Navigation">
        <div className={styles.navSection}>
          {matchesSearch('Dashboard') && (
            <NavLink
              end
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.active : ''}`
              }
              to="/employer/dashboard"
              onClick={onClose}
              tabIndex={isOpen ? 0 : -1}
            >
              <Grid2X2 size={20} />
              <span>Dashboard</span>
            </NavLink>
          )}

          {matchesSearch('Company Profile') && (
            <NavLink
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.active : ''}`
              }
              to="/employer/profile"
              onClick={onClose}
              tabIndex={isOpen ? 0 : -1}
            >
              <Building2 size={20} />
              <span>Company Profile</span>
            </NavLink>
          )}

          {matchesSearch('Opportunities') && (
            <NavLink
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.active : ''}`
              }
              to="/employer/opportunities"
              onClick={onClose}
              tabIndex={isOpen ? 0 : -1}
            >
              <Briefcase size={20} />
              <span>Opportunities</span>
            </NavLink>
          )}

          {matchesSearch('Applicants') && (
            <NavLink
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.active : ''}`
              }
              to="/employer/applicants"
              onClick={onClose}
              tabIndex={isOpen ? 0 : -1}
            >
              <Users size={20} />
              <span>Applicants</span>
            </NavLink>
          )}

          {matchesSearch('Attendance Monitoring') && (
            <NavLink
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.active : ''}`
              }
              to="/employer/attendance"
              onClick={onClose}
              tabIndex={isOpen ? 0 : -1}
            >
              <Clock size={20} />
              <span>Attendance Monitoring</span>
            </NavLink>
          )}

          {matchesSearch('Reports') && (
            <NavLink
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.active : ''}`
              }
              to="/employer/reports"
              onClick={onClose}
              tabIndex={isOpen ? 0 : -1}
            >
              <FileText size={20} />
              <span>Reports</span>
            </NavLink>
          )}
        </div>

        <div className={styles.navSection}>
          {matchesSearch('Settings') && (
            <NavLink
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.active : ''}`
              }
              to="/employer/settings"
              onClick={onClose}
              tabIndex={isOpen ? 0 : -1}
            >
              <Settings size={20} />
              <span>Settings</span>
            </NavLink>
          )}

          <button
            className={styles.navItem}
            type="button"
            onClick={handleLogout}
            tabIndex={isOpen ? 0 : -1}
          >
            <LogOut size={20} />
            <span>Log Out</span>
          </button>
        </div>
      </nav>
    </aside>
  )
}

export default EmployerSidebar