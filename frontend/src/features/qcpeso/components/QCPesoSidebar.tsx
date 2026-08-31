import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import {
  BriefcaseBusiness,
  Building2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Clock,
  ExternalLink,
  Eye,
  Grid2X2,
  LogOut,
  Menu,
  Route,
  Settings,
  UserRound,
  Users,
} from 'lucide-react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import internetLogo from '../../../assets/internet-logo.svg'
import { useAuthStore } from '../../../stores/useAuthStore'
import { useQCPesoStore } from '../stores/useQCPesoStore'
import styles from './QCPesoSidebar.module.css'

interface QCPesoSidebarProps {
  isOpen: boolean
  onClose: () => void
}

function QCPesoSidebar({ isOpen, onClose }: QCPesoSidebarProps) {
  const [search, setSearch] = useState('')
  const [monitorUsersOpen, setMonitorUsersOpen] = useState(false)
  const [manageApplicantsOpen, setManageApplicantsOpen] = useState(false)
  const [manageInternsOpen, setManageInternsOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout: authLogout } = useAuthStore()
  const { profile, fetchProfile } = useQCPesoStore()

  useEffect(() => {
    if (!profile) void fetchProfile()
  }, [fetchProfile, profile])

  const monitorUsersActive = location.pathname.startsWith('/qcpeso/monitor-users')
  const manageApplicantsActive = location.pathname.startsWith('/qcpeso/manage-applicants')
  const manageInternsActive = location.pathname.startsWith('/qcpeso/manage-interns')

  useEffect(() => {
    if (monitorUsersActive) setMonitorUsersOpen(true)
    if (manageApplicantsActive) setManageApplicantsOpen(true)
    if (manageInternsActive) setManageInternsOpen(true)
  }, [manageApplicantsActive, manageInternsActive, monitorUsersActive])

  const matchesSearch = (text: string) => !search.trim() || text.toLowerCase().includes(search.trim().toLowerCase())
  const isProfileActive = location.pathname === '/qcpeso/profile'

  const logout = async () => {
    onClose()
    await authLogout()
    navigate('/', { replace: true })
  }

  const navigateToProfile = () => {
    onClose()
    navigate('/qcpeso/profile')
  }

  const displayName = profile?.fullName || user?.email.split('@')[0] || 'PESO Personnel'
  const userInitials = displayName.substring(0, 2).toUpperCase()

  return (
    <aside className={`${styles.sidebar} ${isOpen ? styles.open : ''}`} id="qcpeso-sidebar" aria-hidden={!isOpen}>
      <div className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.logoBox}><img src={internetLogo} alt="INTERNet Logo" /></span>
          <span className={styles.brandName}>INTERNet</span>
        </div>
        <div className={styles.headerActions}>
          <button type="button" aria-label="Close navigation" onClick={onClose}><Menu size={18} /></button>
        </div>
      </div>

      <label className={styles.searchLabel}>
        <span className={styles.srOnly}>Search navigation</span>
        <input type="search" placeholder="Search" value={search} onChange={(event) => setSearch(event.target.value)} tabIndex={isOpen ? 0 : -1} />
      </label>

      <nav className={styles.navigation} aria-label="QC PESO navigation">
        {matchesSearch('Dashboard') && <NavLink className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`} to="/qcpeso/dashboard" onClick={onClose} tabIndex={isOpen ? 0 : -1}><Grid2X2 size={20} aria-hidden="true" /><span>Dashboard</span></NavLink>}
        {matchesSearch('QC PESO Profile') && <NavLink className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`} to="/qcpeso/profile" onClick={onClose} tabIndex={isOpen ? 0 : -1}><UserRound size={20} aria-hidden="true" /><span>QC PESO Profile</span></NavLink>}

        <NavigationGroup icon={<Users size={20} aria-hidden="true" />} label="Monitor Users" isOpen={monitorUsersOpen} onToggle={() => setMonitorUsersOpen((current) => !current)} visible={matchesSearch('Monitor Users') || matchesSearch('Students') || matchesSearch('Employers')}>
          {matchesSearch('Students') && <SubLink to="/qcpeso/monitor-users/students" label="Students" icon={<UserRound size={18} />} isOpen={isOpen} onClose={onClose} />}
          {matchesSearch('Employers') && <SubLink to="/qcpeso/monitor-users/employers" label="Employers" icon={<Building2 size={18} />} isOpen={isOpen} onClose={onClose} />}
        </NavigationGroup>

        <NavigationGroup icon={<ClipboardCheck size={20} aria-hidden="true" />} label="Manage Applicants" isOpen={manageApplicantsOpen} onToggle={() => setManageApplicantsOpen((current) => !current)} visible={matchesSearch('Manage Applicants') || matchesSearch('Review Applicants') || matchesSearch('Track Referrals')}>
          {matchesSearch('Review Applicants') && <SubLink to="/qcpeso/manage-applicants/review" label="Review Applicants" icon={<Eye size={18} />} isOpen={isOpen} onClose={onClose} />}
          {matchesSearch('Track Referrals') && <SubLink to="/qcpeso/manage-applicants/referrals" label="Track Referrals" icon={<Route size={18} />} isOpen={isOpen} onClose={onClose} />}
        </NavigationGroup>

        <NavigationGroup icon={<BriefcaseBusiness size={20} aria-hidden="true" />} label="Manage Interns" isOpen={manageInternsOpen} onToggle={() => setManageInternsOpen((current) => !current)} visible={matchesSearch('Manage Interns') || matchesSearch('Monitor Attendance') || matchesSearch('Manage Internship')}>
          {matchesSearch('Monitor Attendance') && <SubLink to="/qcpeso/manage-interns/attendance" label="Monitor Attendance" icon={<Clock size={18} />} isOpen={isOpen} onClose={onClose} />}
          {matchesSearch('Manage Internship') && <SubLink to="/qcpeso/manage-interns/internships" label="Manage Internship" icon={<BriefcaseBusiness size={18} />} isOpen={isOpen} onClose={onClose} />}
        </NavigationGroup>

        {matchesSearch('Settings') && <NavLink className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`} to="/qcpeso/settings" onClick={onClose} tabIndex={isOpen ? 0 : -1}><Settings size={20} aria-hidden="true" /><span>Settings</span></NavLink>}
      </nav>

      <div className={`${styles.userSummary} ${isProfileActive ? styles.userSummaryActive : ''}`} onClick={navigateToProfile} role="button" tabIndex={0}>
        <div className={styles.userLeft}>
          <span className={styles.avatar} aria-hidden="true">
            {profile?.avatarUrl ? <img src={profile.avatarUrl} alt="" /> : userInitials}
          </span>
          <div className={styles.userText}><span className={styles.userName}>{displayName}</span><span className={styles.userEmail}>{user?.email}</span></div>
        </div>
        <ExternalLink size={16} aria-hidden="true" className={styles.externalIcon} />
      </div>

      <button className={styles.logoutBtn} type="button" onClick={logout} tabIndex={isOpen ? 0 : -1}><LogOut size={20} aria-hidden="true" /><span>Log out</span></button>
    </aside>
  )
}

interface NavigationGroupProps {
  children: ReactNode
  icon: ReactNode
  isOpen: boolean
  label: string
  onToggle: () => void
  visible: boolean
}

function NavigationGroup({ children, icon, isOpen, label, onToggle, visible }: NavigationGroupProps) {
  if (!visible) return null

  return (
    <div>
      <button type="button" className={styles.navGroupHeader} onClick={onToggle} aria-expanded={isOpen}>
        <span className={styles.navGroupTitle}>{icon}<span>{label}</span></span>
        {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
      </button>
      {isOpen && <div className={styles.navSubList}>{children}</div>}
    </div>
  )
}

interface SubLinkProps {
  icon: ReactNode
  isOpen: boolean
  label: string
  onClose: () => void
  to: string
}

function SubLink({ icon, isOpen, label, onClose, to }: SubLinkProps) {
  return <NavLink className={({ isActive }) => `${styles.subNavItem} ${isActive ? styles.active : ''}`} to={to} onClick={onClose} tabIndex={isOpen ? 0 : -1}>{icon}<span>{label}</span></NavLink>
}

export default QCPesoSidebar
