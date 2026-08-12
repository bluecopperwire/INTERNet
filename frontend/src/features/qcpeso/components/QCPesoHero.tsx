import headerImage from '../../../assets/requirements-header-image.png'
import qcLogos from '../../../assets/qc-logos.svg'
import styles from './QCPesoHero.module.css'

interface QCPesoHeroProps {
  title: string
  subtitle: string
  comfortableSpacing?: boolean
}

function QCPesoHero({ title, subtitle, comfortableSpacing = false }: QCPesoHeroProps) {
  return (
    <header className={styles.hero}>
      <img src={headerImage} alt="" className={styles.background} />
      <div className={styles.overlay} />
      <img
        className={styles.logos}
        src={qcLogos}
        alt="Quezon City Government and QC PESO"
      />
      <div className={`${styles.content} ${comfortableSpacing ? styles.comfortableSpacing : ''}`}>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
    </header>
  )
}

export default QCPesoHero
