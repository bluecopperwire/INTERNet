import { useEffect, useState } from 'react'
import { Building2, Check } from 'lucide-react'
import type { InternshipOpportunity } from '../types/internship.types'
import { useStudentStore } from '../stores/useStudentStore'
import { useStudentTrackingStore } from '../stores/useStudentTrackingStore'
import { ApplyOpportunityModal } from './ApplyOpportunityModal'
import { studentApiService } from '../services/student-api.service'
import { useAuthStore } from '../../../stores/useAuthStore'
import { useToastStore } from '../../../stores/useToastStore'
import styles from './OpportunityDetail.module.css'

const ELIGIBILITY_CHECK_FAILED = 'Application eligibility could not be verified. Please refresh the page.'
const APPLICATION_BLOCKED_FALLBACK = 'You cannot apply for another internship until QC PESO finalizes your current placement.'

function OpportunityDetail({ opportunity }: { opportunity: InternshipOpportunity }) {
  const { details } = opportunity
  const [activeTab, setActiveTab] = useState<'description' | 'qualifications'>('description')
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false)
  const { profile, fetchProfile } = useStudentStore()
  const { requirements, fetchRequirements } = useStudentTrackingStore()
  const studentId = useAuthStore((state) => state.user?.studentId)
  const showErrorToast = useToastStore((state) => state.error)
  const [isApplicationBlocked, setIsApplicationBlocked] = useState(false)
  const [applicationBlockMessage, setApplicationBlockMessage] = useState<string | null>(null)
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(Boolean(studentId))

  useEffect(() => {
    if (!profile) {
      void fetchProfile()
    }
    if (!requirements || requirements.length === 0) {
      void fetchRequirements()
    }
  }, [fetchProfile, fetchRequirements, profile, requirements])

  useEffect(() => {
    if (!studentId) {
      return
    }
    let active = true
    const timeoutId = window.setTimeout(() => {
      setIsCheckingEligibility(true)
      studentApiService
        .getApplicationEligibility(studentId)
        .then((eligibility) => {
          if (active) {
            setIsApplicationBlocked(!eligibility.canApply)
            setApplicationBlockMessage(eligibility.canApply ? null : eligibility.message)
          }
        })
        .catch(() => {
          if (active) {
            setIsApplicationBlocked(true)
            setApplicationBlockMessage(ELIGIBILITY_CHECK_FAILED)
          }
        })
        .finally(() => {
          if (active) setIsCheckingEligibility(false)
        })
    }, 0)
    return () => {
      active = false
      window.clearTimeout(timeoutId)
    }
  }, [studentId])

  const companyInitials = opportunity.companyName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

  const facts = [
    ['Address', details.workplace],
    ['Department', details.department],
    ['Work Arrangement', opportunity.workSetup],
    ['Internship Duration', details.internshipDuration],
    ['Number of Slots', String(details.numberOfSlots)],
    ['Allowance', details.allowance],
    ['Application Deadline', details.applicationDeadline],
  ]

  const tabContent = activeTab === 'description' ? [details.description] : [details.qualifications]

  const handleApply = () => {
    if (isApplicationBlocked) {
      showErrorToast(applicationBlockMessage ?? APPLICATION_BLOCKED_FALLBACK)
      return
    }
    setIsApplyModalOpen(true)
  }

  return (
    <>
      <article className={styles.detailPanel}>
        <header className={styles.detailHeader}>
          <div className={styles.headerCopy}>
            <div className={styles.companyRow}>
              <span className={styles.companyImage}>
                {opportunity.companyLogoUrl ? <img src={opportunity.companyLogoUrl} alt={`${opportunity.companyName} logo`} /> : companyInitials || <Building2 aria-hidden="true" />}
              </span>
              <span>{opportunity.companyName}</span>
            </div>
            <h1>{opportunity.position}</h1>
          </div>
          <div className={styles.applyArea}>
            {opportunity.isApplied ? (
              <button className={`${styles.applyButton} ${styles.appliedButton}`} type="button" disabled>
                <Check size={18} /> Applied
              </button>
            ) : (
              <button className={styles.applyButton} type="button" disabled={isCheckingEligibility} onClick={handleApply}>
                {isCheckingEligibility ? 'Checking...' : 'Apply'}
              </button>
            )}
          </div>
        </header>

        <dl className={styles.quickFacts}>
          {facts.map(([label, value]) => (
            <div className={label === 'Address' ? styles.addressFact : undefined} key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>

        <div className={styles.detailTabs} role="tablist" aria-label="Opportunity details">
          <button className={activeTab === 'description' ? styles.activeTab : ''} type="button" role="tab" aria-selected={activeTab === 'description'} onClick={() => setActiveTab('description')}>
            Job Description
          </button>
          <button
            className={activeTab === 'qualifications' ? styles.activeTab : ''}
            type="button"
            role="tab"
            aria-selected={activeTab === 'qualifications'}
            onClick={() => setActiveTab('qualifications')}
          >
            Qualifications
          </button>
        </div>

        <section className={styles.detailSection}>
          {tabContent.map((paragraph, index) => (
            <p key={`${index}-${paragraph}`}>{paragraph}</p>
          ))}
        </section>
      </article>

      {isApplyModalOpen && !isApplicationBlocked && <ApplyOpportunityModal opportunity={opportunity} profile={profile} requirements={requirements || []} onClose={() => setIsApplyModalOpen(false)} />}
    </>
  )
}

export default OpportunityDetail
