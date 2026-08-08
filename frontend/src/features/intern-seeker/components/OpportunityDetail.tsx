import { useState } from 'react'
import { Zap } from 'lucide-react'
import type { InternshipOpportunity } from '../types/internship.types'
import styles from './OpportunityDetail.module.css'

function OpportunityDetail({ opportunity }: { opportunity: InternshipOpportunity }) {
  const { details } = opportunity
  const [activeTab, setActiveTab] = useState<'description' | 'requirements' | 'benefits' | 'overview'>('description')

  return (
    <article className={styles.detailPanel}>
      <header className={styles.detailHeader}>
        <div>
          <span className={styles.detailCompany}><span className={styles.companyDot} />{opportunity.companyName}</span>
          <h1>{opportunity.position}</h1>
          <p>{opportunity.location} ({opportunity.workSetup})</p>
        </div>
        <button className={styles.applyButton} type="button"><Zap /> Easy apply</button>
      </header>

      <dl className={styles.quickFacts}>
        <div><dt>Where you&apos;ll do it</dt><dd>{details.workplace}</dd></div>
        <div><dt>The Interview Process</dt><dd>{details.interviewProcess}</dd></div>
        <div><dt>Tools</dt><dd>{details.tools.join(', ')}</dd></div>
        <div><dt>Reporting to</dt><dd>{details.reportingTo}</dd></div>
        <div><dt>Your team</dt><dd>{details.team}</dd></div>
      </dl>

      <div className={styles.detailTabs} role="tablist" aria-label="Opportunity details">
        {([['description', 'Description'], ['requirements', 'Requirement'], ['benefits', 'Benefit'], ['overview', 'Overview']] as const).map(([tab, label]) => (
          <button className={activeTab === tab ? styles.activeTab : ''} key={tab} type="button" role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)}>{label}</button>
        ))}
      </div>

      {activeTab === 'description' && <DetailSection title="Internship Description" intro={details.description} items={details.responsibilities} />}
      {activeTab === 'requirements' && <DetailSection title="Requirement" intro="What You’ll Bring" items={details.requirements} />}
      {activeTab === 'benefits' && <DetailSection title="Benefit" intro={`Allowance: ${details.allowance}`} items={details.benefits} />}
      {activeTab === 'overview' && (
        <section className={styles.detailSection}>
          <h2>Overview</h2>
          <dl className={styles.overviewGrid}>
            <div><dt>Size</dt><dd>{details.companySize}</dd></div>
            <div><dt>Founded</dt><dd>{details.founded}</dd></div>
            <div><dt>Type</dt><dd>{details.companyType}</dd></div>
            <div><dt>Industry</dt><dd>{details.industry}</dd></div>
          </dl>
        </section>
      )}
    </article>
  )
}

function DetailSection({ title, intro, items }: { title: string; intro: string; items: string[] }) {
  return <section className={styles.detailSection}><h2>{title}</h2><strong>{intro}</strong><ul>{items.map((item) => <li key={item}>{item}</li>)}</ul></section>
}

export default OpportunityDetail
