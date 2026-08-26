import { useState } from 'react'
import { Building2 } from 'lucide-react'
import type { InternshipOpportunity } from '../types/internship.types'
import styles from './OpportunityDetail.module.css'

function OpportunityDetail({ opportunity }: { opportunity: InternshipOpportunity }) {
  const { details } = opportunity
  const [activeTab, setActiveTab] = useState<'description' | 'qualifications'>('description')
  const companyInitials = opportunity.companyName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
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

  const tabContent = activeTab === 'description'
    ? [details.description]
    : [details.qualifications]

  return (
    <article className={styles.detailPanel}>
      <header className={styles.detailHeader}>
        <div className={styles.headerCopy}>
          <div className={styles.companyRow}>
            <span className={styles.companyImage} aria-label={`${opportunity.companyName} logo placeholder`} title={`${opportunity.companyName} logo placeholder`}>
              {companyInitials || <Building2 aria-hidden="true" />}
            </span>
            <span>{opportunity.companyName}</span>
          </div>
          <h1>{opportunity.position}</h1>
        </div>
        <button className={styles.applyButton} type="button">Apply</button>
      </header>

      <dl className={styles.quickFacts}>
        {facts.map(([label, value]) => <div className={label === 'Address' ? styles.addressFact : undefined} key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl>

      <div className={styles.detailTabs} role="tablist" aria-label="Opportunity details">
        <button className={activeTab === 'description' ? styles.activeTab : ''} type="button" role="tab" aria-selected={activeTab === 'description'} onClick={() => setActiveTab('description')}>Job Description</button>
        <button className={activeTab === 'qualifications' ? styles.activeTab : ''} type="button" role="tab" aria-selected={activeTab === 'qualifications'} onClick={() => setActiveTab('qualifications')}>Qualifications</button>
      </div>

      <section className={styles.detailSection}>
        {tabContent.map((paragraph, index) => <p key={`${index}-${paragraph}`}>{paragraph}</p>)}
      </section>
    </article>
  )
}

export default OpportunityDetail
