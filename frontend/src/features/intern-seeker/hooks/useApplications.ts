import { useEffect, useState } from 'react'
import { applicationsService } from '../services/applications.service'
import type { UserApplication } from '../types/application.types'

export function useApplications() {
  const [applications, setApplications] = useState<UserApplication[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true
    applicationsService.getMyApplications()
      .then((data) => { if (isActive) setApplications(data) })
      .catch(() => { if (isActive) setError('Unable to load your applications.') })
      .finally(() => { if (isActive) setIsLoading(false) })
    return () => { isActive = false }
  }, [])

  return { applications, isLoading, error }
}
