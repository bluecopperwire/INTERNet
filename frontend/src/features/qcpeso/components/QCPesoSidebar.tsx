import { useMemo, useState } from 'react'
import {
  Bell,
  ChevronDown,
  ChevronRight,
  Clock,
  ExternalLink,
  Grid2X2,
  LogOut,
  Menu,
  Search,
  Settings,
  User,
  Users,
} from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import internetLogo from '../../../assets/internet-logo.svg'
import styles from './QCPesoSidebar.module.css'

interface QCPesoSidebarProps {
  isOpen: boolean
  onClose: () => void
}

const MOCK_USER = {
  name: 'Kyle Ethan Porciuncula',
  email: 'flowforgestd@gmail.com',
  initials: 'KE',
}

function QCPesoSidebar({ isOpen, onClose }: QCPesoSidebarProps) {
  const [search, setSearch] = useState('')
  const [manageUsersOpen, setManageUsersOpen] = useState(true)
  const [monitorUsersOpen, setMonitorUsersOpen] = useState(true)
  const navigate = useNavigate()

  const logout = () => {
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
      id="qcpeso-sidebar"
      aria-hidden={!isOpen}
    >
      {/* Brand Header */}
      <div className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.logoBox}>
            <img src={internetLogo} alt="INTERNet Logo" />
          </span>
          <span className={styles.brandName}>INTERNet</span>
        </div>
        <div className={styles.headerActions}>
          <button type="button" aria-label="Notifications">
            <Bell size={18} />
          </button>
          <button type="button" aria-label="Close navigation" onClick={onClose}>
            <Menu size={18} />
          </button>
        </div>
      </div>

      {/* Search Input Box */}
      <label className={styles.searchLabel}>
        <Search size={18} aria-hidden="true" />
        <span className={styles.srOnly}>Search navigation</span>
        <input
          type="search"
          placeholder="Search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          tabIndex={isOpen ? 0 : -1}
        />
      </label>

      {/* Navigation List */}
      <nav className={styles.navigation} aria-label="QC PESO navigation">
        {/* Dashboard */}
        {matchesSearch('Dashboard') && (
          <NavLink
            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
            to="/qcpeso/monitor/referrals"
            onClick={onClose}
            tabIndex={isOpen ? 0 : -1}
          >
            <Grid2X2 size={20} aria-hidden="true" />
            <span>Dashboard</span>
          </NavLink>
        )}

        {/* Manage Users Dropdown Group */}
        {(matchesSearch('Manage Users') ||
          matchesSearch('Manage Applications') ||
          matchesSearch('Manage Employers')) && (
          <div>
            <div
              className={styles.navGroupHeader}
              onClick={() => setManageUsersOpen((prev) => !prev)}
            >
              <div className={styles.navGroupTitle}>
                <User size={20} aria-hidden="true" />
                <span>Manage Users</span>
              </div>
              {manageUsersOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            </div>

            {manageUsersOpen && (
              <div className={styles.navSubList}>
                {matchesSearch('Manage Applications') && (
                  <NavLink
                    className={styles.subNavItem}
                    to="/qcpeso/monitor/referrals"
                    onClick={onClose}
                    tabIndex={isOpen ? 0 : -1}
                  >
                    <span>Manage Applications</span>
                  </NavLink>
                )}
                {matchesSearch('Manage Employers') && (
                  <NavLink
                    className={styles.subNavItem}
                    to="/qcpeso/monitor/referrals"
                    onClick={onClose}
                    tabIndex={isOpen ? 0 : -1}
                  >
                    <span>Manage Employers</span>
                  </NavLink>
                )}
              </div>
            )}
          </div>
        )}

        {/* Monitor Users Dropdown Group */}
        {(matchesSearch('Monitor Users') ||
          matchesSearch('Monitor Referrals') ||
          matchesSearch('Monitor Interns') ||
          matchesSearch('Monitor Attendance')) && (
          <div>
            <div
              className={styles.navGroupHeader}
              onClick={() => setMonitorUsersOpen((prev) => !prev)}
            >
              <div className={styles.navGroupTitle}>
                <Users size={20} aria-hidden="true" />
                <span>Monitor Users</span>
              </div>
              {monitorUsersOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            </div>

            {monitorUsersOpen && (
              <div className={styles.navSubList}>
                {matchesSearch('Monitor Referrals') && (
                  <NavLink
                    className={({ isActive }) =>
                      `${styles.subNavItem} ${isActive ? styles.active : ''}`
                    }
                    to="/qcpeso/monitor/referrals"
                    onClick={onClose}
                    tabIndex={isOpen ? 0 : -1}
                  >
                    <span>Monitor Referrals</span>
                  </NavLink>
                )}
                {matchesSearch('Monitor Interns') && (
                  <NavLink
                    className={({ isActive }) =>
                      `${styles.subNavItem} ${isActive ? styles.active : ''}`
                    }
                    to="/qcpeso/monitor/interns"
                    onClick={onClose}
                    tabIndex={isOpen ? 0 : -1}
                  >
                    <span>Monitor Interns</span>
                  </NavLink>
                )}
                {matchesSearch('Monitor Attendance') && (
                  <NavLink
                    className={styles.subNavItem}
                    to="/qcpeso/monitor/referrals"
                    onClick={onClose}
                    tabIndex={isOpen ? 0 : -1}
                  >
                    <span>Monitor Attendance</span>
                  </NavLink>
                )}
              </div>
            )}
          </div>
        )}

        {/* Reports and Documents */}
        {matchesSearch('Reports and Documents') && (
          <NavLink
            className={styles.navItem}
            to="/qcpeso/monitor/referrals"
            onClick={onClose}
            tabIndex={isOpen ? 0 : -1}
          >
            <Clock size={20} aria-hidden="true" />
            <span>Reports and Documents</span>
          </NavLink>
        )}

        {/* Settings */}
        {matchesSearch('Settings') && (
          <NavLink
            className={styles.navItem}
            to="/qcpeso/monitor/referrals"
            onClick={onClose}
            tabIndex={isOpen ? 0 : -1}
          >
            <Settings size={20} aria-hidden="true" />
            <span>Settings</span>
          </NavLink>
        )}

        {/* Log out */}
        <button
          className={styles.logoutBtn}
          type="button"
          onClick={logout}
          tabIndex={isOpen ? 0 : -1}
        >
          <LogOut size={20} aria-hidden="true" />
          <span>Log out</span>
        </button>
      </nav>

      {/* User Profile Summary at bottom */}
      <div className={styles.userSummary}>
        <div className={styles.userLeft}>
          <span className={styles.avatar} aria-hidden="true">
            {MOCK_USER.initials}
          </span>
          <div className={styles.userText}>
            <span className={styles.userName}>{MOCK_USER.name}</span>
            <span className={styles.userEmail}>{MOCK_USER.email}</span>
          </div>
        </div>
        <ExternalLink size={16} color="#ffffff" aria-hidden="true" />
      </div>
    </aside>
  )
}

export default QCPesoSidebar
