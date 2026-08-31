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
  User,
  X,
} from 'lucide-react'
import { qcpesoService } from '../services/qcpeso.service'
import type { QCPesoReferral, QCPesoReviewApplicant } from '../types/qcpeso.types'
import QCPesoHero from '../components/QCPesoHero'
import { RejectApplicantModal } from '../../employer/components/RejectApplicantModal'
import tableStyles from '../../employer/pages/ApplicantsPage.module.css'
import detailStyles from '../../employer/pages/ReviewApplicantPage.module.css'
import { API_BASE_URL } from '../../../services/api'

const APPLICANT_REQUIREMENTS = [
  { key: 'proof_of_residency', label: 'Proof of Residency' },
  { key: 'latest_credentials', label: 'Latest Credentials' },
  { key: 'curriculum_vitae_resume', label: 'Curriculum Vitae / Resume' },
  { key: 'letter_of_intent', label: 'Letter of Intent' },
]

function normalizeKey(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function matchDocRequirement(
  d: { typeName?: string; name?: string },
  reqKey: string,
) {
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
      normType.includes('intent') ||
      normType.includes('loi') ||
      normName.includes('intent') ||
      normName.includes('loi')
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
  if (status === 'Rejected') return tableStyles.rejected
  if (status === 'For Review' || status === 'For Interview') return tableStyles.underReview
  return ''
}

function detailStatusClass(status: string) {
  if (status === 'Accepted') return detailStyles.accepted
  if (status === 'Rejected') return detailStyles.rejected
  if (status === 'For Review' || status === 'For Interview') return detailStyles.underReview
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
        <button className={tableStyles.pageBtn} disabled>‹</button>
        <button className={`${tableStyles.pageBtn} ${tableStyles.active}`}>1</button>
        <button className={tableStyles.pageBtn} disabled>›</button>
      </div>
    </div>
  )
}

export function ReviewApplicantsPage() {
  const navigate = useNavigate()
  const [records, setRecords] = useState<QCPesoReviewApplicant[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('All')

  useEffect(() => {
    qcpesoService.getReviewApplicants().then(setRecords)
  }, [])

  const filtered = useMemo(
    () =>
      records.filter(
        (record) =>
          (record.studentName + record.company + record.jobTitle)
            .toLowerCase()
            .includes(search.toLowerCase()) &&
          (status === 'All' || record.status === status),
      ),
    [records, search, status],
  )

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
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="All">All Statuses</option>
              <option>Pending</option>
              <option>Accepted</option>
              <option>Rejected</option>
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
                      <span
                        className={`${tableStyles.statusPill} ${statusClass(
                          record.status,
                        )}`}
                      >
                        {record.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className={tableStyles.reviewBtn}
                        onClick={() =>
                          navigate(`/qcpeso/manage-applicants/review/${record.id}`)
                        }
                      >
                        <Eye size={16} />Review
                      </button>
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
    </main>
  )
}

export function TrackReferralsPage() {
  const navigate = useNavigate()
  const [records, setRecords] = useState<QCPesoReferral[]>([])
  const [search, setSearch] = useState('')
  const [response, setResponse] = useState('All')

  useEffect(() => {
    qcpesoService.getReferrals().then(setRecords)
  }, [])

  const filtered = useMemo(
    () =>
      records.filter(
        (record) =>
          (record.studentName + record.company + record.jobTitle)
            .toLowerCase()
            .includes(search.toLowerCase()) &&
          (response === 'All' || record.companyResponse === response),
      ),
    [records, search, response],
  )

  return (
    <main className={tableStyles.pageContainer}>
      <QCPesoHero
        title="Track Referrals"
        subtitle="Track referrals sent to companies and their latest responses."
      />
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
            <select
              value={response}
              onChange={(event) => setResponse(event.target.value)}
            >
              <option value="All">All Responses</option>
              <option>Pending</option>
              <option>For Interview</option>
              <option>Accepted</option>
              <option>Rejected</option>
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
                      <span
                        className={`${tableStyles.statusPill} ${statusClass(
                          record.companyResponse,
                        )}`}
                      >
                        {record.companyResponse}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`${tableStyles.statusPill} ${statusClass(
                          record.studentResponse,
                        )}`}
                      >
                        {record.studentResponse}
                      </span>
                    </td>
                    <td>
                      <button
                        className={tableStyles.reviewBtn}
                        onClick={() =>
                          navigate(
                            `/qcpeso/manage-applicants/referrals/${record.id}`,
                          )
                        }
                      >
                        <Eye size={16} />Review
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 24 }}>
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
    </main>
  )
}

function DocumentList({
  title = 'Applicant Documents',
  documents = [],
}: {
  studentName?: string
  title?: string
  documents?: Array<{ id: string; name: string; typeName?: string; filePath: string }>
}) {
  return (
    <section className={detailStyles.infoCard}>
      <h2 className={detailStyles.sectionTitle}>
        <span><FileText size={18} /></span>{title}
      </h2>
      <div className={detailStyles.docsList}>
        {APPLICANT_REQUIREMENTS.map(({ key, label }) => {
          const match = documents.find((d) => matchDocRequirement(d, key))
          const filePath = match?.filePath || ''
          const hasFile = Boolean(filePath)
          const displayFilename = match?.name || (filePath ? filePath.split('/').pop() : 'Not submitted')

          return (
            <div className={detailStyles.docItem} key={key}>
              <span className={detailStyles.docIcon}><FileText size={17} /></span>
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
                <Download size={15} />{hasFile ? 'Download' : 'Unavailable'}
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
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)

  useEffect(() => {
    if (id) {
      setIsLoading(true)
      setError(null)
      qcpesoService
        .getReviewApplicant(id)
        .then((res) => {
          if (!res) {
            setError('Applicant details not found.')
          } else {
            setRecord(res)
          }
        })
        .catch((err) => {
          setError(err?.message || 'Failed to load applicant details.')
        })
        .finally(() => {
          setIsLoading(false)
        })
    }
  }, [id])

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
          <button
            className={detailStyles.backBtn}
            onClick={() => navigate('/qcpeso/manage-applicants/review')}
          >
            <ArrowLeft size={18} />Back to Review Applicants
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
          <h2 style={{ color: '#160e6f', marginBottom: '8px' }}>
            Unable to load applicant
          </h2>
          <p style={{ color: '#64748b', marginBottom: '20px' }}>
            {error || 'Applicant record not found.'}
          </p>
          <button
            className={detailStyles.backBtn}
            onClick={() => navigate('/qcpeso/manage-applicants/review')}
          >
            Return to Applicants List
          </button>
        </div>
      </main>
    )
  }

  const updateStatus = async (
    status: QCPesoReviewApplicant['status'],
    remark?: string,
  ) => {
    if (record.status === 'Accepted' || record.status === 'Rejected' || isUpdating)
      return
    setIsUpdating(true)
    try {
      const updated = await qcpesoService.updateReviewApplicantStatus(
        record.id,
        status,
        remark,
      )
      if (updated) {
        setRecord(updated)
      }
      setShowRejectModal(false)
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to update status')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleRejectConfirm = async (remark: string) => {
    await updateStatus('Rejected', remark)
  }

  return (
    <main className={detailStyles.pageContainer}>
      <header className={detailStyles.pageHeader}>
        <button
          className={detailStyles.backBtn}
          onClick={() => navigate('/qcpeso/manage-applicants/review')}
        >
          <ArrowLeft size={18} />Back to Review Applicants
        </button>
      </header>
      <section className={detailStyles.reviewCard}>
        <div className={detailStyles.cardHeading}>
          <div>
            <h1>Review Applicant</h1>
            <p>
              Review the applicant’s information and documents before making a
              decision.
            </p>
          </div>
          <span
            className={`${detailStyles.statusPill} ${detailStatusClass(
              record.status,
            )}`}
          >
            {record.status}
          </span>
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
                    <Mail size={15} />{record.email || 'N/A'}
                  </a>
                  <p>
                    <Phone size={15} />{record.phone || 'N/A'}</p>
                </div>
                <p>
                  <MapPin size={15} />{record.address || 'N/A'}
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
                <span><User size={18} /></span>Application Information
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
                <span><Calendar size={18} /></span>Internship Information
              </h2>
              <InfoRows
                values={[
                  ['Required Hours', `${record.requiredHours || 0} hours`],
                  ['Available Days', record.availableDays || 'N/A'],
                  [
                    'Available Starting Date',
                    record.availableStartingDate || 'N/A',
                  ],
                ]}
              />
            </section>
            <DocumentList
              studentName={record.studentName}
              documents={record.documents}
            />
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
            <Eye size={17} />View Opportunity
          </button>
          {record.status !== 'Accepted' && record.status !== 'Rejected' && (
            <>
              <button
                className={detailStyles.actionGreen}
                disabled={isUpdating}
                onClick={() => updateStatus('Accepted')}
              >
                <Check size={17} />{isUpdating ? 'Referring...' : 'Refer Applicant'}
              </button>
              <button
                className={detailStyles.actionRed}
                disabled={isUpdating}
                onClick={() => setShowRejectModal(true)}
              >
                <X size={17} />Reject Applicant
              </button>
            </>
          )}
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
    </main>
  )
}

export function ReferralDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [record, setRecord] = useState<QCPesoReferral | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

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
          <button
            className={detailStyles.backBtn}
            onClick={() => navigate('/qcpeso/manage-applicants/referrals')}
          >
            <ArrowLeft size={18} />Back to Track Referrals
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
          <h2 style={{ color: '#160e6f', marginBottom: '8px' }}>
            Unable to load referral
          </h2>
          <p style={{ color: '#64748b', marginBottom: '20px' }}>
            {error || 'Referral record not found.'}
          </p>
          <button
            className={detailStyles.backBtn}
            onClick={() => navigate('/qcpeso/manage-applicants/referrals')}
          >
            Return to Referrals List
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className={detailStyles.pageContainer}>
      <header className={detailStyles.pageHeader}>
        <button
          className={detailStyles.backBtn}
          onClick={() => navigate('/qcpeso/manage-applicants/referrals')}
        >
          <ArrowLeft size={18} />Back to Track Referrals
        </button>
      </header>
      <section className={detailStyles.reviewCard}>
        <div className={detailStyles.cardHeading}>
          <div>
            <h1>Referral Details</h1>
            <p>
              Review the documents sent to the company and the current referral
              responses.
            </p>
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
                    <Mail size={15} />{record.email || 'N/A'}
                  </a>
                  <p>
                    <Phone size={15} />{record.phone || 'N/A'}
                  </p>
                </div>
                <p>
                  <MapPin size={15} />{record.address || 'N/A'}
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
                <span><User size={18} /></span>Referral Responses
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
      </section>
    </main>
  )
}
