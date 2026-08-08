import { useMemo, useState } from 'react'
import {
  Bell,
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
import styles from './InternSeekerSidebar.module.css'

interface InternSeekerSidebarProps {
  isOpen: boolean
  onClose: () => void
}

const NAVIGATION = [
  { label: 'Internship Portal', path: '/intern-seeker', icon: Grid2X2, end: true },
  { label: 'User Profile', path: '/intern-seeker/profile', icon: UserRound },
  { label: 'DigiCV', path: '/intern-seeker/digicv', icon: ShieldCheck },
  { label: 'Requirements', path: '/intern-seeker/requirements', icon: BriefcaseBusiness },
]

const MOCK_USER = {
  name: 'Kyle Ethan Porciuncula',
  email: 'flowforgestd@gmail.com',
  initials: 'KE',
}

function InternSeekerSidebar({ isOpen, onClose }: InternSeekerSidebarProps) {
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  const filteredNavigation = useMemo(() => {
    const query = search.trim().toLowerCase()
    return query
      ? NAVIGATION.filter((item) => item.label.toLowerCase().includes(query))
      : NAVIGATION
  }, [search])

  const logout = () => {
    onClose()
    navigate('/')
  }

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
          <button type="button" aria-label="Notifications"><Bell /></button>
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

      <div className={styles.userSummary}>
        <span className={styles.avatar} aria-hidden="true">{MOCK_USER.initials}</span>
        <span className={styles.userText}>
          <strong>{MOCK_USER.name}</strong>
          <small>{MOCK_USER.email}</small>
        </span>
        <ExternalLink aria-hidden="true" />
      </div>

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
