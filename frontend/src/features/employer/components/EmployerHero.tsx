import { Menu, Bell } from 'lucide-react'
import { useOutletContext } from 'react-router-dom'
import headerImage from '../../../assets/requirements-header-image.png'
import qcLogos from '../../../assets/qc-logos.svg'
import styles from './EmployerHero.module.css'

interface EmployerHeroProps {
  title: string
  subtitle: string
  comfortableSpacing?: boolean
  onMenuClick?: () => void
}

export function EmployerHero({ title, subtitle, comfortableSpacing = false, onMenuClick }: EmployerHeroProps) {
  const context = useOutletContext<{ openSidebar?: () => void } | null>()

  const handleMenuClick = () => {
    if (onMenuClick) {
      onMenuClick()
    } else if (context?.openSidebar) {
      context.openSidebar()
    }
  }

  return (
    <header className={styles.hero}>
      <img src={headerImage} alt="" className={styles.background} />
      <div className={styles.overlay} />
      
      {/* Top Navbar Area */}
      <div className={styles.navbar}>
        <div className={styles.navLeft}>
          <button 
            className={styles.iconBtn} 
            aria-label="Menu"
            onClick={handleMenuClick}
            type="button"
          >
            <Menu size={24} color="#ffffff" />
          </button>
          <img
            className={styles.logos}
            src={qcLogos}
            alt="Quezon City Government and QC PESO"
          />
        </div>
        <div className={styles.navRight}>
          <button className={styles.iconBtn} aria-label="Notifications" type="button">
            <Bell size={24} color="#ffffff" />
          </button>
        </div>
      </div>

      <div className={`${styles.content} ${comfortableSpacing ? styles.comfortableSpacing : ''}`}>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
    </header>
  )
}

