import { Menu, Bell } from 'lucide-react'
import headerImage from '../../../assets/requirements-header-image.png'
import qcLogos from '../../../assets/qc-logos.svg'
import styles from './EmployerHero.module.css'

interface EmployerHeroProps {
  title: string
  subtitle: string
  comfortableSpacing?: boolean
}

export function EmployerHero({ title, subtitle, comfortableSpacing = false }: EmployerHeroProps) {
  return (
    <header className={styles.hero}>
      <img src={headerImage} alt="" className={styles.background} />
      <div className={styles.overlay} />
      
      {/* Top Navbar Area (Placeholder for integration) */}
      <div className={styles.navbar}>
        <div className={styles.navLeft}>
          <button className={styles.iconBtn} aria-label="Menu">
            <Menu size={24} color="#ffffff" />
          </button>
          <img
            className={styles.logos}
            src={qcLogos}
            alt="Quezon City Government and QC PESO"
          />
        </div>
        <div className={styles.navRight}>
          <button className={styles.iconBtn} aria-label="Notifications">
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
