import { useEffect, useMemo, useState } from 'react'
import {
  BriefcaseBusiness,
  ExternalLink,
  Grid2X2,
  LogOut,
  Menu,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import internetLogo from '../../../assets/internet-logo.svg'
import { useAuthStore } from '../../../stores/useAuthStore'
import { useStudentStore } from '../stores/useStudentStore'
import styles from './InternSeekerSidebar.module.css'

interface InternSeekerSidebarProps {
  isOpen: boolean
  onClose: () => void
}

const NAVIGATION = [
  { label: 'Internship Portal', path: '/intern-seeker', icon: Grid2X2, end: true },
  { label: 'User Profile', path: '/intern-seeker/profile', icon: UserRound },
  { label: 'DigiCV', path: '/intern-seeker/digicv', icon: ShieldCheck },
  { label: 'My Tracking', path: '/intern-seeker/requirements', icon: BriefcaseBusiness },
]

function InternSeekerSidebar({ isOpen, onClose }: InternSeekerSidebarProps) {
  const [search, setSearch] = useState('')
  const navigate = useNavigate()
  const { user, logout: authLogout } = useAuthStore()
  const { profile, fetchProfile } = useStudentStore()

  useEffect(() => {
    if (!profile) void fetchProfile()
  }, [fetchProfile, profile])

  const filteredNavigation = useMemo(() => {
    const query = search.trim().toLowerCase()
    return query
      ? NAVIGATION.filter((item) => item.label.toLowerCase().includes(query))
      : NAVIGATION
  }, [search])

  const logout = async () => {
    onClose()
    await authLogout()
    navigate('/', { replace: true })
  }

  const profileName = profile
    ? [profile.firstName, profile.middleName, profile.lastName]
        .filter(Boolean)
        .join(' ')
    : ''
  const displayName = profileName || user?.email.split('@')[0] || 'Intern Seeker'
  const userInitials = displayName.substring(0, 2).toUpperCase()

  return (
    <aside
      className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}
      id="intern-seeker-sidebar"
      aria-hidden={!isOpen}
    >
      <div className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.logoBox}><img src={internetLogo} alt="" /></span>
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

      <nav className={styles.navigation} aria-label="Intern Seeker navigation">
        {filteredNavigation.map(({ label, path, icon: Icon, end }) => (
          <NavLink
            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
            end={end}
            key={path}
            to={path}
            onClick={onClose}
            tabIndex={isOpen ? 0 : -1}
          >
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
        {filteredNavigation.length === 0 && <p className={styles.noResults}>No pages found</p>}
      </nav>

      <button
        className={styles.userSummary}
        type="button"
        onClick={() => { onClose(); navigate('/intern-seeker/profile') }}
        tabIndex={isOpen ? 0 : -1}
      >
        <span className={styles.avatar} aria-hidden="true">
          {profile?.photoUrl ? <img src={profile.photoUrl} alt="" /> : userInitials}
        </span>
        <span className={styles.userText}>
          <strong>{displayName}</strong>
          <small>{user?.email}</small>
        </span>
        <ExternalLink aria-hidden="true" />
      </button>

      <button
        className={styles.logout}
        type="button"
        onClick={logout}
        tabIndex={isOpen ? 0 : -1}
      >
        <LogOut aria-hidden="true" />
        <span>Log out</span>
      </button>
    </aside>
  )
}

export default InternSeekerSidebar
