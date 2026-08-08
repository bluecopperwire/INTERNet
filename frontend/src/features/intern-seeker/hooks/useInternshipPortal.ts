import { useCallback, useEffect, useState } from 'react'
import { internshipPortalService } from '../services/internship-portal.service'
import type { 
  InternshipPortalData, 
  OpportunitySearchParams,
  UserProfile, 
  Resume, 
  UserApplication
 } from '../types/internship.types'

const EMPTY_DATA: InternshipPortalData = { opportunities: [], companies: [] }

export function useInternshipPortal() {
  const [data, setData] = useState<InternshipPortalData>(EMPTY_DATA)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [resumes, setResumes] = useState<Resume[]>([])
  const [applications, setApplications] = useState<UserApplication[]>([])

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

const fetchDashboardData = useCallback(async () => {
    try {
      const [profileData, resumesData, appsData] = await Promise.all([
        internshipPortalService.getUserProfile(),
        internshipPortalService.getUserResumes(),
        internshipPortalService.getUserApplications()
      ])
      setProfile(profileData)
      setResumes(resumesData)
      setApplications(appsData)
    } catch (err) {
      console.error(err)
      setError('Unable to load dashboard data.')
    }
  }, [])

  useEffect(() => {
    let isActive = true
    setIsLoading(true)

    Promise.all([
      internshipPortalService.getPortalData(),
      fetchDashboardData()
    ])
      .then(([portalData]) => {
        if (isActive) setData(portalData)
      })
      .catch(() => {
        if (isActive) setError('Unable to load data.')
      })
      .finally(() => {
        if (isActive) setIsLoading(false)
      })

    return () => {
      isActive = false
    }
  }, [fetchDashboardData])

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

  const saveProfile = useCallback(async (updates: Partial<UserProfile>) => {
    setIsLoading(true)
    setError(null)
    try {
      const updated = await internshipPortalService.updateUserProfile(updates)
      setProfile(updated)
      return true
    } catch {
      setError('Failed to update profile.')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { 
    data, search, 
    profile, resumes, applications, saveProfile, 
    isLoading, error 
  }
}
