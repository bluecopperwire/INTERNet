import { useEffect, useState } from 'react'
import {
  Grid2X2,
  Building2,
  Briefcase,
  ChevronDown,
  ChevronRight,
  ClipboardPlus,
  Users,
  UserRoundCheck,
  Clock,
  FileText,
  Settings,
  LogOut,
  Menu,
} from 'lucide-react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import internetLogo from '../../../assets/internet-logo.svg'
import { useAuthStore } from '../../../stores/useAuthStore'
import styles from './EmployerSidebar.module.css'

interface EmployerSidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function EmployerSidebar({ isOpen, onClose }: EmployerSidebarProps) {
  const [search, setSearch] = useState('')
  const [applicantsExpanded, setApplicantsExpanded] = useState(false)
  const [internsExpanded, setInternsExpanded] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { logout: authLogout } = useAuthStore()

  const handleLogout = async () => {
    onClose()
    await authLogout()
    navigate('/', { replace: true })
  }

  const matchesSearch = (text: string) => {
    if (!search.trim()) return true
    return text.toLowerCase().includes(search.trim().toLowerCase())
  }

  const applicantsActive = location.pathname.startsWith('/employer/applicants') || location.pathname.startsWith('/employer/internship-assignments') || location.pathname.startsWith('/employer/referrals-history')
  const internsActive = location.pathname.startsWith('/employer/attendance') || location.pathname.startsWith('/employer/manage-internship')
  const showApplicantsGroup = matchesSearch('Referrals') || matchesSearch('Review Referrals') || matchesSearch('Create Internship Assignment') || matchesSearch('Referrals History')
  const showInternsGroup = matchesSearch('Interns') || matchesSearch('Monitor Attendance') || matchesSearch('Manage Internship')
  const applicantsOpen = applicantsExpanded || Boolean(search.trim())
  const internsOpen = internsExpanded || Boolean(search.trim())

  useEffect(() => {
    if (applicantsActive) setApplicantsExpanded(true)
    if (internsActive) setInternsExpanded(true)
  }, [applicantsActive, internsActive])

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

        {showApplicantsGroup && (
          <div className={styles.navGroup}>
            <button
              type="button"
              className={styles.navGroupButton}
              onClick={() => setApplicantsExpanded((expanded) => !expanded)}
              aria-expanded={applicantsOpen}
              tabIndex={isOpen ? 0 : -1}
            >
              <Users size={20} />
              <span>Referrals</span>
              {applicantsOpen ? <ChevronDown className={styles.groupChevron} /> : <ChevronRight className={styles.groupChevron} />}
            </button>
            {applicantsOpen && (
              <div className={styles.subNav}>
                {matchesSearch('Review Referrals') && <NavLink className={({ isActive }) => `${styles.subNavItem} ${isActive ? styles.active : ''}`} to="/employer/applicants" onClick={onClose} tabIndex={isOpen ? 0 : -1}><Users size={17} /><span>Review Referrals</span></NavLink>}
                {matchesSearch('Create Internship Assignment') && <NavLink className={({ isActive }) => `${styles.subNavItem} ${isActive ? styles.active : ''}`} to="/employer/internship-assignments" onClick={onClose} tabIndex={isOpen ? 0 : -1}><ClipboardPlus size={17} /><span>Create Internship Assignment</span></NavLink>}
                {matchesSearch('Referrals History') && <NavLink className={({ isActive }) => `${styles.subNavItem} ${isActive ? styles.active : ''}`} to="/employer/referrals-history" onClick={onClose} tabIndex={isOpen ? 0 : -1}><FileText size={17} /><span>Referrals History</span></NavLink>}
              </div>
            )}
          </div>
        )}

        {showInternsGroup && (
          <div className={styles.navGroup}>
            <button
              type="button"
              className={styles.navGroupButton}
              onClick={() => setInternsExpanded((expanded) => !expanded)}
              aria-expanded={internsOpen}
              tabIndex={isOpen ? 0 : -1}
            >
              <UserRoundCheck size={20} />
              <span>Interns</span>
              {internsOpen ? <ChevronDown className={styles.groupChevron} /> : <ChevronRight className={styles.groupChevron} />}
            </button>
            {internsOpen && (
              <div className={styles.subNav}>
                {matchesSearch('Monitor Attendance') && <NavLink className={({ isActive }) => `${styles.subNavItem} ${isActive ? styles.active : ''}`} to="/employer/attendance" onClick={onClose} tabIndex={isOpen ? 0 : -1}><Clock size={17} /><span>Monitor Attendance</span></NavLink>}
                {matchesSearch('Manage Internship') && <NavLink className={({ isActive }) => `${styles.subNavItem} ${isActive ? styles.active : ''}`} to="/employer/manage-internship" onClick={onClose} tabIndex={isOpen ? 0 : -1}><UserRoundCheck size={17} /><span>Manage Internship</span></NavLink>}
              </div>
            )}
          </div>
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
