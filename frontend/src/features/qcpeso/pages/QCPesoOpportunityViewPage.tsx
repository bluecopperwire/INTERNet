import { ArrowLeft, CalendarDays } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { qcpesoService } from '../services/qcpeso.service'
import type { QCPesoOpportunity } from '../types/qcpeso.types'
import styles from '../../employer/pages/OpportunityDetailsPage.module.css'

export function QCPesoOpportunityViewPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [opportunity, setOpportunity] = useState<QCPesoOpportunity | null>(null)
  useEffect(() => { if (id) qcpesoService.getQCPesoOpportunity(id).then(setOpportunity) }, [id])
  if (!opportunity) return <main className={styles.feedback}>Loading opportunity...</main>
  const fields = [['Position Title', opportunity.title], ['Company', opportunity.company], ['Department', opportunity.department], ['Work Arrangement', opportunity.workArrangement], ['Internship Duration', `${opportunity.duration} hours`], ['Number of Slots', String(opportunity.slots)], ['Allowance', opportunity.allowance]]
  return <main className={styles.pageContainer}><div className={styles.header}><button className={styles.backButton} onClick={() => navigate(-1)}><ArrowLeft size={19} />Back to Review Applicant</button></div><section className={styles.formCard}><header className={styles.formHeader}><h1>View Opportunity</h1><p>Review the opportunity information associated with this application.</p></header><div className={styles.formGrid}>{fields.map(([label, value]) => <label className={styles.field} key={label}><span>{label}</span><input value={value} readOnly /></label>)}<label className={`${styles.field} ${styles.fullWidth}`}><span>Job Description</span><textarea value={opportunity.jobDescription} rows={6} readOnly /></label><label className={`${styles.field} ${styles.fullWidth}`}><span>Qualifications</span><textarea value={opportunity.qualifications} rows={5} readOnly /></label><label className={`${styles.field} ${styles.fullWidth}`}><span>Application Deadline</span><div className={styles.dateField}><input value={new Date(`${opportunity.applicationDeadline}T00:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} readOnly /><CalendarDays size={20} /></div></label></div></section></main>
}
