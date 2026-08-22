import { useEffect, useState } from 'react'
import { ArrowLeft, Building2, Edit3, GraduationCap, Mail, MapPin, Phone, UserRound, X } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { adminService } from '../services/admin.service'
import type { StudentRecord } from '../types/admin.types'
import styles from './AdminStudentDetailsPage.module.css'

export function AdminStudentDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [student, setStudent] = useState<StudentRecord | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showSuspendDialog, setShowSuspendDialog] = useState(false)
  const [suspensionDays, setSuspensionDays] = useState('')

  useEffect(() => {
    if (!id) return
    adminService.getStudentRecord(id).then((record) => {
      setStudent(record)
    }).finally(() => setIsLoading(false))
  }, [id])

  const setStatus = async (status: StudentRecord['status']) => {
    if (!id) return
    const updated = await adminService.updateStudentRecord(id, { status })
    if (updated) {
      setStudent(updated)
    }
  }

  const suspend = async () => {
    if (!suspensionDays || Number(suspensionDays) < 1) return
    await setStatus('Suspended')
    setShowSuspendDialog(false)
    setSuspensionDays('')
  }

  if (isLoading) return <main className={styles.feedback}>Loading student profile...</main>
  if (!student) return <main className={styles.feedback}>Student record not found.</main>

  return (
    <main className={styles.page}>
      <div className={styles.wrap}>
        <button className={styles.backButton} type="button" onClick={() => navigate('/admin/manage-students')}><ArrowLeft size={19} />Back to Manage Students</button>
        <section className={styles.profileCard}>
          <header className={styles.profileHeader}><h1>Student Profile</h1><p>View and manage the student’s personal, academic, and internship preference details.</p></header>
          <div className={styles.body}>
            <section className={styles.summary}>
              <span className={styles.avatar}><UserRound size={30} /></span>
              <div className={styles.summaryInfo}><h2>{student.fullName}</h2><div><span><Mail size={16} />{student.email}</span><span><Phone size={16} />{student.contactNumber}</span></div><span><MapPin size={16} />{student.fullAddress}</span></div>
              <StatusPill status={student.status} />
            </section>

            <InfoCard icon={<UserRound size={21} />} title="Personal Information">
              <Row label="Full Name" value={student.fullName} />
              <Row label="Address" value={student.fullAddress} />
              <Row label="Birthdate" value={student.birthdate} />
              <Row label="Sex" value={student.sex} />
            </InfoCard>
            <InfoCard icon={<Mail size={21} />} title="Contact Information">
              <Row label="Email" value={student.email} />
              <Row label="Mobile Number" value={student.contactNumber} />
              <Row label="Inquiry Method" value={student.inquiryVia} />
            </InfoCard>
            <InfoCard icon={<GraduationCap size={21} />} title="Current Academic Information">
              <Row label="School" value={student.schoolName} />
              <Row label="Year Level" value={student.yearLevel} />
              <Row label="Program / Strand" value={student.programStrand} />
            </InfoCard>
            <InfoCard icon={<Building2 size={21} />} title="Internship Preferences">
              <Row label="Internship Required Hours" value={student.requiredHours} />
              <Row label="Preferred Host Organization Type" value={student.hostOrgType} />
              <Row label="Internship Days Availability" value={student.scheduleAvailability.join(', ')} />
              <Row label="Internship Start Date Availability" value={student.startDate} />
              <Row label="Preferred Field of Internship" value={student.preferredIndustries.join(', ')} />
              <Row label="Willing to Be Assigned Outside Preferred Field" value={student.flexibleAssignment ? 'Yes' : 'No'} />
            </InfoCard>
          </div>
          <footer className={styles.actions}>
            <button type="button" className={styles.editButton} onClick={() => navigate(`/admin/manage-students/${student.id}/edit`)}><Edit3 size={17} />Edit Profile</button>
            <button type="button" className={styles.suspendButton} onClick={() => setShowSuspendDialog(true)} disabled={student.status === 'Deactivated'}>Suspend</button>
            <button type="button" className={styles.deactivateButton} onClick={() => setStatus('Deactivated')} disabled={student.status === 'Deactivated'}>Deactivate</button>
          </footer>
        </section>
      </div>

      {showSuspendDialog && <div className={styles.dialogOverlay} onClick={() => setShowSuspendDialog(false)}><section className={styles.dialog} onClick={(event) => event.stopPropagation()}><header className={styles.dialogHeader}><div><h2>Suspend Student Account</h2><p>Set the suspension duration for {student.fullName}.</p></div><button type="button" className={styles.closeButton} aria-label="Close" onClick={() => setShowSuspendDialog(false)}><X size={19} /></button></header><div className={styles.dialogBody}><label>Suspension Duration (Days)<input autoFocus min="1" type="number" inputMode="numeric" value={suspensionDays} onChange={(event) => setSuspensionDays(event.target.value.replace(/\D/g, ''))} placeholder="Enter number of days" /></label><p className={styles.dialogHint}>The account will be marked as suspended for the selected duration.</p></div><footer className={styles.dialogActions}><button type="button" className={styles.cancelButton} onClick={() => setShowSuspendDialog(false)}>Cancel</button><button type="button" className={styles.confirmSuspend} onClick={suspend} disabled={!suspensionDays}>Suspend Account</button></footer></section></div>}
    </main>
  )
}

function InfoCard({ children, icon, title }: { children: React.ReactNode; icon: React.ReactNode; title: string }) { return <section className={styles.infoCard}><header><span>{icon}</span><h2>{title}</h2></header><div>{children}</div></section> }
function Row({ label, value }: { label: string; value: string }) { return <article className={styles.infoRow}><span>{label}</span><strong>{value || 'Not provided'}</strong></article> }
function StatusPill({ status }: { status: StudentRecord['status'] }) { const className = status === 'Active' ? styles.active : status === 'Suspended' ? styles.suspended : styles.deactivated; return <span className={`${styles.statusPill} ${className}`}>{status}</span> }
