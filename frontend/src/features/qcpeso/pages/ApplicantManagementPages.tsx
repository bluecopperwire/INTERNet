import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar,
  Check,
  Download,
  Eye,
  FileText,
  Mail,
  MapPin,
  Phone,
  Search,
  SlidersHorizontal,
  Trash2,
  User,
  X,
} from 'lucide-react'
import { qcpesoService } from '../services/qcpeso.service'
import { qcpesoApiService } from '../services/qcpeso-api.service'
import { useToastStore } from '../../../stores/useToastStore'
import { getErrorMessage } from '../../../utils/error-message'
import type { QCPesoReferral, QCPesoReviewApplicant } from '../types/qcpeso.types'
import QCPesoHero from '../components/QCPesoHero'
import { RejectApplicantModal } from '../../employer/components/RejectApplicantModal'
import tableStyles from '../../employer/pages/ApplicantsPage.module.css'
import detailStyles from '../../employer/pages/ReviewApplicantPage.module.css'
import { API_BASE_URL } from '../../../services/api'
import { getApplicantReviewDetail, openApplicantForReview } from '../services/qcpeso-review-flow'
import { ConfirmDeleteModal } from '../../../components/feedback/ConfirmDeleteModal'

const APPLICANT_REQUIREMENTS = [
  { key: 'proof_of_residency', label: 'Proof of Residency' },
  { key: 'latest_credentials', label: 'Latest Credentials' },
  { key: 'curriculum_vitae_resume', label: 'Curriculum Vitae / Resume' },
  { key: 'letter_of_intent', label: 'Letter of Intent' },
]

function normalizeKey(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function matchDocRequirement(d: { typeName?: string; name?: string }, reqKey: string) {
  const normType = normalizeKey(d.typeName || '')
  const normReq = normalizeKey(reqKey)
  if (normType && normType === normReq) return true

  const normName = normalizeKey(d.name || '')
  if (normReq === 'proofofresidency') {
    return normType.includes('residency') || normName.includes('residency')
  }
  if (normReq === 'curriculumvitaeresume') {
    return (
      normType.includes('resume') ||
      normType.includes('curriculum') ||
      normType.includes('cv') ||
      normName.includes('resume') ||
      normName.includes('curriculum') ||
      normName.includes('cv')
    )
  }
  if (normReq === 'letterofintent') {
    return (
      normType.includes('intent') || normType.includes('loi') || normName.includes('intent') || normName.includes('loi')
    )
  }
  if (normReq === 'latestcredentials') {
    return (
      normType.includes('credential') ||
      normType.includes('transcript') ||
      normType.includes('grade') ||
      normName.includes('credential')
    )
  }
  return false
}

async function handleDownloadFile(filePath: string, fileName: string) {
  if (!filePath) return
  const fullUrl = filePath.startsWith('http')
    ? filePath
    : `${API_BASE_URL}${filePath.startsWith('/') ? '' : '/'}${filePath}`

  try {
    const res = await fetch(fullUrl)
    if (!res.ok) throw new Error('File download failed')
    const blob = await res.blob()
    const blobUrl = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(blobUrl)
  } catch {
    window.open(fullUrl, '_blank')
  }
}

function statusClass(status: string) {
  if (status === 'Accepted') return tableStyles.accepted
  if (['Rejected', 'Withdrawn', 'Expired', 'Offer Declined'].includes(status)) return tableStyles.rejected
  if (['For Review', 'Under Review', 'Interview Scheduled', 'Offer Received', 'Endorsed'].includes(status)) return tableStyles.underReview
  return ''
}

function detailStatusClass(status: string) {
  if (status === 'Accepted') return detailStyles.accepted
  if (['Rejected', 'Withdrawn', 'Expired', 'Offer Declined'].includes(status)) return detailStyles.rejected
  if (['For Review', 'Under Review', 'Interview Scheduled', 'Offer Received', 'Endorsed'].includes(status)) return detailStyles.underReview
  return ''
}

function Pagination({ itemName }: { itemName: string }) {
  return (
    <div className={tableStyles.paginationRow}>
      <div className={tableStyles.leftControls}>
        <span className={tableStyles.viewLabel}>View</span>
        <div className={tableStyles.viewSelectBox}>
          <select className={tableStyles.viewSelect} defaultValue="7">
            <option>7</option>
            <option>10</option>
            <option>15</option>
          </select>
        </div>
        <span className={tableStyles.perPageLabel}>{itemName} per page</span>
      </div>
      <div className={tableStyles.pagination}>
        <button className={tableStyles.pageBtn} disabled>
          ‹
        </button>
        <button className={`${tableStyles.pageBtn} ${tableStyles.active}`}>1</button>
        <button className={tableStyles.pageBtn} disabled>
          ›
        </button>
      </div>
    </div>
  )
}

export function ReviewApplicantsPage() {
  const navigate = useNavigate()
  const toast = useToastStore()
  const [records, setRecords] = useState<QCPesoReviewApplicant[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('All')
  const [deleteTarget, setDeleteTarget] = useState<QCPesoReviewApplicant | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    qcpesoService.getReviewApplicants().then(setRecords)
  }, [])

  const filtered = useMemo(
    () =>
      records.filter(
        (record) =>
          (record.studentName + record.company + record.jobTitle).toLowerCase().includes(search.toLowerCase()) &&
          (status === 'All' || record.status === status),
      ),
    [records, search, status],
  )

  const handleOpenApplicant = async (record: QCPesoReviewApplicant) => {
    await openApplicantForReview(record, {
      markUnderReview: qcpesoApiService.markApplicationUnderReview,
      navigate,
      onMutationError: (error) => toast.error(getErrorMessage(error, 'Failed to start applicant review.')),
    })
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await qcpesoService.deleteApplication(deleteTarget.id)
      setRecords((current) => current.filter((record) => record.id !== deleteTarget.id))
      setDeleteTarget(null)
      toast.success('Application deleted.')
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to delete application.'))
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <main className={tableStyles.pageContainer}>
      <QCPesoHero
        title="Review Applicants"
        subtitle="Review and verify student applications submitted to partner companies."
      />
      <section className={tableStyles.mainContent}>
        <div className={tableStyles.toolbar}>
          <label className={tableStyles.searchBox}>
            <Search size={18} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search applicants..."
            />
          </label>
          <label className={tableStyles.statusFilter}>
            <SlidersHorizontal size={18} />
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="All">All Statuses</option>
              <option>For Review</option>
              <option>Under Review</option>
              <option>Endorsed</option>
              <option>Interview Scheduled</option>
              <option>Offer Received</option>
              <option>Accepted</option>
              <option>Offer Declined</option>
              <option>Rejected</option>
              <option>Withdrawn</option>
              <option>Expired</option>
              <option>Closed</option>
            </select>
          </label>
        </div>
        <div className={tableStyles.tableCard}>
          <div className={tableStyles.tableWrapper}>
            <table className={tableStyles.table}>
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Company</th>
                  <th>Job Title</th>
                  <th>Program / Strand</th>
                  <th>Year Level</th>
                  <th>Date Applied</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((record) => (
                  <tr key={record.id}>
                    <td>{record.studentName}</td>
                    <td>{record.company}</td>
                    <td>{record.jobTitle}</td>
                    <td>{record.program}</td>
                    <td>{record.yearLevel}</td>
                    <td>{record.dateApplied}</td>
                    <td>
                      <span className={`${tableStyles.statusPill} ${statusClass(record.status)}`}>{record.status}</span>
                    </td>
                    <td>
                      <div className={tableStyles.actionButtons}>
                        <button className={tableStyles.reviewBtn} onClick={() => void handleOpenApplicant(record)}><Eye size={16} />{record.applicationStatus === 'submitted' ? 'Review' : 'View'}</button>
                        {record.canHide && <button className={tableStyles.deleteBtn} onClick={() => setDeleteTarget(record)}><Trash2 size={16} />Delete</button>}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: 24 }}>
                      No applicants found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <Pagination itemName="Students" />
      </section>
      {deleteTarget && <ConfirmDeleteModal subject={`${deleteTarget.studentName}'s application`} isDeleting={isDeleting} onClose={() => setDeleteTarget(null)} onConfirm={() => void handleDelete()} />}
    </main>
  )
}

export function TrackReferralsPage() {
  const navigate = useNavigate()
  const [records, setRecords] = useState<QCPesoReferral[]>([])
  const [search, setSearch] = useState('')
  const [response, setResponse] = useState('All')
  const [deleteTarget, setDeleteTarget] = useState<QCPesoReferral | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const toast = useToastStore()

  useEffect(() => {
    qcpesoService.getReferrals().then(setRecords)
  }, [])

  const filtered = useMemo(
    () =>
      records.filter(
        (record) =>
          (record.studentName + record.company + record.jobTitle).toLowerCase().includes(search.toLowerCase()) &&
          (response === 'All' || record.workflowStatus === response),
      ),
    [records, search, response],
  )

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await qcpesoService.deleteReferral(deleteTarget.id)
      setRecords((current) => current.filter((record) => record.id !== deleteTarget.id))
      setDeleteTarget(null)
      toast.success('Referral deleted.')
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to delete referral.'))
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <main className={tableStyles.pageContainer}>
      <QCPesoHero title="Track Referrals" subtitle="Track referrals sent to companies and their latest responses." />
      <section className={tableStyles.mainContent}>
        <div className={tableStyles.toolbar}>
          <label className={tableStyles.searchBox}>
            <Search size={18} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search referrals..."
            />
          </label>
          <label className={tableStyles.statusFilter}>
            <SlidersHorizontal size={18} />
            <select value={response} onChange={(event) => setResponse(event.target.value)}>
              <option value="All">All Statuses</option>
              <option>Pending</option>
              <option>Under Review</option>
              <option>Interview Scheduled</option>
              <option>Offer Received</option>
              <option>Accepted</option>
              <option>Offer Declined</option>
              <option>Rejected</option>
              <option>Withdrawn</option>
              <option>Expired</option>
              <option>Closed</option>
            </select>
          </label>
        </div>
        <div className={tableStyles.tableCard}>
          <div className={tableStyles.tableWrapper}>
            <table className={tableStyles.table}>
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Company</th>
                  <th>Job Title</th>
                  <th>Referral Date</th>
                  <th>Company Response</th>
                  <th>Student Response</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((record) => (
                  <tr key={record.id}>
                    <td>{record.studentName}</td>
                    <td>{record.company}</td>
                    <td>{record.jobTitle}</td>
                    <td>{record.referralDate}</td>
                    <td>
                      <span className={`${tableStyles.statusPill} ${statusClass(record.companyResponse)}`}>
                        {record.companyResponse}
                      </span>
                    </td>
                    <td>
                      <span className={`${tableStyles.statusPill} ${statusClass(record.studentResponse)}`}>
                        {record.studentResponse}
                      </span>
                    </td>
                    <td><span className={`${tableStyles.statusPill} ${statusClass(record.workflowStatus)}`}>{record.workflowStatus}</span></td>
                    <td>
                      <div className={tableStyles.actionButtons}>
                        <button className={tableStyles.reviewBtn} onClick={() => navigate(`/qcpeso/manage-applicants/referrals/${record.id}`)}><Eye size={16} />View</button>
                        {record.canHide && <button className={tableStyles.deleteBtn} onClick={() => setDeleteTarget(record)}><Trash2 size={16} />Delete</button>}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: 24 }}>
                      No referrals found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <Pagination itemName="Students" />
      </section>
      {deleteTarget && <ConfirmDeleteModal subject={`${deleteTarget.studentName}'s referral`} isDeleting={isDeleting} onClose={() => setDeleteTarget(null)} onConfirm={() => void handleDelete()} />}
    </main>
  )
}

function DocumentList({
  title = 'Applicant Documents',
  documents = [],
}: {
  studentName?: string
  title?: string
  documents?: Array<{
    id: string
    name: string
    typeName?: string
    filePath: string
  }>
}) {
  return (
    <section className={detailStyles.infoCard}>
      <h2 className={detailStyles.sectionTitle}>
        <span>
          <FileText size={18} />
        </span>
        {title}
      </h2>
      <div className={detailStyles.docsList}>
        {APPLICANT_REQUIREMENTS.map(({ key, label }) => {
          const match = documents.find((d) => matchDocRequirement(d, key))
          const filePath = match?.filePath || ''
          const hasFile = Boolean(filePath)
          const displayFilename = match?.name || (filePath ? filePath.split('/').pop() : 'Not submitted')

          return (
            <div className={detailStyles.docItem} key={key}>
              <span className={detailStyles.docIcon}>
                <FileText size={17} />
              </span>
              <div>
                <strong>{label}</strong>
                <p style={{ color: hasFile ? undefined : '#94a3b8' }}>{displayFilename}</p>
              </div>
              <button
                type="button"
                className={detailStyles.viewDocBtn}
                disabled={!hasFile}
                onClick={() => handleDownloadFile(filePath, match?.name || `${label}.pdf`)}
                style={!hasFile ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
              >
                <Download size={15} />
                {hasFile ? 'Download' : 'Unavailable'}
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function InfoRows({ values }: { values: string[][] }) {
  return (
    <div className={detailStyles.infoList}>
      {values.map(([label, value]) => (
        <div className={detailStyles.infoRow} key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  )
}

export function ReviewApplicantDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [record, setRecord] = useState<QCPesoReviewApplicant | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadedApplicationId, setLoadedApplicationId] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const toast = useToastStore()

  useEffect(() => {
    if (!id) return

    let active = true
    getApplicantReviewDetail(id, {
      getDetail: qcpesoService.getReviewApplicant,
    })
      .then((res) => {
        if (!active) return
        if (!res) {
          setRecord(null)
          setError('Applicant details not found.')
        } else {
          setRecord(res)
          setError(null)
        }
      })
      .catch((err) => {
        if (active) {
          setRecord(null)
          setError(getErrorMessage(err, 'Failed to load applicant details.'))
        }
      })
      .finally(() => {
        if (active) setLoadedApplicationId(id)
      })
    return () => {
      active = false
    }
  }, [id])

  const isLoading = Boolean(id) && loadedApplicationId !== id

  if (isLoading) {
    return (
      <main className={detailStyles.pageContainer}>
        <p className={detailStyles.loading}>Loading applicant details...</p>
      </main>
    )
  }

  if (error || !record) {
    return (
      <main className={detailStyles.pageContainer}>
        <header className={detailStyles.pageHeader}>
          <button className={detailStyles.backBtn} onClick={() => navigate('/qcpeso/manage-applicants/review')}>
            <ArrowLeft size={18} />
            Back to Review Applicants
          </button>
        </header>
        <div
          style={{
            background: '#fff',
            padding: '32px',
            borderRadius: '12px',
            textAlign: 'center',
            margin: '20px 0',
          }}
        >
          <h2 style={{ color: '#160e6f', marginBottom: '8px' }}>Unable to load applicant</h2>
          <p style={{ color: '#64748b', marginBottom: '20px' }}>{error || 'Applicant record not found.'}</p>
          <button className={detailStyles.backBtn} onClick={() => navigate('/qcpeso/manage-applicants/review')}>
            Return to Applicants List
          </button>
        </div>
      </main>
    )
  }

  const updateStatus = async (status: QCPesoReviewApplicant['status'], remark?: string) => {
    if (!['submitted', 'under_review'].includes(record.applicationStatus || '') || isUpdating) return
    setIsUpdating(true)
    try {
      const updated = await qcpesoService.updateReviewApplicantStatus(record.id, status, remark)
      if (updated) {
        setRecord(updated)
      }
      setShowRejectModal(false)
      toast.success(`Applicant status changed to ${status}.`)
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to update applicant status.'))
    } finally {
      setIsUpdating(false)
    }
  }

  const handleRejectConfirm = async (remark: string) => {
    await updateStatus('Rejected', remark)
  }

  const handleDeleteApplication = async () => {
    if (isUpdating) return
    setIsUpdating(true)
    try {
      await qcpesoService.deleteApplication(record.id)
      toast.success('Application deleted.')
      navigate('/qcpeso/manage-applicants/review')
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to delete application.'))
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <main className={detailStyles.pageContainer}>
      <header className={detailStyles.pageHeader}>
        <button className={detailStyles.backBtn} onClick={() => navigate('/qcpeso/manage-applicants/review')}>
          <ArrowLeft size={18} />
          Back to Review Applicants
        </button>
      </header>
      <section className={detailStyles.reviewCard}>
        <div className={detailStyles.cardHeading}>
          <div>
            <h1>Review Applicant</h1>
            <p>Review the applicant’s information and documents before making a decision.</p>
          </div>
          <span className={`${detailStyles.statusPill} ${detailStatusClass(record.status)}`}>{record.status}</span>
        </div>
        <div className={detailStyles.twoColumnGrid}>
          <aside className={detailStyles.profileCard}>
            <div className={detailStyles.profileAvatarRow}>
              <div className={detailStyles.avatarPlaceholder}>
                {record.profileImageUrl ? (
                  <img src={record.profileImageUrl} alt={`${record.studentName} profile`} />
                ) : (
                  <User size={34} />
                )}
              </div>
              <div className={detailStyles.profileInfo}>
                <h2>{record.studentName || 'N/A'}</h2>
                <div className={detailStyles.contactMeta}>
                  <a href={`mailto:${record.email}`}>
                    <Mail size={15} />
                    {record.email || 'N/A'}
                  </a>
                  <p>
                    <Phone size={15} />
                    {record.phone || 'N/A'}
                  </p>
                </div>
                <p>
                  <MapPin size={15} />
                  {record.address || 'N/A'}
                </p>
              </div>
            </div>
            <div className={detailStyles.divider} />
            <div className={detailStyles.appliedForSection}>
              <span>APPLIED FOR</span>
              <h3>{record.jobTitle || 'N/A'}</h3>
              <p>{record.company || 'N/A'}</p>
              <p>Applied on {record.dateApplied || 'N/A'}</p>
            </div>
          </aside>
          <div className={detailStyles.rightColumn}>
            <section className={detailStyles.infoCard}>
              <h2 className={detailStyles.sectionTitle}>
                <span>
                  <User size={18} />
                </span>
                Application Information
              </h2>
              <InfoRows
                values={[
                  ['Full Name', record.studentName || 'N/A'],
                  ['Company', record.company || 'N/A'],
                  ['Job Title', record.jobTitle || 'N/A'],
                  ['Program / Strand', record.program || 'N/A'],
                  ['Year Level', record.yearLevel || 'N/A'],
                  ['School', record.school || 'N/A'],
                ]}
              />
            </section>
            <section className={detailStyles.infoCard}>
              <h2 className={detailStyles.sectionTitle}>
                <span>
                  <Calendar size={18} />
                </span>
                Internship Information
              </h2>
              <InfoRows
                values={[
                  ['Required Hours', `${record.requiredHours || 0} hours`],
                  ['Available Days', record.availableDays || 'N/A'],
                  ['Available Starting Date', record.availableStartingDate || 'N/A'],
                ]}
              />
            </section>
            <DocumentList studentName={record.studentName} documents={record.documents} />
          </div>
        </div>
        <footer className={detailStyles.actionBar}>
          <button
            className={detailStyles.actionBlue}
            onClick={() =>
              navigate(
                record.opportunityId
                  ? `/qcpeso/manage-applicants/opportunities/${record.opportunityId}`
                  : '/qcpeso/manage-applicants/review',
              )
            }
          >
            <Eye size={17} />
            View Opportunity
          </button>
          {['submitted', 'under_review'].includes(record.applicationStatus || '') && (
            <>
              <button
                className={detailStyles.actionGreen}
                disabled={isUpdating}
                onClick={() => updateStatus('Accepted')}
              >
                <Check size={17} />
                {isUpdating ? 'Referring...' : 'Refer Applicant'}
              </button>
              <button className={detailStyles.actionRed} disabled={isUpdating} onClick={() => setShowRejectModal(true)}>
                <X size={17} />
                Reject Applicant
              </button>
            </>
          )}
          {record.canHide && <button className={detailStyles.actionRed} disabled={isUpdating} onClick={() => setShowDeleteModal(true)}><Trash2 size={17} />Delete</button>}
        </footer>
      </section>

      {showRejectModal && (
        <RejectApplicantModal
          applicantName={record.studentName || 'Applicant'}
          isSaving={isUpdating}
          onClose={() => setShowRejectModal(false)}
          onConfirm={handleRejectConfirm}
        />
      )}
      {showDeleteModal && <ConfirmDeleteModal subject={`${record.studentName}'s application`} isDeleting={isUpdating} onClose={() => setShowDeleteModal(false)} onConfirm={() => void handleDeleteApplication()} />}
    </main>
  )
}

export function ReferralDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [record, setRecord] = useState<QCPesoReferral | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const toast = useToastStore()

  useEffect(() => {
    if (id) {
      setIsLoading(true)
      setError(null)
      qcpesoService
        .getReferral(id)
        .then((res) => {
          if (!res) {
            setError('Referral details not found.')
          } else {
            setRecord(res)
          }
        })
        .catch((err) => {
          setError(err?.message || 'Failed to load referral details.')
        })
        .finally(() => {
          setIsLoading(false)
        })
    }
  }, [id])

  if (isLoading) {
    return (
      <main className={detailStyles.pageContainer}>
        <p className={detailStyles.loading}>Loading referral details...</p>
      </main>
    )
  }

  if (error || !record) {
    return (
      <main className={detailStyles.pageContainer}>
        <header className={detailStyles.pageHeader}>
          <button className={detailStyles.backBtn} onClick={() => navigate('/qcpeso/manage-applicants/referrals')}>
            <ArrowLeft size={18} />
            Back to Track Referrals
          </button>
        </header>
        <div
          style={{
            background: '#fff',
            padding: '32px',
            borderRadius: '12px',
            textAlign: 'center',
            margin: '20px 0',
          }}
        >
          <h2 style={{ color: '#160e6f', marginBottom: '8px' }}>Unable to load referral</h2>
          <p style={{ color: '#64748b', marginBottom: '20px' }}>{error || 'Referral record not found.'}</p>
          <button className={detailStyles.backBtn} onClick={() => navigate('/qcpeso/manage-applicants/referrals')}>
            Return to Referrals List
          </button>
        </div>
      </main>
    )
  }

  const handleDeleteReferral = async () => {
    setIsDeleting(true)
    try {
      await qcpesoService.deleteReferral(record.id)
      toast.success('Referral deleted.')
      navigate('/qcpeso/manage-applicants/referrals')
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to delete referral.'))
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <main className={detailStyles.pageContainer}>
      <header className={detailStyles.pageHeader}>
        <button className={detailStyles.backBtn} onClick={() => navigate('/qcpeso/manage-applicants/referrals')}>
          <ArrowLeft size={18} />
          Back to Track Referrals
        </button>
      </header>
      <section className={detailStyles.reviewCard}>
        <div className={detailStyles.cardHeading}>
          <div>
            <h1>Referral Details</h1>
            <p>Review the documents sent to the company and the current referral responses.</p>
          </div>
        </div>
        <div className={detailStyles.twoColumnGrid}>
          <aside className={detailStyles.profileCard}>
            <div className={detailStyles.profileAvatarRow}>
              <div className={detailStyles.avatarPlaceholder}>
                {record.profileImageUrl ? (
                  <img src={record.profileImageUrl} alt={`${record.studentName} profile`} />
                ) : (
                  <User size={34} />
                )}
              </div>
              <div className={detailStyles.profileInfo}>
                <h2>{record.studentName || 'N/A'}</h2>
                <div className={detailStyles.contactMeta}>
                  <a href={`mailto:${record.email}`}>
                    <Mail size={15} />
                    {record.email || 'N/A'}
                  </a>
                  <p>
                    <Phone size={15} />
                    {record.phone || 'N/A'}
                  </p>
                </div>
                <p>
                  <MapPin size={15} />
                  {record.address || 'N/A'}
                </p>
              </div>
            </div>
            <div className={detailStyles.divider} />
            <div className={detailStyles.appliedForSection}>
              <span>REFERRED TO</span>
              <h3>{record.company || 'N/A'}</h3>
              <p>{record.jobTitle || 'N/A'}</p>
              <p>Referred on {record.referralDate || 'N/A'}</p>
            </div>
          </aside>
          <div className={detailStyles.rightColumn}>
            <section className={detailStyles.infoCard}>
              <h2 className={detailStyles.sectionTitle}>
                <span>
                  <User size={18} />
                </span>
                Referral Responses
              </h2>
              <InfoRows
                values={[
                  ['Company Response', record.companyResponse || 'N/A'],
                  ['Student Response', record.studentResponse || 'Pending'],
                ]}
              />
            </section>
            <DocumentList
              studentName={record.studentName}
              title="Documents Sent to Company"
              documents={record.documents}
            />
          </div>
        </div>
        {record.canHide && <footer className={detailStyles.actionBar}><button className={detailStyles.actionRed} disabled={isDeleting} onClick={() => setShowDeleteModal(true)}><Trash2 size={17} />Delete</button></footer>}
      </section>
      {showDeleteModal && <ConfirmDeleteModal subject={`${record.studentName}'s referral`} isDeleting={isDeleting} onClose={() => setShowDeleteModal(false)} onConfirm={() => void handleDeleteReferral()} />}
    </main>
  )
}
