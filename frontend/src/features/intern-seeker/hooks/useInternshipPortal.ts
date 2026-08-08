import { useCallback, useEffect, useState } from 'react'
import { internshipPortalService } from '../services/internship-portal.service'
import type { InternshipPortalData, OpportunitySearchParams } from '../types/internship.types'

const EMPTY_DATA: InternshipPortalData = { opportunities: [], companies: [] }

export function useInternshipPortal() {
  const [data, setData] = useState<InternshipPortalData>(EMPTY_DATA)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true

    internshipPortalService
      .getPortalData()
      .then((portalData) => {
        if (isActive) setData(portalData)
      })
      .catch(() => {
        if (isActive) setError('Unable to load internship opportunities.')
      })
      .finally(() => {
        if (isActive) setIsLoading(false)
      })

    return () => {
      isActive = false
    }
  }, [])

  const search = useCallback(async (params: OpportunitySearchParams) => {
    setIsLoading(true)
    setError(null)

    try {
      setData(await internshipPortalService.searchOpportunities(params))
    } catch {
      setError('Unable to search internship opportunities.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { data, isLoading, error, search }
}
