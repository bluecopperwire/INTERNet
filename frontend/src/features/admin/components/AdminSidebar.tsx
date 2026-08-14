import { useState } from 'react'
import {
  Bell,
  ExternalLink,
  Grid2X2,
  HardDrive,
  LogOut,
  Menu,
  Search,
  UserCheck,
  UserCog,
  Users,
} from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import internetLogo from '../../../assets/internet-logo.svg'
import styles from './AdminSidebar.module.css'

interface AdminSidebarProps {
  isOpen: boolean
  onClose: () => void
}

const MOCK_ADMIN = {
  name: 'System Administrator',
  email: 'admin@quezoncity.gov.ph',
  initials: 'SA',
}

export function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const [search, setSearch] = useState('')
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
      id="admin-sidebar"
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

      {/* Search Bar */}
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

      {/* Navigation List matching Admin snippet */}
      <nav className={styles.navigation} aria-label="System Admin navigation">
        {matchesSearch('Dashboard') && (
          <NavLink
            className={({ isActive }) =>
              isActive ? styles.navActiveItem : styles.navItem
            }
            to="/admin/dashboard"
            onClick={onClose}
            tabIndex={isOpen ? 0 : -1}
          >
            <Grid2X2 size={20} aria-hidden="true" />
            <span>Dashboard</span>
          </NavLink>
        )}

        {matchesSearch('Manage Students') && (
          <NavLink
            className={({ isActive }) =>
              isActive ? styles.navActiveItem : styles.navSubItem
            }
            to="/admin/manage-students"
            onClick={onClose}
            tabIndex={isOpen ? 0 : -1}
          >
            <Users size={18} aria-hidden="true" />
            <span>Manage Students</span>
          </NavLink>
        )}

        {matchesSearch('Manage Employers') && (
          <NavLink
            className={({ isActive }) =>
              isActive ? styles.navActiveItem : styles.navSubItem
            }
            to="/admin/manage-employers"
            onClick={onClose}
            tabIndex={isOpen ? 0 : -1}
          >
            <UserCheck size={18} aria-hidden="true" />
            <span>Manage Employers</span>
          </NavLink>
        )}

        {matchesSearch('Manage QC PESO') && (
          <NavLink
            className={({ isActive }) =>
              isActive ? styles.navActiveItem : styles.navSubItem
            }
            to="/admin/manage-qcpeso"
            onClick={onClose}
            tabIndex={isOpen ? 0 : -1}
          >
            <UserCog size={18} aria-hidden="true" />
            <span>Manage QC PESO</span>
          </NavLink>
        )}

        {matchesSearch('Backups and Maintenance') && (
          <NavLink
            className={({ isActive }) =>
              isActive ? styles.navActiveItem : styles.navItem
            }
            to="/admin/backups-maintenance"
            onClick={onClose}
            tabIndex={isOpen ? 0 : -1}
          >
            <HardDrive size={20} aria-hidden="true" />
            <span>Backups and Maintenance</span>
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

      {/* User Profile Summary */}
      <div className={styles.userSummary}>
        <div className={styles.userLeft}>
          <span className={styles.avatar} aria-hidden="true">
            {MOCK_ADMIN.initials}
          </span>
          <div className={styles.userText}>
            <span className={styles.userName}>{MOCK_ADMIN.name}</span>
            <span className={styles.userEmail}>{MOCK_ADMIN.email}</span>
          </div>
        </div>
        <ExternalLink size={16} color="#ffffff" aria-hidden="true" />
      </div>
    </aside>
  )
}

export default AdminSidebar
