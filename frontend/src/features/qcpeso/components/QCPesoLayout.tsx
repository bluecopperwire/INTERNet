import { useEffect, useState } from 'react'
import { Menu } from 'lucide-react'
import { Outlet } from 'react-router-dom'
import QCPesoSidebar from './QCPesoSidebar'
import styles from './QCPesoLayout.module.css'

export function QCPesoLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

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
        className={styles.menuTrigger}
        type="button"
        aria-label="Open navigation"
        aria-expanded={isSidebarOpen}
        aria-controls="qcpeso-sidebar"
        onClick={() => setIsSidebarOpen(true)}
      >
        <Menu aria-hidden="true" />
      </button>

      <QCPesoSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

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

export default QCPesoLayout
