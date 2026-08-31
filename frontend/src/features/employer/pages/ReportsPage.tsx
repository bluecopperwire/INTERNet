import { useEffect, useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { EmployerHero } from '../components/EmployerHero'
import { employerService } from '../services/employer.service'
import type { Applicant } from '../types/employer.types'
import qcLogos from '../../../assets/qc-logos-2.png'
import styles from './ReportsPage.module.css'
import { todayDateOnly } from '../../../utils/date-only'

const statusConfig = [
  { label: 'Pending', values: ['Pending', 'For Review', 'Under Review', 'Shortlisted'], color: '#4b4395' },
  { label: 'Accepted', values: ['Accepted'], color: '#211578' },
  { label: 'For Interview', values: ['For Interview'], color: '#ffb83e' },
  { label: 'Rejected', values: ['Rejected'], color: '#dc0000' },
]

const localDateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

export function ReportsPage() {
  const [applicants, setApplicants] = useState<Applicant[]>([])
  const [startDate, setStartDate] = useState('2026-08-08')
  const [endDate, setEndDate] = useState('2026-08-17')
  useEffect(() => { employerService.getAllApplicants().then(setApplicants) }, [])
  const range = { start: startDate, end: endDate }
  const dateValue = (value: string) => localDateKey(new Date(value))
  const rangedApplicants = useMemo(() => applicants.filter((applicant) => { const date = dateValue(applicant.dateApplied); return date >= range.start && date <= range.end }), [applicants, range])
  const statusData = useMemo(() => { const total = rangedApplicants.length || 1; return statusConfig.map((item) => { const count = rangedApplicants.filter((applicant) => item.values.includes(applicant.status)).length; return { ...item, count, percentage: Math.round((count / total) * 100) } }) }, [rangedApplicants])
  const donutGradient = useMemo(() => { let start = 0; const stops = statusData.map((item) => { const end = start + item.percentage; const result = `${item.color} ${start}% ${end}%`; start = end; return result }); return applicants.length ? `conic-gradient(${stops.join(', ')})` : '#eef0f4' }, [applicants.length, statusData])
  const timeline = useMemo(() => { const dates: string[] = []; const date = new Date(`${range.start}T00:00:00`); const end = new Date(`${range.end}T00:00:00`); while (date <= end && dates.length < 8) { dates.push(localDateKey(date)); date.setDate(date.getDate() + 1) } return dates.map((day) => [day, rangedApplicants.filter((applicant) => dateValue(applicant.dateApplied) === day).length] as const) }, [rangedApplicants, range])
  const maxValue = Math.max(4, ...timeline.map(([, count]) => count))
  const points = timeline.map(([, count], index) => `${timeline.length === 1 ? 310 : 44 + index * 532 / (timeline.length - 1)},${182 - count / maxValue * 142}`).join(' ')
  const summary = { total: rangedApplicants.length, accepted: statusData[1].count, forInterview: statusData[2].count, rejected: statusData[3].count }
  const generatedAt = new Intl.DateTimeFormat('en-PH', { dateStyle: 'long' }).format(new Date())

  return <main className={styles.pageContainer}>
    <EmployerHero title="Reports" subtitle="Generate and download reports" comfortableSpacing />
    <section className={styles.mainContent}>
      <section><h2 className={styles.summaryTitle}>Summary</h2><div className={styles.summaryGrid}><SummaryCard label="Total Applicants" value={summary.total} /><SummaryCard label="Accepted" value={summary.accepted} /><SummaryCard label="For Interview" value={summary.forInterview} /><SummaryCard label="Rejected" value={summary.rejected} /></div></section>
      <div className={styles.reportingPeriodRow}><span className={styles.reportingPeriodTitle}>Reporting Period</span><label className={styles.reportingPeriod}><span className={styles.srOnly}>Select reporting period</span><div className={styles.dateRange}><input type="date" value={startDate} max={endDate || todayDateOnly()} onChange={(event) => setStartDate(event.target.value)} /><em>to</em><input type="date" value={endDate} min={startDate} max={todayDateOnly()} onChange={(event) => setEndDate(event.target.value)} /></div></label></div>
      <div className={styles.chartsGrid}>
        <article className={styles.chartPanel}><header className={styles.chartHeader}><div><h2>Applicants by Status</h2><p>Current application distribution</p></div></header><div className={styles.donutBody}><div className={styles.donut} style={{ background: donutGradient }}><div /></div><div className={styles.legend}>{statusData.map((item) => <div key={item.label}><span style={{ background: item.color }} />{item.label}<strong>{item.percentage}%</strong></div>)}</div></div></article>
        <article className={styles.chartPanel}><header className={styles.chartHeader}><div><h2>Applicants Over Time</h2><p>Daily application submissions</p></div></header><div className={styles.timelineBody}><span className={styles.yLabel}>Applicants</span><div className={styles.lineChart}><svg viewBox="0 0 600 220">{[40,75,110,145,180].map((y, index) => <g key={y}><text x="30" y={y + 4}>{Math.round(maxValue - maxValue * index / 4)}</text><line x1="44" x2="576" y1={y} y2={y} /></g>)}{points && <polyline points={points} />}{points.split(' ').filter(Boolean).map((point) => { const [cx, cy] = point.split(','); return <circle key={point} cx={cx} cy={cy} r="4" /> })}</svg><div className={styles.axisLabels}>{timeline.map(([day]) => <span key={day}>{day.slice(5).replace('-', '/')}</span>)}</div></div></div></article>
      </div>
      <button className={styles.downloadBtn} onClick={() => window.print()}><Download size={18} />Download PDF</button>
      <article className={styles.printReport}>
        <header className={styles.printHeader}>
          <div className={styles.printBrand} aria-label="INTERNet"><span>INTER</span><strong>Net</strong></div>
          <img className={styles.printQcLogos} src={qcLogos} alt="Quezon City and QC PESO" />
        </header>
        <section className={styles.printTitle}><h1>Applicant Summary Report</h1><p>ABC Company · Generated {generatedAt}</p></section>
        <section className={styles.printPeriod}><strong>Reporting Period</strong><span>{startDate} to {endDate}</span></section>
        <section className={styles.printMetrics}>
          <PrintMetric label="Total Applicants" value={summary.total} /><PrintMetric label="Accepted" value={summary.accepted} /><PrintMetric label="For Interview" value={summary.forInterview} /><PrintMetric label="Rejected" value={summary.rejected} />
        </section>
        <section className={styles.printSection}><h2>Applicants by Status</h2><table><thead><tr><th>Status</th><th>Applicants</th><th>Distribution</th></tr></thead><tbody>{statusData.map((item) => <tr key={item.label}><td><span className={styles.printDot} style={{ background: item.color }} />{item.label}</td><td>{item.count}</td><td>{item.percentage}%</td></tr>)}</tbody></table></section>
        <section className={styles.printSection}><h2>Applicants Over Time</h2><table><thead><tr><th>Date</th><th>Applications Submitted</th></tr></thead><tbody>{timeline.map(([day, count]) => <tr key={day}><td>{day}</td><td>{count}</td></tr>)}</tbody></table></section>
        <footer className={styles.printFooter}>INTERNet · QC PESO Applicant Management Report</footer>
      </article>
    </section>
  </main>
}

function SummaryCard({ label, value }: { label: string; value: number }) { return <article className={styles.summaryCard}><h3>{label}</h3><p>{value}</p></article> }
function PrintMetric({ label, value }: { label: string; value: number }) { return <div><span>{label}</span><strong>{value}</strong></div> }
export default ReportsPage
