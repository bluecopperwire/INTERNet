import { Outlet } from 'react-router-dom'
import TrackingHeader from './TrackingHeader'
import TrackingTabs from './TrackingTabs'
import { TrackingDataProvider } from './TrackingDataContext'
import styles from './TrackingLayout.module.css'

function TrackingLayout() {
  return (
    <TrackingDataProvider>
      <main className={styles.page}>
        <TrackingHeader />
        <section className={styles.trackingContent}>
          <TrackingTabs />
          <Outlet />
        </section>
      </main>
    </TrackingDataProvider>
  )
}

export default TrackingLayout
