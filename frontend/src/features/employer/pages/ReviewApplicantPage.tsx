import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Calendar, Check, Download, FileText, Mail, MapPin, Phone, Trash2, User, X } from 'lucide-react'
import { employerService } from '../services/employer.service'
import type { Applicant } from '../types/employer.types'
import { RejectApplicantModal } from '../components/RejectApplicantModal'
import { ScheduleInterviewModal } from '../components/ScheduleInterviewModal'
import styles from './ReviewApplicantPage.module.css'
import { useToastStore } from '../../../stores/useToastStore'
import { getErrorMessage } from '../../../utils/error-message'
import { ConfirmDeleteModal } from '../../../components/feedback/ConfirmDeleteModal'
import { getEmployerReferralDetail } from '../services/employer-review-flow'
import { isTerminalReferral } from '../../workflow/status-mappings'

export function ReviewApplicantPage({ readOnly = false }: { readOnly?: boolean }) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [applicant, setApplicant] = useState<Applicant | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showScheduleInterview, setShowScheduleInterview] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const showSuccessToast = useToastStore((state) => state.success)
  const showErrorToast = useToastStore((state) => state.error)

  useEffect(() => {
    if (!id) return
    let active = true
    setIsLoading(true)
    setApplicant(null)
    getEmployerReferralDetail(id, { getDetail: employerService.getApplicantById })
      .then((data) => { if (active) setApplicant(data ?? null) })
      .catch((error: unknown) => { if (active) showErrorToast(getErrorMessage(error, 'Failed to load referral details.')) })
      .finally(() => { if (active) setIsLoading(false) })
    return () => { active = false }
  }, [id, showErrorToast])

  const statusClass = (status: Applicant['status']) => {
    if (status === 'Accepted') return styles.accepted
    if (['Rejected', 'Withdrawn', 'Expired', 'Offer Declined'].includes(status)) return styles.rejected
    if (['Under Review', 'For Review', 'Interview Scheduled', 'Offer Received'].includes(status)) return styles.underReview
    return ''
  }

  const updateStatus = async (status: Applicant['status'], rejectionRemark?: string) => {
    if (!applicant || isSaving) return
    setIsSaving(true)
    try {
      await employerService.updateApplicantStatus(applicant.id, status, rejectionRemark)
      const refreshed = await employerService.getApplicantById(applicant.id)
      setApplicant(refreshed ?? null)
      setShowRejectModal(false)
      showSuccessToast(`Referral status changed to ${status}.`)
    } catch (error: unknown) {
      showErrorToast(getErrorMessage(error, 'Failed to update applicant status.'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleScheduleInterview = async (details: { date: string; time: string; mode: 'online' | 'in-person'; meetingUrl?: string; location?: string; remarks: string }) => {
    if (!applicant || isSaving) return
    setIsSaving(true)
    try {
      await employerService.scheduleInterview(applicant.id, details)
      const refreshed = await employerService.getApplicantById(applicant.id)
      setApplicant(refreshed ?? null)
      setShowScheduleInterview(false)
      showSuccessToast('Interview scheduled.')
    } catch (error: unknown) {
      showErrorToast(getErrorMessage(error, 'Failed to schedule interview.'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleReject = async (remark: string) => {
    await updateStatus('Rejected', remark)
  }

  const handleDelete = async () => {
    if (!applicant || isSaving) return
    setIsSaving(true)
    try {
      await employerService.deleteReferral(applicant.id)
      showSuccessToast('Referral deleted.')
      navigate('/employer/referrals-history')
    } catch (error: unknown) {
      showErrorToast(getErrorMessage(error, 'Failed to delete referral.'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleBack = () => {
    if (readOnly) {
      navigate('/employer/referrals-history')
      return
    }
    const opportunityId = searchParams.get('opportunityId')
    if (searchParams.get('from') === 'opportunity' && opportunityId) {
      navigate(`/employer/opportunities?viewApplicants=${opportunityId}`)
      return
    }
    navigate('/employer/applicants')
  }

  if (isLoading) return <main className={styles.pageContainer}><p className={styles.loading}>Loading referral details...</p></main>

  if (!applicant) {
    return (
      <main className={styles.pageContainer}>
        <section className={styles.emptyState}>
          <h1>Referral not found</h1>
          <button className={styles.backBtn} onClick={handleBack}><ArrowLeft size={18} />Back to Referrals</button>
        </section>
      </main>
    )
  }

  const canMakeInitialDecision = applicant.referralStatus === 'under_review' && applicant.companyResponse === 'pending'
  const canUpdateInterviewDecision = applicant.referralStatus === 'under_review' && applicant.companyResponse === 'for_interview'
  const canDeleteHistoryReferral = readOnly && isTerminalReferral(applicant.referralStatus)
  const hasWorkflowActions = (!readOnly && (canMakeInitialDecision || canUpdateInterviewDecision)) || canDeleteHistoryReferral

  return (
    <main className={styles.pageContainer}>
      <header className={styles.pageHeader}>
        <button className={styles.backBtn} onClick={handleBack}><ArrowLeft size={18} />Back to Referrals</button>
      </header>

      <section className={styles.reviewCard}>
        <div className={styles.cardHeading}>
          <div>
            <h1>Review Referral</h1>
            <p>Review the applicant’s information, documents, and application status.</p>
          </div>
          <span className={`${styles.statusPill} ${statusClass(applicant.status)}`}>{applicant.status}</span>
        </div>

        <div className={styles.twoColumnGrid}>
          <aside className={styles.profileCard}>
            <div className={styles.profileAvatarRow}>
              <div className={styles.avatarPlaceholder}>
                {applicant.profileImageUrl ? (
                  <img src={applicant.profileImageUrl} alt={`${applicant.name} profile`} />
                ) : (
                  <User size={34} />
                )}
              </div>
              <div className={styles.profileInfo}>
                <h2>{applicant.name}</h2>
                <div className={styles.contactMeta}>
                  <a href={`mailto:${applicant.email}`}><Mail size={15} />{applicant.email}</a>
                  <p><Phone size={15} />{applicant.phone}</p>
                </div>
                <p><MapPin size={15} />{applicant.location}</p>
              </div>
            </div>

            <div className={styles.divider} />
            <div className={styles.appliedForSection}>
              <span>APPLIED FOR</span>
              <h3>{applicant.opportunityTitle}</h3>
              <p>Applied on {applicant.dateApplied}</p>
            </div>
          </aside>

          <div className={styles.rightColumn}>
            <section className={styles.infoCard}>
              <h2 className={styles.sectionTitle}><span><User size={18} /></span>Application Information</h2>
              <div className={styles.infoList}>
                {[
                  ['Full Name', applicant.name], ['Strand / Program', applicant.course], ['Year Level', applicant.yearLevel],
                  ['School', applicant.school],
                ].map(([label, value]) => <div className={styles.infoRow} key={label}><span>{label}</span><strong>{value}</strong></div>)}
              </div>
            </section>

            <section className={styles.infoCard}>
              <h2 className={styles.sectionTitle}><span><Calendar size={18} /></span>Internship Information</h2>
              <div className={styles.infoList}>
                {[
                  ['Required Hours', `${applicant.requiredHours} hours`],
                  ['Available Days', applicant.availabilityDays],
                  ['Available Starting Date', applicant.availabilityDate],
                ].map(([label, value]) => <div className={styles.infoRow} key={label}><span>{label}</span><strong>{value}</strong></div>)}
              </div>
            </section>

            <section className={styles.infoCard}>
              <h2 className={styles.sectionTitle}><span><FileText size={18} /></span>Applicant Documents</h2>
              <div className={styles.docsList}>
                {[
                  { key: 'proof_of_residency', label: 'Proof of Residency' },
                  { key: 'latest_credentials', label: 'Latest Credentials' },
                  { key: 'curriculum_vitae_resume', label: 'Curriculum Vitae / Resume' },
                  { key: 'letter_of_intent', label: 'Letter of Intent' },
                ].map(({ key, label }) => {
                  const match = applicant.documents?.find((d) => {
                    const normType = (d.requirementTypeName || '').toLowerCase().replace(/[^a-z0-9]/g, '')
                    const normKey = key.toLowerCase().replace(/[^a-z0-9]/g, '')
                    if (normType && normType === normKey) return true
                    const normName = (d.requirementName || '').toLowerCase().replace(/[^a-z0-9]/g, '')
                    if (normKey === 'proofofresidency') return normType.includes('residency') || normName.includes('residency')
                    if (normKey === 'curriculumvitaeresume') return normType.includes('resume') || normType.includes('cv') || normType.includes('curriculum') || normName.includes('resume')
                    if (normKey === 'letterofintent') return normType.includes('intent') || normType.includes('loi') || normName.includes('intent')
                    if (normKey === 'latestcredentials') return normType.includes('credential') || normType.includes('grade') || normName.includes('credential')
                    return false
                  })

                  const filePath = match?.filePath || ''
                  const hasFile = Boolean(filePath)
                  const displayFilename = match?.requirementName || (filePath ? filePath.split('/').pop() : 'Not submitted')

                  const handleDownload = async () => {
                    if (!filePath) return
                    const fullUrl = filePath.startsWith('http')
                      ? filePath
                      : `http://localhost:3000${filePath.startsWith('/') ? '' : '/'}${filePath}`

                    try {
                      const res = await fetch(fullUrl)
                      if (!res.ok) throw new Error('File download failed')
                      const blob = await res.blob()
                      const blobUrl = window.URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = blobUrl
                      a.download = match?.requirementName || `${label}.pdf`
                      document.body.appendChild(a)
                      a.click()
                      document.body.removeChild(a)
                      window.URL.revokeObjectURL(blobUrl)
                    } catch {
                      window.open(fullUrl, '_blank')
                    }
                  }

                  return (
                    <div className={styles.docItem} key={key}>
                      <span className={styles.docIcon}><FileText size={17} /></span>
                      <div>
                        <strong>{label}</strong>
                        <p style={{ color: hasFile ? undefined : '#94a3b8' }}>{displayFilename}</p>
                      </div>
                      <button
                        type="button"
                        className={styles.viewDocBtn}
                        disabled={!hasFile}
                        onClick={handleDownload}
                        style={!hasFile ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
                      >
                        <Download size={15} />{hasFile ? 'Download' : 'Unavailable'}
                      </button>
                    </div>
                  )
                })}
              </div>
            </section>
          </div>
        </div>

        {hasWorkflowActions && (
          <footer className={styles.actionBar}>
            {(canMakeInitialDecision || canUpdateInterviewDecision) && <button className={styles.actionGreen} disabled={isSaving} onClick={() => updateStatus('Accepted')}><Check size={17} />Accept Referral</button>}
            {(canMakeInitialDecision || canUpdateInterviewDecision) && <button className={styles.actionBlue} disabled={isSaving} onClick={() => setShowScheduleInterview(true)}><Calendar size={17} />{canUpdateInterviewDecision ? 'Reschedule Interview' : 'Schedule Interview'}</button>}
            {(canMakeInitialDecision || canUpdateInterviewDecision) && <button className={`${styles.actionRed} ${styles.workflowAction}`} disabled={isSaving} onClick={() => setShowRejectModal(true)}><X size={17} />Reject Referral</button>}
            {canDeleteHistoryReferral && <button className={styles.actionRed} disabled={isSaving} onClick={() => setShowDeleteModal(true)}><Trash2 size={17} />Delete</button>}
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

      {showRejectModal && (
        <RejectApplicantModal
          applicantName={applicant.name}
          isSaving={isSaving}
          onClose={() => setShowRejectModal(false)}
          onConfirm={handleReject}
        />
      )}
      {showDeleteModal && <ConfirmDeleteModal subject={`${applicant.name}'s referral`} isDeleting={isSaving} onClose={() => setShowDeleteModal(false)} onConfirm={() => void handleDelete()} />}
    </main>
  )
}

export function ReferralHistoryDetailsPage() {
  return <ReviewApplicantPage readOnly />
}

export default ReviewApplicantPage
