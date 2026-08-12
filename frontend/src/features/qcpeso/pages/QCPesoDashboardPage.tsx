import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, ChevronRight } from 'lucide-react'
import headerImage from '../../../assets/requirements-header-image.png'
import styles from './QCPesoDashboardPage.module.css'
import { useQCPeso } from '../hooks/useQCPeso'
import { StudentReviewModal } from '../components/StudentReviewModal'
import { EmployerReviewModal } from '../components/EmployerReviewModal'
import type { StudentApplication, EmployerOpportunity } from '../types/qcpeso.types'

export const QCPesoDashboardPage: React.FC = () => {
  const { summary, students, employers, isLoading } = useQCPeso()
  const navigate = useNavigate()
  
  const [selectedStudent, setSelectedStudent] = useState<StudentApplication | null>(null)
  const [selectedEmployer, setSelectedEmployer] = useState<EmployerOpportunity | null>(null)

  if (isLoading || !summary) return <div className={styles.loading}>Loading Dashboard...</div>

  const DocumentsBgIcon = ({ isWhite = false }: { isWhite?: boolean }) => (
    <svg 
      className={`${styles.bgIcon} ${isWhite ? styles.bgIconWhite : styles.bgIconBlue}`} 
      viewBox="0 0 64 64" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="3" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M40 56H22a4 4 0 0 1-4-4V16a4 4 0 0 1 4-4h12l10 10v30a4 4 0 0 1-4 4z" />
      <path d="M26 40h12" />
      <path d="M26 48h12" />
      <path d="M52 56h-8V26l-10-10H30V12a4 4 0 0 1 4-4h12l10 10v34a4 4 0 0 1-4 4z" />
      <path d="M38 32h12" />
      <path d="M38 40h12" />
    </svg>
  )

  const BriefcaseBgIcon = ({ isWhite = false }: { isWhite?: boolean }) => (
    <svg 
      className={`${styles.bgIcon} ${isWhite ? styles.bgIconWhite : styles.bgIconBlue}`} 
      viewBox="0 0 64 64" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="3" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <rect x="10" y="24" width="44" height="30" rx="4" ry="4" />
      <path d="M42 24V14a2 2 0 0 0-2-2H24a2 2 0 0 0-2 2v10" />
      <line x1="10" y1="40" x2="54" y2="40" />
      <circle cx="32" cy="40" r="3" fill={isWhite ? "#ffffff" : "currentColor"} />
    </svg>
  )

  return (
    <main className={styles.pageContainer}>
      <StudentReviewModal 
        isOpen={!!selectedStudent} 
        onClose={() => setSelectedStudent(null)} 
        student={selectedStudent} 
      />
      
      <EmployerReviewModal 
        isOpen={!!selectedEmployer} 
        onClose={() => setSelectedEmployer(null)} 
        employer={selectedEmployer} 
      />

      <header className={styles.heroHeader}>
        <img src={headerImage} alt="" className={styles.heroBgImage} />
        <div className={styles.heroOverlay} />
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>Main Dashboard</h1>
          <p className={styles.heroSubtitle}>QCPESO Information Summary</p>
        </div>
      </header>

      <section className={styles.mainContent}>
        <div className={styles.summaryGrid}>
          <div className={`${styles.summaryCard} ${styles.cardBlue}`}>
            <h3 className={styles.cardTitle}>Total Pending Student Applications</h3>
            <p className={styles.cardValue}>{summary.pendingApplications}</p>
            <DocumentsBgIcon isWhite={false} />
          </div>

          <div className={`${styles.summaryCard} ${styles.cardGradient}`}>
            <h3 className={styles.cardTitleDark}>Total Verified Requirements</h3>
            <p className={styles.cardValueDark}>{summary.verifiedRequirements}</p>
            <DocumentsBgIcon isWhite={true} />
          </div>

          <div className={`${styles.summaryCard} ${styles.cardGradient}`}>
            <h3 className={styles.cardTitleDark}>Total Active Employers</h3>
            <p className={styles.cardValueDark}>{summary.activeEmployers}</p>
            <BriefcaseBgIcon isWhite={true} />
          </div>

          <div className={`${styles.summaryCard} ${styles.cardBlue}`}>
            <h3 className={styles.cardTitle}>Total Available Opportunities</h3>
            <p className={styles.cardValue}>{summary.availableOpportunities}</p>
            <BriefcaseBgIcon isWhite={false} />
          </div>
        </div>

        <div className={styles.tableSection}>
          <div className={styles.tableHeader}>
            <div className={styles.tableTitle}>
              <h2>Recent Student Applications</h2>
              <p>Latest submissions awaiting verification</p>
            </div>
            
            <button 
              className={styles.viewAllBtn}
              onClick={() => navigate('/qcpeso/monitor/referrals')}
            >
              View All <ChevronRight size={16} />
            </button>
          </div>

          <div className={styles.tableCard}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>School</th>
                  <th>Program</th>
                  <th>Date Submitted</th>
                  <th>Verification Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {students.slice(0, 3).map((student) => (
                  <tr key={student.id}>
                    <td><strong style={{ color: '#160e6f' }}>{student.name}</strong></td>
                    <td>{student.school}</td>
                    <td>{student.program}</td>
                    <td>{student.date}</td>
                    <td>
                      <span className={`${styles.statusPill} ${student.status === 'Verified' ? styles.completed : ''} ${student.status === 'Rejected' ? styles.rejected : ''}`}>
                        {student.status}
                      </span>
                    </td>
                    <td>
                      <button 
                        className={styles.actionBtn}
                        onClick={() => setSelectedStudent(student)}
                      >
                        <Eye size={14} />
                        <span>Review</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className={styles.tableSection}>
          <div className={styles.tableHeader}>
            <div className={styles.tableTitle}>
              <h2>Recent Employer Activities</h2>
              <p>Latest active employers and opportunities</p>
            </div>

            <button 
              className={styles.viewAllBtn}
              onClick={() => navigate('/qcpeso/monitor/referrals')}
            >
              View All <ChevronRight size={16} />
            </button>
          </div>

          <div className={styles.tableCard}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Company Name</th>
                  <th>Representative Name</th>
                  <th>Active Opportunities</th>
                  <th>Account Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {employers.slice(0, 3).map((employer) => (
                  <tr key={employer.id}>
                    <td><strong style={{ color: '#160e6f' }}>{employer.name}</strong></td>
                    <td>{employer.rep}</td>
                    <td><span className={styles.hoursText}>{employer.opportunities}</span></td>
                    <td>
                      <span className={`${styles.statusPill} ${employer.status === 'Active' ? styles.completed : ''} ${employer.status === 'Inactive' ? styles.paused : ''}`}>
                        {employer.status}
                      </span>
                    </td>
                    <td>
                      <button 
                        className={styles.actionBtn}
                        onClick={() => setSelectedEmployer(employer)}
                      >
                        <Eye size={14} />
                        <span>Review</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  )
}