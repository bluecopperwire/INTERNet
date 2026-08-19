import headerImage from '../../../assets/requirements-header-image.png'
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

      <div className={`${styles.content} ${comfortableSpacing ? styles.comfortableSpacing : ''}`}>
        {title && <h1>{title}</h1>}
        {subtitle && <p>{subtitle}</p>}
      </div>
    </header>
  )
}

