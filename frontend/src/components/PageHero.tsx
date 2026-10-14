import headerImage from '../assets/requirements-header-image.png'
import styles from './PageHero.module.css'

interface PageHeroProps {
  title?: string
  subtitle?: string
}

export function PageHero({ title = '', subtitle = '' }: PageHeroProps) {
  return (
    <header className={styles.hero}>
      <img src={headerImage} alt="" className={styles.background} />
      <div className={styles.overlay} />
      <div className={styles.content}>
        {title && <h1>{title}</h1>}
        {subtitle && <p>{subtitle}</p>}
      </div>
    </header>
  )
}

export default PageHero
