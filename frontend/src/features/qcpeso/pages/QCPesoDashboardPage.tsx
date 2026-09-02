import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, ChevronRight } from 'lucide-react'
import QCPesoHero from '../components/QCPesoHero'
import twoDocumentIcon from '../../../assets/two-docu.svg'
import suitcaseIcon from '../../../assets/suitcase.svg'
import styles from './QCPesoDashboardPage.module.css'
import { useQCPeso } from '../hooks/useQCPeso'
import { qcpesoApiService } from '../services/qcpeso-api.service'
import { openApplicantForReview } from '../services/qcpeso-review-flow'
import { useToastStore } from '../../../stores/useToastStore'
import { getErrorMessage } from '../../../utils/error-message'

export const QCPesoDashboardPage: React.FC = () => {
  const { summary, students, isLoading } = useQCPeso()
  const navigate = useNavigate()
  const toast = useToastStore()

  const handleOpenApplicant = async (student: (typeof students)[number]) => {
    await openApplicantForReview(student, {
      markUnderReview: qcpesoApiService.markApplicationUnderReview,
      navigate,
      onMutationError: (error) => toast.error(getErrorMessage(error, 'Failed to start applicant review.')),
    })
  }

  if (isLoading || !summary) return <div className={styles.loading}>Loading Dashboard...</div>

  return (
    <main className={styles.pageContainer}>
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

            <button className={styles.viewAllBtn} onClick={() => navigate('/qcpeso/manage-applicants/review')}>
              View All <ChevronRight size={16} />
            </button>
          </div>

          <div className={styles.tableCard}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Job Title</th>
                  <th>Program / Strand</th>
                  <th>Date Submitted</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id}>
                    <td>
                      <strong style={{ color: '#160e6f' }}>{student.name}</strong>
                    </td>
                    <td>{student.appliedFor}</td>
                    <td>{student.program}</td>
                    <td>{student.date}</td>
                    <td>
                      <button className={styles.actionBtn} onClick={() => void handleOpenApplicant(student)}>
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
