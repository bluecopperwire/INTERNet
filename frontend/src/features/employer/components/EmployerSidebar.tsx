import { useState } from 'react'
import {
  Grid2X2,
  Building2,
  Briefcase,
  Users,
  Clock,
  FileText,
  Settings,
  LogOut,
  Menu,
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
          <span className={styles.logoBox}>
            <img src={internetLogo} alt="INTERNet Logo" />
          </span>
          <span>INTERNet</span>
        </div>
        <div className={styles.headerActions}>
          <button type="button" aria-label="Close navigation" onClick={onClose}><Menu /></button>
        </div>
      </div>

      <label className={styles.searchLabel}>
        <span className={styles.srOnly}>Search navigation</span>
        <input
          type="search"
          placeholder="Search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          tabIndex={isOpen ? 0 : -1}
        />
      </label>

      <nav className={styles.navigation} aria-label="Employer Navigation">
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
      </nav>

      <div className={styles.bottomActions}>
        {matchesSearch('Settings') && (
          <NavLink
            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
            to="/employer/settings"
            onClick={onClose}
            tabIndex={isOpen ? 0 : -1}
          >
            <Settings aria-hidden="true" />
            <span>Settings</span>
          </NavLink>
        )}
        <button
          className={styles.logout}
          type="button"
          onClick={handleLogout}
          tabIndex={isOpen ? 0 : -1}
        >
          <LogOut aria-hidden="true" />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  )
}

export default EmployerSidebar
