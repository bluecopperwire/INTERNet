import { useCallback, useEffect, useState } from 'react'
import { requirementsService } from '../services/requirements.service'
import type { InternshipRequirement } from '../types/requirement.types'

export function useRequirements() {
  const [requirements, setRequirements] = useState<InternshipRequirement[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true
    requirementsService.getRequirements()
      .then((data) => { if (isActive) setRequirements(data) })
      .catch(() => { if (isActive) setError('Unable to load your requirements.') })
      .finally(() => { if (isActive) setIsLoading(false) })
    return () => { isActive = false }
  }, [])

  const uploadRequirement = useCallback(async (requirementId: string, file: File) => {
    setUploadingId(requirementId)
    setError(null)
    try {
      const updated = await requirementsService.uploadRequirement({ requirementId, file })
      setRequirements((current) => current.map((item) => item.id === requirementId ? updated : item))
      return true
    } catch {
      setError('The document could not be uploaded. Please try again.')
      return false
    } finally {
      setUploadingId(null)
    }
  }, [])

  return { requirements, isLoading, uploadingId, error, setError, uploadRequirement }
}
