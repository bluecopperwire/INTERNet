import { ArrowLeft, CalendarDays } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { employerService, formatOpportunityDeadline, isOpportunityDeadlineExpired } from '../services/employer.service'
import type { Opportunity } from '../types/employer.types'
import styles from './OpportunityDetailsPage.module.css'
import { useToastStore } from '../../../stores/useToastStore'
import { getErrorMessage } from '../../../utils/error-message'

interface FieldProps {
  label: string
  children: ReactNode
  className?: string
}

function Field({ label, children, className }: FieldProps) {
  return (
    <label className={`${styles.field} ${className ?? ''}`}>
      <span>{label}</span>
      {children}
    </label>
  )
}

export function OpportunityDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const toast = useToastStore()

  useEffect(() => {
    if (!id) {
      setIsLoading(false)
      return
    }

    employerService
      .getOpportunityById(id)
      .then((data) => setOpportunity(data ?? null))
      .finally(() => setIsLoading(false))
  }, [id])

  const isExpired = opportunity ? isOpportunityDeadlineExpired(opportunity.applicationDeadline) : false

  const handleStatusToggle = async () => {
    if (!opportunity || isExpired) return

    setIsUpdating(true)
    try {
      const updatedOpportunity: Opportunity = {
        ...opportunity,
        status: opportunity.status === 'Open' ? 'Closed' : 'Open',
      }
      await employerService.saveOpportunity(updatedOpportunity)
      setOpportunity(updatedOpportunity)
      toast.success(`Opportunity ${updatedOpportunity.status === 'Open' ? 'opened' : 'closed'}.`)
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to update opportunity status.'))
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDelete = async () => {
    if (!opportunity) return

    setIsUpdating(true)
    try {
      await employerService.deleteOpportunity(opportunity.id)
      toast.success('Opportunity deleted.')
      navigate('/employer/opportunities')
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to delete opportunity.'))
    } finally {
      setIsUpdating(false)
    }
  }

  if (isLoading) {
    return <main className={styles.feedback}>Loading opportunity...</main>
  }

  if (!opportunity) {
    return <main className={styles.feedback}>Opportunity not found.</main>
  }

  return (
    <main className={styles.pageContainer}>
      <div className={styles.header}>
        <button type="button" className={styles.backButton} onClick={() => navigate('/employer/opportunities')}>
          <ArrowLeft size={19} />
          Back to Opportunities
        </button>
      </div>

      <section className={styles.formCard}>
        <header className={styles.formHeader}>
          <h1>View Opportunity</h1>
          <p>Review the opportunity details and manage its availability.</p>
        </header>

        <div className={styles.formGrid}>
          <Field label="Position Title *">
            <input value={opportunity.title} readOnly />
          </Field>
          <Field label="Department *">
            <input value={opportunity.department} readOnly />
          </Field>
          <Field label="Work Arrangement *">
            <input value={opportunity.workArrangement} readOnly />
          </Field>
          <Field label="Internship Duration *">
            <input value={`${opportunity.duration} hours`} readOnly />
          </Field>
          <Field label="Number of Slots *">
            <input value={opportunity.slots} readOnly />
          </Field>
          <Field label="Allowance">
            <input value={opportunity.allowance || 'N/A'} readOnly />
          </Field>
          <Field label="Job Description *" className={styles.fullWidth}>
            <textarea value={opportunity.jobDescription} rows={6} readOnly />
          </Field>
          <Field label="Qualifications" className={styles.fullWidth}>
            <textarea value={opportunity.qualifications} rows={5} readOnly />
          </Field>
          <Field label="Application Deadline" className={styles.fullWidth}>
            <div className={styles.dateField}>
              <input value={formatOpportunityDeadline(opportunity.applicationDeadline)} readOnly />
              <CalendarDays size={20} aria-hidden="true" />
            </div>
          </Field>
        </div>

        <footer className={styles.formFooter}>
          <button
            type="button"
            className={styles.editButton}
            onClick={() => navigate(`/employer/opportunities/${opportunity.id}/edit`)}
          >
            Edit
          </button>
          <button
            type="button"
            className={styles.closeButton}
            disabled={isUpdating || isExpired}
            onClick={handleStatusToggle}
          >
            {isExpired ? 'Deadline Passed' : opportunity.status === 'Open' ? 'Close' : 'Open'}
          </button>
          <button type="button" className={styles.deleteButton} disabled={isUpdating} onClick={handleDelete}>
            Delete
          </button>
        </footer>
      </section>
    </main>
  )
}
