import { useCallback, useState } from 'react'
import { useTrackingData } from '../components/TrackingDataContext'

export function useRequirements() {
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const { requirements, isInitializing, requirementsError, setRequirementsError, uploadRequirement: saveRequirement, deleteRequirement: removeRequirement } = useTrackingData()

  const uploadRequirement = useCallback(async (requirementId: string, file: File) => {
    setUploadingId(requirementId)
    setRequirementsError(null)
    try {
      await saveRequirement({ requirementId, file })
      return true
    } catch {
      return false
    } finally {
      setUploadingId(null)
    }
  }, [saveRequirement, setRequirementsError])

  const deleteRequirement = useCallback(async (requirementId: string) => {
    setRequirementsError(null)
    try {
      await removeRequirement(requirementId)
      return true
    } catch {
      return false
    }
  }, [removeRequirement, setRequirementsError])

  return {
    requirements: requirements ?? [],
    isLoading: isInitializing,
    uploadingId,
    error: requirementsError,
    setError: setRequirementsError,
    uploadRequirement,
    deleteRequirement,
  }
}
