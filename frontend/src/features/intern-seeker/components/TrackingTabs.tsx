import { NavLink } from 'react-router-dom'
import styles from './TrackingTabs.module.css'

function TrackingTabs() {
  return (
    <nav className={styles.tabs} aria-label="Tracking sections">
      <NavLink className={({ isActive }) => (isActive ? styles.activeTab : '')} end to="/intern-seeker/requirements">
        My Requirements
      </NavLink>
      <NavLink className={({ isActive }) => (isActive ? styles.activeTab : '')} to="/intern-seeker/application-status">
        My Applications
      </NavLink>
      <NavLink className={({ isActive }) => (isActive ? styles.activeTab : '')} to="/intern-seeker/internship">
        My Internship
      </NavLink>
      <NavLink className={({ isActive }) => (isActive ? styles.activeTab : '')} to="/intern-seeker/attendance">
        My Attendance
      </NavLink>
      <NavLink className={({ isActive }) => (isActive ? styles.activeTab : '')} to="/intern-seeker/internship-history">
        My Internship History
      </NavLink>
    </nav>
  )
}

export default TrackingTabs
