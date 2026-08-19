import { useEffect, useState } from 'react'
import { Menu } from 'lucide-react'
import { Outlet } from 'react-router-dom'
import EmployerSidebar from './EmployerSidebar'
import styles from './EmployerLayout.module.css'

export interface EmployerLayoutContext {
  openSidebar: () => void
}

export function EmployerLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  useEffect(() => {
    if (!isSidebarOpen) return

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsSidebarOpen(false)
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [isSidebarOpen])

  const openSidebar = () => setIsSidebarOpen(true)

  return (
    <div className={styles.shell}>
      <button
        className={styles.menuTrigger}
        type="button"
        aria-label="Open navigation"
        aria-expanded={isSidebarOpen}
        aria-controls="employer-sidebar"
        onClick={openSidebar}
      >
        <Menu aria-hidden="true" />
      </button>

      <EmployerSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {isSidebarOpen && (
        <button
          className={styles.backdrop}
          type="button"
          aria-label="Close navigation"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className={styles.content}>
        <Outlet context={{ openSidebar } satisfies EmployerLayoutContext} />
      </div>
    </div>
  )
}

export default EmployerLayout
