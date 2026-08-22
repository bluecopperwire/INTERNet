import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Calendar, Check, Download, Eye, FileText, Mail, MapPin, Phone, Search, SlidersHorizontal, User, X } from 'lucide-react'
import { qcpesoService } from '../services/qcpeso.service'
import type { QCPesoReferral, QCPesoReviewApplicant } from '../types/qcpeso.types'
import QCPesoHero from '../components/QCPesoHero'
import tableStyles from '../../employer/pages/ApplicantsPage.module.css'
import detailStyles from '../../employer/pages/ReviewApplicantPage.module.css'

const documentLabels = ['Proof of Residency', 'Latest Credentials', 'Curriculum Vitae / Resume', 'Letter of Intent', 'Recommendation Letter / Registration Form', 'Endorsement Letter']

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
  return <div className={tableStyles.paginationRow}><div className={tableStyles.leftControls}><span className={tableStyles.viewLabel}>View</span><div className={tableStyles.viewSelectBox}><select className={tableStyles.viewSelect} defaultValue="7"><option>7</option><option>10</option><option>15</option></select></div><span className={tableStyles.perPageLabel}>{itemName} per page</span></div><div className={tableStyles.pagination}><button className={tableStyles.pageBtn} disabled>‹</button><button className={`${tableStyles.pageBtn} ${tableStyles.active}`}>1</button><button className={tableStyles.pageBtn} disabled>›</button></div></div>
}

export function ReviewApplicantsPage() {
  const navigate = useNavigate()
  const [records, setRecords] = useState<QCPesoReviewApplicant[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('All')

  useEffect(() => { qcpesoService.getReviewApplicants().then(setRecords) }, [])
  const filtered = useMemo(() => records.filter((record) => (record.studentName + record.company + record.jobTitle).toLowerCase().includes(search.toLowerCase()) && (status === 'All' || record.status === status)), [records, search, status])

  return <main className={tableStyles.pageContainer}><QCPesoHero title="Review Applicants" subtitle="Review and verify student applications submitted to partner companies." /><section className={tableStyles.mainContent}>
    <div className={tableStyles.toolbar}><label className={tableStyles.searchBox}><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search applicants..." /></label><label className={tableStyles.statusFilter}><SlidersHorizontal size={18} /><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="All">All Statuses</option><option>Pending</option><option>Accepted</option><option>Rejected</option></select></label></div>
    <div className={tableStyles.tableCard}><div className={tableStyles.tableWrapper}><table className={tableStyles.table}><thead><tr><th>Student Name</th><th>Company</th><th>Job Title</th><th>Program / Strand</th><th>Year Level</th><th>Date Applied</th><th>Status</th><th>Action</th></tr></thead><tbody>{filtered.map((record) => <tr key={record.id}><td>{record.studentName}</td><td>{record.company}</td><td>{record.jobTitle}</td><td>{record.program}</td><td>{record.yearLevel}</td><td>{record.dateApplied}</td><td><span className={`${tableStyles.statusPill} ${statusClass(record.status)}`}>{record.status}</span></td><td><button className={tableStyles.reviewBtn} onClick={() => navigate(`/qcpeso/manage-applicants/review/${record.id}`)}><Eye size={16} />Review</button></td></tr>)}{filtered.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', padding: 24 }}>No applicants found.</td></tr>}</tbody></table></div></div><Pagination itemName="Students" />
  </section></main>
}

export function TrackReferralsPage() {
  const navigate = useNavigate()
  const [records, setRecords] = useState<QCPesoReferral[]>([])
  const [search, setSearch] = useState('')
  const [response, setResponse] = useState('All')
  useEffect(() => { qcpesoService.getReferrals().then(setRecords) }, [])
  const filtered = useMemo(() => records.filter((record) => (record.studentName + record.company + record.jobTitle).toLowerCase().includes(search.toLowerCase()) && (response === 'All' || record.companyResponse === response)), [records, search, response])
  return <main className={tableStyles.pageContainer}><QCPesoHero title="Track Referrals" subtitle="Track referrals sent to companies and their latest responses." /><section className={tableStyles.mainContent}>
    <div className={tableStyles.toolbar}><label className={tableStyles.searchBox}><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search referrals..." /></label><label className={tableStyles.statusFilter}><SlidersHorizontal size={18} /><select value={response} onChange={(event) => setResponse(event.target.value)}><option value="All">All Responses</option><option>Pending</option><option>For Interview</option><option>Accepted</option><option>Rejected</option></select></label></div>
    <div className={tableStyles.tableCard}><div className={tableStyles.tableWrapper}><table className={tableStyles.table}><thead><tr><th>Student Name</th><th>Company</th><th>Job Title</th><th>Referral Date</th><th>Company Response</th><th>Student Response</th><th>Action</th></tr></thead><tbody>{filtered.map((record) => <tr key={record.id}><td>{record.studentName}</td><td>{record.company}</td><td>{record.jobTitle}</td><td>{record.referralDate}</td><td><span className={`${tableStyles.statusPill} ${statusClass(record.companyResponse)}`}>{record.companyResponse}</span></td><td><span className={`${tableStyles.statusPill} ${statusClass(record.studentResponse)}`}>{record.studentResponse}</span></td><td><button className={tableStyles.reviewBtn} onClick={() => navigate(`/qcpeso/manage-applicants/referrals/${record.id}`)}><Eye size={16} />Review</button></td></tr>)}{filtered.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24 }}>No referrals found.</td></tr>}</tbody></table></div></div><Pagination itemName="Students" />
  </section></main>
}

function DocumentList({ studentName, title = 'Applicant Documents' }: { studentName: string; title?: string }) {
  const filenamePrefix = studentName.replace(/\s+/g, '').toLowerCase()
  return <section className={detailStyles.infoCard}><h2 className={detailStyles.sectionTitle}><span><FileText size={18} /></span>{title}</h2><div className={detailStyles.docsList}>{documentLabels.map((label) => <div className={detailStyles.docItem} key={label}><span className={detailStyles.docIcon}><FileText size={17} /></span><div><strong>{label}</strong><p>{filenamePrefix}_{label.toLowerCase().replace(/[^a-z]+/g, '_')}.pdf</p></div><button className={detailStyles.viewDocBtn}><Download size={15} />Download</button></div>)}</div></section>
}

export function ReviewApplicantDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [record, setRecord] = useState<QCPesoReviewApplicant | null>(null)
  useEffect(() => { if (id) qcpesoService.getReviewApplicant(id).then(setRecord) }, [id])
  if (!record) return <main className={detailStyles.pageContainer}><p className={detailStyles.loading}>Loading applicant details...</p></main>
  const updateStatus = async (status: QCPesoReviewApplicant['status']) => {
    if (record.status === 'Accepted' || record.status === 'Rejected') return
    const updated = await qcpesoService.updateReviewApplicantStatus(record.id, status)
    if (updated) setRecord(updated)
  }
  return <main className={detailStyles.pageContainer}><header className={detailStyles.pageHeader}><button className={detailStyles.backBtn} onClick={() => navigate('/qcpeso/manage-applicants/review')}><ArrowLeft size={18} />Back to Review Applicants</button></header><section className={detailStyles.reviewCard}><div className={detailStyles.cardHeading}><div><h1>Review Applicant</h1><p>Review the applicant’s information and documents before making a decision.</p></div><span className={`${detailStyles.statusPill} ${detailStatusClass(record.status)}`}>{record.status}</span></div><div className={detailStyles.twoColumnGrid}><aside className={detailStyles.profileCard}><div className={detailStyles.profileAvatarRow}><div className={detailStyles.avatarPlaceholder}><User size={34} /></div><div className={detailStyles.profileInfo}><h2>{record.studentName}</h2><div className={detailStyles.contactMeta}><a href={`mailto:${record.email}`}><Mail size={15} />{record.email}</a><p><Phone size={15} />{record.phone}</p></div><p><MapPin size={15} />{record.address}</p></div></div><div className={detailStyles.divider} /><div className={detailStyles.appliedForSection}><span>APPLIED FOR</span><h3>{record.jobTitle}</h3><p>{record.company}</p><p>Applied on {record.dateApplied}</p></div></aside><div className={detailStyles.rightColumn}><section className={detailStyles.infoCard}><h2 className={detailStyles.sectionTitle}><span><User size={18} /></span>Application Information</h2><InfoRows values={[["Full Name", record.studentName], ["Company", record.company], ["Job Title", record.jobTitle], ["Program / Strand", record.program], ["Year Level", record.yearLevel], ["School", record.school]]} /></section><section className={detailStyles.infoCard}><h2 className={detailStyles.sectionTitle}><span><Calendar size={18} /></span>Internship Information</h2><InfoRows values={[["Required Hours", `${record.requiredHours} hours`], ["Available Days", record.availableDays], ["Available Starting Date", record.availableStartingDate]]} /></section><DocumentList studentName={record.studentName} /></div></div><footer className={detailStyles.actionBar}><button className={detailStyles.actionBlue} onClick={() => navigate(`/qcpeso/manage-applicants/opportunities/${record.opportunityId}`)}><Eye size={17} />View Opportunity</button><button className={detailStyles.actionGreen} onClick={() => updateStatus('Accepted')}><Check size={17} />Accept Applicant</button><button className={detailStyles.actionRed} onClick={() => updateStatus('Rejected')}><X size={17} />Reject Applicant</button></footer></section></main>
}

function InfoRows({ values }: { values: string[][] }) { return <div className={detailStyles.infoList}>{values.map(([label, value]) => <div className={detailStyles.infoRow} key={label}><span>{label}</span><strong>{value}</strong></div>)}</div> }

export function ReferralDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [record, setRecord] = useState<QCPesoReferral | null>(null)
  useEffect(() => { if (id) qcpesoService.getReferral(id).then(setRecord) }, [id])
  if (!record) return <main className={detailStyles.pageContainer}><p className={detailStyles.loading}>Loading referral details...</p></main>
  return <main className={detailStyles.pageContainer}><header className={detailStyles.pageHeader}><button className={detailStyles.backBtn} onClick={() => navigate('/qcpeso/manage-applicants/referrals')}><ArrowLeft size={18} />Back to Track Referrals</button></header><section className={detailStyles.reviewCard}><div className={detailStyles.cardHeading}><div><h1>Referral Details</h1><p>Review the documents sent to the company and the current referral responses.</p></div></div><div className={detailStyles.twoColumnGrid}><aside className={detailStyles.profileCard}><div className={detailStyles.profileAvatarRow}><div className={detailStyles.avatarPlaceholder}><User size={34} /></div><div className={detailStyles.profileInfo}><h2>{record.studentName}</h2><div className={detailStyles.contactMeta}><a href={`mailto:${record.email}`}><Mail size={15} />{record.email}</a><p><Phone size={15} />{record.phone}</p></div><p><MapPin size={15} />{record.address}</p></div></div><div className={detailStyles.divider} /><div className={detailStyles.appliedForSection}><span>REFERRED TO</span><h3>{record.company}</h3><p>{record.jobTitle}</p><p>Referred on {record.referralDate}</p></div></aside><div className={detailStyles.rightColumn}><section className={detailStyles.infoCard}><h2 className={detailStyles.sectionTitle}><span><User size={18} /></span>Referral Responses</h2><InfoRows values={[["Company Response", record.companyResponse], ["Student Response", record.studentResponse]]} /></section><DocumentList studentName={record.studentName} title="Documents Sent to Company" /></div></div></section></main>
}
