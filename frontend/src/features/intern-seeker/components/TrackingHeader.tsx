import { ArrowDown } from 'lucide-react'
import headerImage from '../../../assets/requirements-header-image.png'
import qcLogos from '../../../assets/qc-logos.svg'
import styles from './TrackingHeader.module.css'

interface TrackingHeaderProps {
  showSeeMore?: boolean
}

function TrackingHeader({ showSeeMore = true }: TrackingHeaderProps) {
  return (
    <header className={styles.header} style={{ backgroundImage: `url(${headerImage})` }}>
      <img className={styles.logos} src={qcLogos} alt="Quezon City Government and QC PESO" />
      <div className={styles.copy}>
        <h1>My Tracking</h1>
        <p>Track your pre-referral requirements, application<br />status, and attendance.</p>
      </div>
      {showSeeMore && <div className={styles.seeMore} aria-hidden="true"><span>SEE MORE</span><ArrowDown /></div>}
    </header>
  )
}

export default TrackingHeader
