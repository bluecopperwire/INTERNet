import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Calendar, Check, FileText, MapPin, Phone, User, X } from 'lucide-react'
import { employerService } from '../services/employer.service'
import type { Applicant } from '../types/employer.types'
import { ScheduleInterviewModal } from '../components/ScheduleInterviewModal'
import styles from './ReviewApplicantPage.module.css'

export function ReviewApplicantPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [applicant, setApplicant] = useState<Applicant | null>(null)
  const [notes, setNotes] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showScheduleInterview, setShowScheduleInterview] = useState(false)

  useEffect(() => {
    if (!id) return
    employerService.getApplicantById(id).then((data) => {
      setApplicant(data ?? null)
      setNotes(data?.notes ?? '')
      setIsLoading(false)
    })
  }, [id])

  const statusClass = (status: Applicant['status']) => {
    if (status === 'Accepted' || status === 'Shortlisted') return styles.accepted
    if (status === 'Rejected') return styles.rejected
    if (status === 'Under Review' || status === 'For Review') return styles.underReview
    return ''
  }

  const updateStatus = async (status: Applicant['status']) => {
    if (!applicant || isSaving) return
    setIsSaving(true)
    await employerService.updateApplicantStatus(applicant.id, status)
    setApplicant((current) => current ? { ...current, status } : current)
    setIsSaving(false)
  }

  const handleScheduleInterview = async () => {
    await updateStatus('Pending')
    setShowScheduleInterview(false)
  }

  const handleBack = () => {
    const opportunityId = searchParams.get('opportunityId')
    if (searchParams.get('from') === 'opportunity' && opportunityId) {
      navigate(`/employer/opportunities?viewApplicants=${opportunityId}`)
      return
    }
    navigate('/employer/applicants')
  }

  if (isLoading) return <main className={styles.pageContainer}><p className={styles.loading}>Loading applicant details...</p></main>

  if (!applicant) {
    return (
      <main className={styles.pageContainer}>
        <section className={styles.emptyState}>
          <h1>Applicant not found</h1>
          <button className={styles.backBtn} onClick={handleBack}><ArrowLeft size={18} />Back to Applicants</button>
        </section>
      </main>
    )
  }

  const currentStep = ['Shortlisted', 'Pending'].includes(applicant.status) ? 3 : ['Accepted', 'Rejected'].includes(applicant.status) ? 4 : 2
  const steps = [
    { id: 1, title: 'Application Submitted', subtitle: applicant.dateApplied },
    { id: 2, title: 'For Review', subtitle: currentStep === 2 ? 'Awaiting your review' : '' },
    { id: 3, title: 'Shortlisted / Interview', subtitle: applicant.status === 'Pending' ? 'Interview scheduled' : '' },
    { id: 4, title: applicant.status === 'Rejected' ? 'Rejected' : applicant.status === 'Accepted' ? 'Accepted' : 'Final Decision', subtitle: '' },
  ]

  return (
    <main className={styles.pageContainer}>
      <header className={styles.pageHeader}>
        <button className={styles.backBtn} onClick={handleBack}><ArrowLeft size={18} />Back to Applicants</button>
      </header>

      <section className={styles.reviewCard}>
        <div className={styles.cardHeading}>
          <div>
            <h1>Review Applicant</h1>
            <p>Review the applicant’s information, documents, and application status.</p>
          </div>
          <span className={`${styles.statusPill} ${statusClass(applicant.status)}`}>{applicant.status}</span>
        </div>

        <div className={styles.twoColumnGrid}>
          <aside className={styles.profileCard}>
            <div className={styles.profileAvatarRow}>
              <div className={styles.avatarPlaceholder}><User size={34} /></div>
              <div className={styles.profileInfo}>
                <h2>{applicant.name}</h2>
                <a href={`mailto:${applicant.email}`}>{applicant.email}</a>
                <p><Phone size={15} />{applicant.phone}</p>
                <p><MapPin size={15} />{applicant.location}</p>
              </div>
            </div>

            <div className={styles.divider} />
            <div className={styles.appliedForSection}>
              <span>APPLIED FOR</span>
              <h3>{applicant.opportunityTitle}</h3>
              <p>Applied on {applicant.dateApplied}</p>
              <p>Referred by QC PESO</p>
            </div>

            <div className={styles.divider} />
            <div className={styles.timelineSection}>
              <h3>Application Status</h3>
              {steps.map((step) => {
                const complete = step.id < currentStep || (step.id === currentStep && applicant.status === 'Accepted')
                const rejected = step.id === currentStep && applicant.status === 'Rejected'
                const active = step.id === currentStep && !complete && !rejected
                return (
                  <div key={step.id} className={styles.timelineItem}>
                    <div className={styles.timelineIndicator}>
                      <div className={`${styles.timelineIcon} ${complete ? styles.complete : rejected ? styles.timelineRejected : active ? styles.current : ''}`}>
                        {complete ? <Check size={14} /> : rejected ? <X size={14} /> : <span />}
                      </div>
                      {step.id < steps.length && <div className={`${styles.timelineLine} ${complete ? styles.lineComplete : ''}`} />}
                    </div>
                    <div className={styles.timelineContent}>
                      <h4 className={rejected ? styles.textRejected : active ? styles.textCurrent : ''}>{step.title}</h4>
                      {step.subtitle && <p>{step.subtitle}</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          </aside>

          <div className={styles.rightColumn}>
            <section className={styles.infoCard}>
              <h2 className={styles.sectionTitle}><span><User size={18} /></span>Applicant Information</h2>
              <div className={styles.infoList}>
                {[
                  ['Full Name', applicant.name], ['Course/Program', applicant.course], ['Year Level', applicant.yearLevel],
                  ['School', applicant.school], ['Preferred Field', applicant.preferredField], ['Required Hours', `${applicant.requiredHours} hours`],
                  ['Availability Date', applicant.availabilityDate],
                ].map(([label, value]) => <div className={styles.infoRow} key={label}><span>{label}</span><strong>{value}</strong></div>)}
              </div>
            </section>

            <section className={styles.infoCard}>
              <h2 className={styles.sectionTitle}><span><FileText size={18} /></span>Applicant Documents</h2>
              <div className={styles.docsList}>
                {[
                  ['Resume / CV', `${applicant.name.replace(/\s+/g, '').toLowerCase()}_resume.pdf`],
                  ['Endorsement Letter', `${applicant.name.replace(/\s+/g, '').toLowerCase()}_endorsement.pdf`],
                  ['Latest Credential', `${applicant.name.replace(/\s+/g, '').toLowerCase()}_COR.pdf`],
                ].map(([name, filename]) => <div className={styles.docItem} key={name}><span className={styles.docIcon}><FileText size={17} /></span><div><strong>{name}</strong><p>{filename}</p></div><button type="button" className={styles.viewDocBtn}>View</button></div>)}
              </div>
            </section>

            <section className={styles.notesCard}>
              <h2>Notes</h2>
              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Add notes about this applicant..." maxLength={500} />
              <span>{notes.length}/500</span>
            </section>
          </div>
        </div>

        {applicant.status !== 'Rejected' && applicant.status !== 'Accepted' && (
          <footer className={styles.actionBar}>
            {applicant.status === 'Shortlisted' || applicant.status === 'Pending' ? (
              <><button className={styles.actionGreen} disabled={isSaving} onClick={() => updateStatus('Accepted')}><Check size={17} />Accept Applicant</button><button className={styles.actionBlue} disabled={isSaving} onClick={() => setShowScheduleInterview(true)}><Calendar size={17} />Schedule Interview</button><button className={styles.actionRed} disabled={isSaving} onClick={() => updateStatus('Rejected')}><X size={17} />Reject Applicant</button></>
            ) : (
              <><button className={styles.actionGreen} disabled={isSaving} onClick={() => updateStatus('Shortlisted')}><Check size={17} />Move to Shortlisted</button><button className={styles.actionBlue} disabled={isSaving} onClick={() => setShowScheduleInterview(true)}><Calendar size={17} />Schedule Interview</button><button className={styles.actionRed} disabled={isSaving} onClick={() => updateStatus('Rejected')}><X size={17} />Reject Applicant</button></>
            )}
          </footer>
        )}
      </section>

      {showScheduleInterview && (
        <ScheduleInterviewModal
          applicantName={applicant.name}
          isSaving={isSaving}
          onClose={() => setShowScheduleInterview(false)}
          onSchedule={handleScheduleInterview}
        />
      )}
    </main>
  )
}

export default ReviewApplicantPage
