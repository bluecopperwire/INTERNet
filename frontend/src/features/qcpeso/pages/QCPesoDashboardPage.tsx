import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, ChevronRight } from 'lucide-react'
import QCPesoHero from '../components/QCPesoHero'
import twoDocumentIcon from '../../../assets/two-docu.svg'
import suitcaseIcon from '../../../assets/suitcase.svg'
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

      <QCPesoHero title="Main Dashboard" subtitle="QCPESO Information Summary" />

      <section className={styles.mainContent}>
        <div className={styles.summaryGrid}>
          <div className={`${styles.summaryCard} ${styles.cardBlue}`}>
            <h3 className={styles.cardTitle}>Total Pending Student Applications</h3>
            <p className={styles.cardValue}>{summary.pendingApplications}</p>
            <img className={styles.summaryIcon} src={twoDocumentIcon} alt="" />
          </div>

          <div className={`${styles.summaryCard} ${styles.cardGradient}`}>
            <h3 className={styles.cardTitleDark}>Total Verified Requirements</h3>
            <p className={styles.cardValueDark}>{summary.verifiedRequirements}</p>
            <img className={styles.summaryIcon} src={twoDocumentIcon} alt="" />
          </div>

          <div className={`${styles.summaryCard} ${styles.cardGradient}`}>
            <h3 className={styles.cardTitleDark}>Total Active Employers</h3>
            <p className={styles.cardValueDark}>{summary.activeEmployers}</p>
            <img className={`${styles.summaryIcon} ${styles.suitcaseIcon}`} src={suitcaseIcon} alt="" />
          </div>

          <div className={`${styles.summaryCard} ${styles.cardBlue}`}>
            <h3 className={styles.cardTitle}>Total Available Opportunities</h3>
            <p className={styles.cardValue}>{summary.availableOpportunities}</p>
            <img className={`${styles.summaryIcon} ${styles.suitcaseIcon}`} src={suitcaseIcon} alt="" />
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
