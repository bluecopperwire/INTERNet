import { useEffect, useState, useMemo } from 'react'
import { Plus, SlidersHorizontal } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { EmployerHero } from '../components/EmployerHero'
import { ViewApplicantsModal } from '../components/ViewApplicantsModal'
import { employerService, formatOpportunityDeadline } from '../services/employer.service'
import type { Opportunity } from '../types/employer.types'
import styles from './OpportunitiesPage.module.css'

export function OpportunitiesPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('All')
  const [opportunityForApplicants, setOpportunityForApplicants] = useState<Opportunity | null>(null)

  const requestedApplicantsId = searchParams.get('viewApplicants')

  useEffect(() => {
    fetchOpportunities()
  }, [])

  useEffect(() => {
    if (!requestedApplicantsId || opportunities.length === 0) return
    const opportunity = opportunities.find((item) => item.id === requestedApplicantsId)
    if (opportunity) setOpportunityForApplicants(opportunity)
  }, [opportunities, requestedApplicantsId])

  const closeApplicants = () => {
    setOpportunityForApplicants(null)
    if (requestedApplicantsId) {
      setSearchParams((current) => {
        const next = new URLSearchParams(current)
        next.delete('viewApplicants')
        return next
      })
    }
  }

  const fetchOpportunities = async () => {
    setIsLoading(true)
    try {
      const data = await employerService.getOpportunities()
      setOpportunities(data)
    } catch (error) {
      console.error('Failed to fetch opportunities:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredOpportunities = useMemo(() => {
    if (statusFilter === 'All') return opportunities
    return opportunities.filter((opportunity) => opportunity.status === statusFilter)
  }, [opportunities, statusFilter])

  if (isLoading) {
    return (
      <main className={styles.pageContainer}>
        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading Opportunities...</div>
      </main>
    )
  }

  return (
    <main className={styles.pageContainer}>
      <EmployerHero
        title="Opportunities"
        subtitle="Create and add more opportunities!"
        comfortableSpacing
      />

      <section className={styles.mainContent}>
        <div className={styles.toolbar}>
          <div className={styles.statusFilter}>
            <SlidersHorizontal size={16} aria-hidden="true" />
            <select
              aria-label="Filter opportunities by status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Open">Open</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
          <button 
            className={styles.createBtn}
            onClick={() => navigate('/employer/opportunities/create')}
          >
            <Plus size={20} />
            <span>Create Opportunity</span>
          </button>
        </div>

        <div className={styles.cardsList}>
          {filteredOpportunities.length === 0 ? (
            <div className={styles.noData}>No opportunities found.</div>
          ) : (
            filteredOpportunities.map((opp) => (
              <div key={opp.id} className={styles.opportunityCard}>
                <div className={styles.cardHeader}>
                  <div className={styles.leftCol}>
                    <h3 className={styles.title}>{opp.title}</h3>
                    <p className={styles.detail}>
                      <span className={styles.label}>DEPARTMENT:</span> {opp.department}
                    </p>
                    <p className={styles.detail}>
                      <span className={styles.label}>APPLICATION DEADLINE:</span> {formatOpportunityDeadline(opp.applicationDeadline)}
                    </p>
                  </div>
                  <div className={styles.rightCol}>
                    <p className={styles.statusText}>
                      Status: <span className={`${styles.statusValue} ${styles[opp.status.toLowerCase()]}`}>{opp.status}</span>
                    </p>
                    <p className={styles.applicantsText}>
                      Applicants: {opp.applicants}
                    </p>
                  </div>
                </div>
                <div className={styles.cardActions}>
                  <button 
                    className={styles.actionBtn}
                    onClick={() => setOpportunityForApplicants(opp)}
                  >
                    View Applicants
                  </button>
                  <button 
                    className={styles.actionBtn}
                    onClick={() => navigate(`/employer/opportunities/${opp.id}`)}
                  >
                    View Opportunity
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {opportunityForApplicants && (
        <ViewApplicantsModal 
          opportunity={opportunityForApplicants}
          onClose={closeApplicants}
        />
      )}
    </main>
  )
}

export default OpportunitiesPage
