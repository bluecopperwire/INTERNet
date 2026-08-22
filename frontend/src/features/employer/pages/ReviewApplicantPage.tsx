import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Calendar, Check, Download, FileText, Mail, MapPin, Phone, User, X } from 'lucide-react'
import { employerService } from '../services/employer.service'
import type { Applicant } from '../types/employer.types'
import { RejectApplicantModal } from '../components/RejectApplicantModal'
import { ScheduleInterviewModal } from '../components/ScheduleInterviewModal'
import styles from './ReviewApplicantPage.module.css'

export function ReviewApplicantPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [applicant, setApplicant] = useState<Applicant | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showScheduleInterview, setShowScheduleInterview] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)

  useEffect(() => {
    if (!id) return
    employerService.getApplicantById(id).then((data) => {
      setApplicant(data ?? null)
      setIsLoading(false)
    })
  }, [id])

  const statusClass = (status: Applicant['status']) => {
    if (status === 'Accepted' || status === 'Shortlisted') return styles.accepted
    if (status === 'Rejected') return styles.rejected
    if (status === 'Under Review' || status === 'For Review' || status === 'For Interview') return styles.underReview
    return ''
  }

  const updateStatus = async (status: Applicant['status'], rejectionRemark?: string) => {
    if (!applicant || isSaving) return
    setIsSaving(true)
    try {
      await employerService.updateApplicantStatus(applicant.id, status, rejectionRemark)
      setApplicant((current) => current ? { ...current, status, rejectionRemark: status === 'Rejected' ? rejectionRemark?.trim() || undefined : undefined } : current)
      setShowRejectModal(false)
    } finally {
      setIsSaving(false)
    }
  }

  const handleScheduleInterview = async () => {
    await updateStatus('For Interview')
    setShowScheduleInterview(false)
  }

  const handleReject = async (remark: string) => {
    await updateStatus('Rejected', remark)
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
                  ['Proof of Residency', `${applicant.name.replace(/\s+/g, '').toLowerCase()}_proof_of_residency.pdf`],
                  ['Latest Credentials', `${applicant.name.replace(/\s+/g, '').toLowerCase()}_credentials.pdf`],
                  ['Curriculum Vitae / Resume', `${applicant.name.replace(/\s+/g, '').toLowerCase()}_resume.pdf`],
                  ['Letter of Intent', `${applicant.name.replace(/\s+/g, '').toLowerCase()}_letter_of_intent.pdf`],
                  ['Recommendation Letter / Registration Form', `${applicant.name.replace(/\s+/g, '').toLowerCase()}_recommendation_letter.pdf`],
                  ['Endorsement Letter', `${applicant.name.replace(/\s+/g, '').toLowerCase()}_endorsement_letter.pdf`],
                ].map(([name, filename]) => <div className={styles.docItem} key={name}><span className={styles.docIcon}><FileText size={17} /></span><div><strong>{name}</strong><p>{filename}</p></div><button type="button" className={styles.viewDocBtn}><Download size={15} />Download</button></div>)}
              </div>
            </section>
          </div>
        </div>

        {applicant.status !== 'Rejected' && applicant.status !== 'Accepted' && (
          <footer className={styles.actionBar}>
            {applicant.status === 'Shortlisted' || applicant.status === 'Pending' || applicant.status === 'For Interview' ? (
              <><button className={styles.actionGreen} disabled={isSaving} onClick={() => updateStatus('Accepted')}><Check size={17} />Accept Applicant</button><button className={styles.actionBlue} disabled={isSaving} onClick={() => setShowScheduleInterview(true)}><Calendar size={17} />Schedule Interview</button><button className={styles.actionRed} disabled={isSaving} onClick={() => setShowRejectModal(true)}><X size={17} />Reject Applicant</button></>
            ) : (
              <><button className={styles.actionGreen} disabled={isSaving} onClick={() => updateStatus('For Interview')}><Check size={17} />Move to For Interview</button><button className={styles.actionBlue} disabled={isSaving} onClick={() => setShowScheduleInterview(true)}><Calendar size={17} />Schedule Interview</button><button className={styles.actionRed} disabled={isSaving} onClick={() => setShowRejectModal(true)}><X size={17} />Reject Applicant</button></>
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

      {showRejectModal && (
        <RejectApplicantModal
          applicantName={applicant.name}
          isSaving={isSaving}
          onClose={() => setShowRejectModal(false)}
          onConfirm={handleReject}
        />
      )}
    </main>
  )
}

export default ReviewApplicantPage
