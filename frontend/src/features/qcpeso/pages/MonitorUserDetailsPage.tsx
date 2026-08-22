import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { ArrowLeft, Building2, GraduationCap, Mail, MapPin, Phone, UserRound } from 'lucide-react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { qcpesoService } from '../services/qcpeso.service'
import type { MonitoredCompanyUser, MonitoredStudentUser, MonitorUserStatus } from '../types/qcpeso.types'
import styles from './MonitorUserDetailsPage.module.css'

type MonitoredUser = MonitoredStudentUser | MonitoredCompanyUser

export function MonitorUserDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const [record, setRecord] = useState<MonitoredUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const isStudent = location.pathname.startsWith('/qcpeso/monitor-users/students/')

  useEffect(() => {
    if (!id) {
      setIsLoading(false)
      return
    }

    const request = isStudent ? qcpesoService.getMonitoredStudent(id) : qcpesoService.getMonitoredCompany(id)
    request.then((user) => setRecord(user)).finally(() => setIsLoading(false))
  }, [id, isStudent])

  if (isLoading) return <main className={styles.feedback}>Loading profile...</main>
  if (!record) return <main className={styles.feedback}>User record not found.</main>

  return (
    <main className={styles.page}>
      <div className={styles.wrap}>
        <button className={styles.backButton} type="button" onClick={() => navigate(`/qcpeso/monitor-users/${isStudent ? 'students' : 'employers'}`)}><ArrowLeft size={19} />Back to {isStudent ? 'Monitor Students' : 'Monitor Employers'}</button>
        <section className={styles.profileCard}>
          <header className={styles.profileHeader}><h1>{isStudent ? 'Student Profile' : 'Company Profile'}</h1><p>{isStudent ? 'View the student’s personal, academic, and internship preference details.' : 'View the company’s profile, company information, and contact details.'}</p></header>
          {isStudent ? <StudentProfile student={record as MonitoredStudentUser} /> : <CompanyProfile company={record as MonitoredCompanyUser} />}
        </section>
      </div>
    </main>
  )
}

function StudentProfile({ student }: { student: MonitoredStudentUser }) {
  return <div className={styles.body}>
    <ProfileSummary icon={<UserRound size={30} />} name={student.studentName} email={student.email} phone={student.mobileNumber} address={student.address} status={student.status} />
    <InfoCard icon={<UserRound size={21} />} title="Personal Information" items={[["Full Name", student.studentName], ["Address", student.address], ["Birthdate", student.birthdate], ["Sex", student.sex]]} />
    <InfoCard icon={<Mail size={21} />} title="Contact Information" items={[["Email", student.email], ["Mobile Number", student.mobileNumber], ["LinkedIn", student.linkedIn]]} />
    <InfoCard icon={<GraduationCap size={21} />} title="Current Academic Information" items={[["School", student.school], ["Year Level", student.yearLevel], ["Program / Strand", student.program]]} />
    <InfoCard icon={<Building2 size={21} />} title="Internship Preferences" items={[["Internship Required Hours", student.requiredHours], ["Preferred Host Organization Type", student.preferredHostOrganizationType], ["Internship Days Availability", student.internshipDaysAvailability], ["Internship Start Date Availability", student.internshipStartDateAvailability], ["Preferred Field of Internship", student.preferredField], ["Willing to Be Assigned Outside Preferred Field", student.willingOutsidePreferredField]]} />
  </div>
}

function CompanyProfile({ company }: { company: MonitoredCompanyUser }) {
  return <div className={styles.body}>
    <ProfileSummary icon={<Building2 size={30} />} name={company.companyName} email={company.email} phone={company.contactNumber} address={company.address} status={company.status} />
    <InfoCard icon={<Building2 size={21} />} title="About Company" description={company.description} />
    <InfoCard icon={<Building2 size={21} />} title="Company Information" items={[["Company Name", company.companyName], ["Company Type", company.companyType], ["Industry", company.industry], ["Company Address", company.address], ["Company Size", company.companySize], ["Company Year Established", company.yearEstablished], ["Website URL", company.websiteUrl], ["Date Registered", company.dateRegistered]]} />
    <InfoCard icon={<UserRound size={21} />} title="Contact Information" items={[["Contact Person", company.contactPerson], ["Contact Email", company.email], ["Contact Number", company.contactNumber]]} />
  </div>
}

function ProfileSummary({ icon, name, email, phone, address, status }: { icon: ReactNode; name: string; email: string; phone: string; address: string; status: MonitorUserStatus }) {
  return <section className={styles.summary}><span className={styles.avatar}>{icon}</span><div className={styles.summaryInfo}><h2>{name}</h2><div><span><Mail size={16} />{email}</span><span><Phone size={16} />{phone}</span></div><span><MapPin size={16} />{address}</span></div><StatusPill status={status} /></section>
}

function InfoCard({ icon, title, items = [], description }: { icon: ReactNode; title: string; items?: [string, string][]; description?: string }) {
  return <section className={styles.infoCard}><header><span>{icon}</span><h2>{title}</h2></header>{description ? <p className={styles.description}>{description}</p> : <div>{items.map(([label, value]) => <article className={styles.infoRow} key={label}><span>{label}</span><strong>{value}</strong></article>)}</div>}</section>
}

function StatusPill({ status }: { status: MonitorUserStatus }) {
  return <span className={`${styles.statusPill} ${status === 'Active' ? styles.active : styles.suspended}`}>{status}</span>
}
