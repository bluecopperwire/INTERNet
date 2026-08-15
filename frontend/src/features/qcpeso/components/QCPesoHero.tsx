import headerImage from '../../../assets/requirements-header-image.png'
import styles from './QCPesoHero.module.css'

interface QCPesoHeroProps {
  title?: string
  subtitle?: string
}

export function QCPesoHero({
  title = 'Monitor User',
  subtitle = 'QCPESO Referral Monitoring',
}: QCPesoHeroProps) {
  return (
    <header className={styles.heroHeader}>
      <img src={headerImage} alt="" className={styles.heroBgImage} />
      <div className={styles.heroOverlay} />
      <div className={styles.heroContent}>
        <h1 className={styles.heroTitle}>{title}</h1>
        <p className={styles.heroSubtitle}>{subtitle}</p>
      </div>
    </header>
  )
}

export default QCPesoHero