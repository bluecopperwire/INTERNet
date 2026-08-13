import { useEffect, useState, useMemo } from 'react'
import { Plus, SlidersHorizontal } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { EmployerHero } from '../components/EmployerHero'
import { ViewApplicantsModal } from '../components/ViewApplicantsModal'
import { employerService } from '../services/employer.service'
import type { Opportunity } from '../types/employer.types'
import styles from './OpportunitiesPage.module.css'

export function OpportunitiesPage() {
  const navigate = useNavigate()
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('All')
  const [departmentFilter, setDepartmentFilter] = useState<string>('All')
  const [durationFilter, setDurationFilter] = useState<string>('All')
  const [slotsFilter, setSlotsFilter] = useState<string>('All')

  const [showFilterMenu, setShowFilterMenu] = useState(false)
  const [opportunityToDelete, setOpportunityToDelete] = useState<string | null>(null)
  const [opportunityForApplicants, setOpportunityForApplicants] = useState<Opportunity | null>(null)

  useEffect(() => {
    fetchOpportunities()
  }, [])

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

  const handleDelete = async (id: string) => {
    try {
      await employerService.deleteOpportunity(id)
      setOpportunities((prev) => prev.filter((opp) => opp.id !== id))
      setOpportunityToDelete(null)
    } catch (error) {
      console.error('Failed to delete opportunity:', error)
    }
  }

  const uniqueStatuses = useMemo(() => ['All', ...new Set(opportunities.map(o => o.status))], [opportunities])
  const uniqueDepartments = useMemo(() => ['All', ...new Set(opportunities.map(o => o.department))], [opportunities])
  const uniqueDurations = useMemo(() => ['All', ...new Set(opportunities.map(o => o.duration.toString()))], [opportunities])
  const uniqueSlots = useMemo(() => ['All', ...new Set(opportunities.map(o => o.slots.toString()))], [opportunities])

  const filteredOpportunities = useMemo(() => {
    return opportunities.filter(opp => {
      let matches = true
      if (statusFilter !== 'All') matches = matches && opp.status === statusFilter
      if (departmentFilter !== 'All') matches = matches && opp.department === departmentFilter
      if (durationFilter !== 'All') matches = matches && opp.duration.toString() === durationFilter
      if (slotsFilter !== 'All') matches = matches && opp.slots.toString() === slotsFilter
      return matches
    })
  }, [opportunities, statusFilter, departmentFilter, durationFilter, slotsFilter])

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
          <div className={styles.filterWrapper}>
            <button 
              className={styles.filterBtn} 
              aria-label="Filter"
              onClick={() => setShowFilterMenu(!showFilterMenu)}
            >
              <SlidersHorizontal size={24} color="#160e6f" />
              <span className={styles.filterBtnText}>Filter</span>
            </button>
          </div>
          <button 
            className={styles.createBtn}
            onClick={() => navigate('/employer/opportunities/create')}
          >
            <Plus size={20} />
            <span>Create Opportunity</span>
          </button>
        </div>

        {showFilterMenu && (
          <div className={styles.filterMenuRow}>
            <div className={styles.filterItem}>
              <span className={styles.filterLabel}>Status:</span>
              <select className={styles.filterSelect} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                {uniqueStatuses.map(s => <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>)}
              </select>
            </div>
            <div className={styles.filterItem}>
              <span className={styles.filterLabel}>Department:</span>
              <select className={styles.filterSelect} value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}>
                {uniqueDepartments.map(d => <option key={d} value={d}>{d === 'All' ? 'All Departments' : d}</option>)}
              </select>
            </div>
            <div className={styles.filterItem}>
              <span className={styles.filterLabel}>Duration (hrs):</span>
              <select className={styles.filterSelect} value={durationFilter} onChange={(e) => setDurationFilter(e.target.value)}>
                {uniqueDurations.map(d => <option key={d} value={d}>{d === 'All' ? 'All Durations' : d}</option>)}
              </select>
            </div>
            <div className={styles.filterItem}>
              <span className={styles.filterLabel}>Slots:</span>
              <select className={styles.filterSelect} value={slotsFilter} onChange={(e) => setSlotsFilter(e.target.value)}>
                {uniqueSlots.map(s => <option key={s} value={s}>{s === 'All' ? 'All Slots' : s}</option>)}
              </select>
            </div>
          </div>
        )}

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
                      <span className={styles.label}>SLOTS:</span> {opp.slots}
                    </p>
                    <p className={styles.detail}>
                      <span className={styles.label}>DURATION:</span> {opp.duration} hours
                    </p>
                  </div>
                  <div className={styles.rightCol}>
                    <p className={styles.statusText}>
                      Status: <span className={styles.statusValue}>{opp.status}</span>
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
                    onClick={() => navigate(`/employer/opportunities/${opp.id}/edit`)}
                  >
                    Edit
                  </button>
                  <button 
                    className={styles.actionBtn}
                    onClick={() => setOpportunityToDelete(opp.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {opportunityToDelete && (
        <div className={styles.modalOverlay} onClick={() => setOpportunityToDelete(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Confirm Delete</h2>
            <p className={styles.modalText}>
              Are you sure you want to delete this opportunity? This action cannot be undone.
            </p>
            <div className={styles.modalActions}>
              <button 
                className={styles.cancelBtn} 
                onClick={() => setOpportunityToDelete(null)}
              >
                Cancel
              </button>
              <button 
                className={styles.confirmDeleteBtn} 
                onClick={() => handleDelete(opportunityToDelete)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {opportunityForApplicants && (
        <ViewApplicantsModal 
          opportunity={opportunityForApplicants}
          onClose={() => setOpportunityForApplicants(null)}
        />
      )}
    </main>
  )
}

export default OpportunitiesPage
