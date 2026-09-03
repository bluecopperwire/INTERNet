import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import type { StudentInternshipDto } from '../../../types/api'
import { useAuthStore } from '../../../stores/useAuthStore'
import { getErrorMessage } from '../../../utils/error-message'
import { StudentInternshipDetails } from '../components/StudentInternshipDetails'
import { studentApiService } from '../services/student-api.service'
import styles from './StudentInternshipPages.module.css'

function InternshipHistoryDetailsPage() {
  const { assignmentId } = useParams()
  const navigate = useNavigate()
  const studentId = useAuthStore((state) => state.user?.studentId)
  const numericAssignmentId = Number(assignmentId)
  const hasValidRequest = Boolean(studentId && Number.isInteger(numericAssignmentId) && numericAssignmentId > 0)
  const [assignment, setAssignment] = useState<StudentInternshipDto | null>(null)
  const [isLoading, setIsLoading] = useState(hasValidRequest)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!studentId || !hasValidRequest) return
    let active = true
    const timeoutId = window.setTimeout(() => {
      setIsLoading(true)
      studentApiService
        .getInternshipHistoryDetail(studentId, numericAssignmentId)
        .then((result) => {
          if (active) setAssignment(result)
        })
        .catch((requestError: unknown) => {
          if (active) setError(getErrorMessage(requestError, 'Unable to load internship details.'))
        })
        .finally(() => {
          if (active) setIsLoading(false)
        })
    }, 0)
    return () => {
      active = false
      window.clearTimeout(timeoutId)
    }
  }, [hasValidRequest, numericAssignmentId, studentId])

  if (!hasValidRequest)
    return (
      <p className={styles.feedback} role="alert">
        Internship assignment is unavailable.
      </p>
    )
  if (isLoading) return <p className={styles.feedback}>Loading internship details...</p>
  if (error || !assignment)
    return (
      <p className={styles.feedback} role="alert">
        {error ?? 'Internship assignment is unavailable.'}
      </p>
    )

  return (
    <div>
      <button className={styles.backButton} type="button" onClick={() => navigate('/intern-seeker/internship-history')}>
        <ArrowLeft size={18} />
        Back to Internship History
      </button>
      <StudentInternshipDetails assignment={assignment} />
      <button className={styles.attendanceButton} type="button" onClick={() => navigate(`/intern-seeker/attendance-history/${assignment.internshipAssignmentId}`)}>
        View Attendance History
      </button>
    </div>
  )
}

export default InternshipHistoryDetailsPage
