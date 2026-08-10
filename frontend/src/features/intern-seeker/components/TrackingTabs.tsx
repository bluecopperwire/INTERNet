import { NavLink } from 'react-router-dom'
import styles from './TrackingTabs.module.css'

function TrackingTabs() {
  return (
    <nav className={styles.tabs} aria-label="Tracking sections">
      <NavLink className={({ isActive }) => isActive ? styles.activeTab : ''} end to="/intern-seeker/requirements">Requirements</NavLink>
      <NavLink className={({ isActive }) => isActive ? styles.activeTab : ''} to="/intern-seeker/application-status">Application Status</NavLink>
      <NavLink className={({ isActive }) => isActive ? styles.activeTab : ''} to="/intern-seeker/attendance">Attendance</NavLink>
    </nav>
  )
}

export default TrackingTabs
