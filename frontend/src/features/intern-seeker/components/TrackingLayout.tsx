import { Outlet } from 'react-router-dom'
import TrackingHeader from './TrackingHeader'
import TrackingTabs from './TrackingTabs'
import { TrackingDataProvider } from './TrackingDataContext'
import styles from './TrackingLayout.module.css'

function TrackingLayout() {
  return (
    <TrackingDataProvider>
      <main className={styles.page}>
        <TrackingHeader showSeeMore={false} />
        <section className={styles.trackingContent}>
          <TrackingTabs />
          <Outlet />
        </section>
      </main>
    </TrackingDataProvider>
  )
}

export default TrackingLayout
