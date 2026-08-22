import { useTrackingData } from '../components/TrackingDataContext'

export function useApplications() {
  const { applications, applicationsError, isInitializing, withdrawApplication, respondToOffer, deleteApplication } = useTrackingData()

  return { applications: applications ?? [], isLoading: isInitializing, error: applicationsError, withdrawApplication, respondToOffer, deleteApplication }
}
