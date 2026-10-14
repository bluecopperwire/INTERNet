import { useCallback, useEffect, useState } from 'react'
import { CircleAlert } from 'lucide-react'
import type { StudentInternshipDto } from '../../../types/api'
import { useAuthStore } from '../../../stores/useAuthStore'
import { useToastStore } from '../../../stores/useToastStore'
import { getErrorMessage } from '../../../utils/error-message'
import { studentApiService } from '../services/student-api.service'
import { EmptyInternshipState, StudentInternshipDetails } from '../components/StudentInternshipDetails'
import styles from './StudentInternshipPages.module.css'

const COMPLETION_NOTICE_BY_STATUS: Partial<Record<StudentInternshipDto['assignmentStatus'], string>> = {
  complete_company: 'Internship marked as complete. Review the training establishment (company) to proceed with internship finalization.',
  complete_student: 'Training establishment already reviewed. Please wait for QC PESO to finalize your internship.',
}

function InternshipPage() {
  const studentId = useAuthStore((state) => state.user?.studentId)
  const toast = useToastStore()
  const [assignment, setAssignment] = useState<StudentInternshipDto | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadCurrentInternship = useCallback(async () => {
    if (!studentId) {
      setError('Student profile is unavailable.')
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      setAssignment(await studentApiService.getCurrentInternship(studentId))
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError, 'Unable to load your current internship.'))
      setAssignment(null)
    } finally {
      setIsLoading(false)
    }
  }, [studentId])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadCurrentInternship(), 0)
    return () => window.clearTimeout(timeoutId)
  }, [loadCurrentInternship])

  const withdraw = async (remark: string) => {
    if (!studentId || !assignment) return
    try {
      await studentApiService.withdrawAssignment(studentId, assignment.internshipAssignmentId, remark)
      await loadCurrentInternship()
      toast.success('Internship withdrawn successfully.')
    } catch (requestError: unknown) {
      toast.error(getErrorMessage(requestError, 'Unable to withdraw the internship.'))
      throw requestError
    }
  }

  const review = async (rating: number, remark: string) => {
    if (!studentId || !assignment) return
    try {
      await studentApiService.submitCompanyReview(studentId, assignment.internshipAssignmentId, rating, remark)
      await loadCurrentInternship()
      toast.success('Company review submitted successfully.')
    } catch (requestError: unknown) {
      toast.error(getErrorMessage(requestError, 'Unable to submit the Company review.'))
      throw requestError
    }
  }

  if (isLoading) return <p className={styles.feedback}>Loading internship...</p>
  if (error)
    return (
      <p className={styles.feedback} role="alert">
        {error}
      </p>
    )
  if (!assignment) return <EmptyInternshipState />

  const completionNotice = COMPLETION_NOTICE_BY_STATUS[assignment.assignmentStatus]

  return (
    <>
      {completionNotice && (
        <section className={styles.completionNotice} aria-labelledby="internship-completion-notice-title">
          <header className={styles.completionNoticeHeader}>
            <span className={styles.completionNoticeIcon} aria-hidden="true"><CircleAlert size={19} /></span>
            <h2 id="internship-completion-notice-title">Notice</h2>
          </header>
          <p>{completionNotice}</p>
        </section>
      )}
      <StudentInternshipDetails assignment={assignment} interactive onWithdraw={withdraw} onReview={review} />
    </>
  )
}

export default InternshipPage
