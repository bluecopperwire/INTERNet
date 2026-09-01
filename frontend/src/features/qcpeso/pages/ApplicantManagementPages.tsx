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
import type { QCPesoReviewApplicant } from '../types/qcpeso.types'
import QCPesoHero from '../components/QCPesoHero'
import { RejectApplicantModal } from '../../employer/components/RejectApplicantModal'
import tableStyles from '../../employer/pages/ApplicantsPage.module.css'
import detailStyles from '../../employer/pages/ReviewApplicantPage.module.css'
import { API_BASE_URL } from '../../../services/api'
import { getApplicantReviewDetail, openApplicantForReview } from '../services/qcpeso-review-flow'
import { ConfirmDeleteModal } from '../../../components/feedback/ConfirmDeleteModal'
import {
  APPLICATION_CLOSED_STATUSES,
  APPLICATION_HISTORY_STATUSES,
  APPLICATION_ONGOING_STATUSES,
} from '../../workflow/status-mappings'

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
  if (status.includes('Accepted')) return tableStyles.accepted
  if (['Rejected', 'Withdrawn', 'Expired', 'Declined'].some((value) => status.includes(value))) return tableStyles.rejected
  if (['For Review', 'Under Review', 'Interview Scheduled', 'Offer Received', 'Endorsed'].includes(status)) return tableStyles.underReview
  return ''
}

function detailStatusClass(status: string) {
  if (status === 'Accepted') return detailStyles.accepted
  if (['Rejected', 'Withdrawn', 'Expired', 'Offer Declined'].includes(status)) return detailStyles.rejected
  if (['For Review', 'Under Review', 'Interview Scheduled', 'Offer Received', 'Endorsed'].includes(status)) return detailStyles.underReview
  return ''
}

function Pagination({ itemName, page, totalPages, perPage, onPageChange, onPerPageChange }: {
  itemName: string
  page: number
  totalPages: number
  perPage: number
  onPageChange: (page: number) => void
  onPerPageChange: (perPage: number) => void
}) {
  return (
    <div className={tableStyles.paginationRow}>
      <div className={tableStyles.leftControls}>
        <span className={tableStyles.viewLabel}>View</span>
        <div className={tableStyles.viewSelectBox}>
          <select className={tableStyles.viewSelect} value={perPage} onChange={(event) => onPerPageChange(Number(event.target.value))}>
            <option value={7}>7</option>
            <option value={10}>10</option>
            <option value={15}>15</option>
          </select>
        </div>
        <span className={tableStyles.perPageLabel}>{itemName} per page</span>
      </div>
      <div className={tableStyles.pagination}>
        <button className={tableStyles.pageBtn} disabled={page === 1} onClick={() => onPageChange(page - 1)}>
          ‹
        </button>
        <button className={`${tableStyles.pageBtn} ${tableStyles.active}`}>{page}</button>
        <button className={tableStyles.pageBtn} disabled={page === totalPages} onClick={() => onPageChange(page + 1)}>
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
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(7)

  useEffect(() => {
    qcpesoService.getReviewApplicants().then(setRecords)
  }, [])

  const filtered = useMemo(
    () =>
      records.filter(
        (record) =>
          (record.studentName + record.company + record.jobTitle).toLowerCase().includes(search.toLowerCase()) &&
          ['submitted', 'under_review'].includes(record.applicationStatus || ''),
      ),
    [records, search],
  )

  const handleOpenApplicant = async (record: QCPesoReviewApplicant) => {
    await openApplicantForReview(record, {
      markUnderReview: qcpesoApiService.markApplicationUnderReview,
      navigate,
      onMutationError: (error) => toast.error(getErrorMessage(error, 'Failed to start applicant review.')),
    })
  }
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const displayed = filtered.slice((page - 1) * perPage, page * perPage)

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
              onChange={(event) => { setSearch(event.target.value); setPage(1) }}
              placeholder="Search applicants..."
            />
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
                  <th>Application Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {displayed.map((record) => (
                  <tr key={record.id}>
                    <td>{record.studentName}</td>
                    <td>{record.company}</td>
                    <td>{record.jobTitle}</td>
                    <td>{record.program}</td>
                    <td>{record.dateApplied}</td>
                    <td>
                      <div className={tableStyles.actionButtons}>
                        <button className={tableStyles.reviewBtn} onClick={() => void handleOpenApplicant(record)}><Eye size={16} />Review</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {displayed.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: 24 }}>
                      No applicants found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <Pagination itemName="Students" page={page} totalPages={totalPages} perPage={perPage} onPageChange={setPage} onPerPageChange={(value) => { setPerPage(value); setPage(1) }} />
      </section>
    </main>
  )
}

export function ApplicationsHistoryPage() {
  const navigate = useNavigate()
  const [records, setRecords] = useState<QCPesoReviewApplicant[]>([])
  const [search, setSearch] = useState('')
  const [response, setResponse] = useState('All')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(7)
  const [deleteTarget, setDeleteTarget] = useState<QCPesoReviewApplicant | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const toast = useToastStore()

  useEffect(() => {
    qcpesoService.getApplicationHistory().then(setRecords)
  }, [])

  const filtered = useMemo(
    () =>
      records.filter(
        (record) =>
          (record.studentName + record.company + record.jobTitle + record.program).toLowerCase().includes(search.toLowerCase()) &&
          (response === 'All' ||
            (response === 'Ongoing' && APPLICATION_ONGOING_STATUSES.includes(record.historyStatus ?? 'For Review (QC PESO)')) ||
            (response === 'Closed' && APPLICATION_CLOSED_STATUSES.includes(record.historyStatus ?? 'For Review (QC PESO)')) ||
            record.historyStatus === response),
      ),
    [records, search, response],
  )

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
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const displayed = filtered.slice((page - 1) * perPage, page * perPage)

  return (
    <main className={tableStyles.pageContainer}>
      <QCPesoHero title="Applications History" subtitle="View the complete lifecycle of every student application." />
      <section className={tableStyles.mainContent}>
        <div className={tableStyles.toolbar}>
          <label className={tableStyles.searchBox}>
            <Search size={18} />
            <input
              value={search}
              onChange={(event) => { setSearch(event.target.value); setPage(1) }}
              placeholder="Search applications..."
            />
          </label>
          <label className={tableStyles.statusFilter}>
            <SlidersHorizontal size={18} />
            <select value={response} onChange={(event) => { setResponse(event.target.value); setPage(1) }}>
              <option value="All">All</option>
              <option>Ongoing</option>
              <option>Closed</option>
              {APPLICATION_HISTORY_STATUSES.map((value) => <option key={value}>{value}</option>)}
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
                  <th>Application Date</th>
                  <th>Referral Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {displayed.map((record) => (
                  <tr key={record.id}>
                    <td>{record.studentName}</td>
                    <td>{record.company}</td>
                    <td>{record.jobTitle}</td>
                    <td>{record.program}</td>
                    <td>{record.dateApplied}</td>
                    <td>{record.referralDate}</td>
                    <td><span className={`${tableStyles.statusPill} ${statusClass(record.historyStatus ?? 'For Review (QC PESO)')}`}>{record.historyStatus}</span></td>
                    <td>
                      <div className={tableStyles.actionButtons}>
                        <button className={tableStyles.reviewBtn} onClick={() => navigate(`/qcpeso/manage-applicants/history/${record.id}`)}><Eye size={16} />View</button>
                        {record.canHide && <button className={tableStyles.deleteBtn} onClick={() => setDeleteTarget(record)}><Trash2 size={16} />Delete</button>}
                      </div>
                    </td>
                  </tr>
                ))}
                {displayed.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: 24 }}>
                      No applications found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <Pagination itemName="Students" page={page} totalPages={totalPages} perPage={perPage} onPageChange={setPage} onPerPageChange={(value) => { setPerPage(value); setPage(1) }} />
      </section>
      {deleteTarget && <ConfirmDeleteModal subject={`${deleteTarget.studentName}'s application`} isDeleting={isDeleting} onClose={() => setDeleteTarget(null)} onConfirm={() => void handleDelete()} />}
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

export function ReviewApplicantDetailsPage({ readOnly = false }: { readOnly?: boolean }) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [record, setRecord] = useState<QCPesoReviewApplicant | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadedApplicationId, setLoadedApplicationId] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const toast = useToastStore()
  const backPath = readOnly
    ? '/qcpeso/manage-applicants/history'
    : '/qcpeso/manage-applicants/review'
  const backLabel = readOnly ? 'Back to Applications History' : 'Back to Review Applicants'

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
          <button className={detailStyles.backBtn} onClick={() => navigate(backPath)}>
            <ArrowLeft size={18} />
            {backLabel}
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
          <button className={detailStyles.backBtn} onClick={() => navigate(backPath)}>
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
      navigate(backPath)
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to delete application.'))
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <main className={detailStyles.pageContainer}>
      <header className={detailStyles.pageHeader}>
        <button className={detailStyles.backBtn} onClick={() => navigate(backPath)}>
          <ArrowLeft size={18} />
          {backLabel}
        </button>
      </header>
      <section className={detailStyles.reviewCard}>
        <div className={detailStyles.cardHeading}>
          <div>
            <h1>{readOnly ? 'Application History Details' : 'Review Applicant'}</h1>
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
          {!readOnly && ['submitted', 'under_review'].includes(record.applicationStatus || '') && (
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
          {readOnly && record.canHide && <button className={detailStyles.actionRed} disabled={isUpdating} onClick={() => setShowDeleteModal(true)}><Trash2 size={17} />Delete</button>}
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

export function ApplicationHistoryDetailsPage() {
  return <ReviewApplicantDetailsPage readOnly />
}
