import { useEffect, useState } from 'react'
import { Menu } from 'lucide-react'
import { Outlet, useLocation } from 'react-router-dom'
import InternSeekerSidebar from './InternSeekerSidebar'
import styles from './InternSeekerLayout.module.css'

function InternSeekerLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const location = useLocation()
  const isPortalPage = location.pathname === '/intern-seeker' || location.pathname === '/intern-seeker/'

  useEffect(() => {
    if (!isSidebarOpen) return

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsSidebarOpen(false)
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [isSidebarOpen])

  return (
    <div className={styles.shell}>
      <button
        className={`${styles.menuTrigger} ${isPortalPage ? styles.heroMenuTrigger : ''}`}
        type="button"
        aria-label="Open navigation"
        aria-expanded={isSidebarOpen}
        aria-controls="intern-seeker-sidebar"
        onClick={() => setIsSidebarOpen(true)}
      >
        <Menu aria-hidden="true" />
      </button>

      <InternSeekerSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {isSidebarOpen && (
        <button
          className={styles.backdrop}
          type="button"
          aria-label="Close navigation"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className={styles.content}>
        <Outlet />
      </div>
    </div>
  )
}

export default InternSeekerLayout
