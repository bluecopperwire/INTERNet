import { useTrackingData } from '../components/TrackingDataContext'

export function useApplications() {
  const { applications, applicationsError, isInitializing } = useTrackingData()

  return { applications: applications ?? [], isLoading: isInitializing, error: applicationsError }
}
