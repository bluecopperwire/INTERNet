import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Clock3 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAttendance } from '../hooks/useAttendance'
import type { AttendanceDayStatus, AttendanceMonth } from '../types/attendance.types'
import styles from './AttendancePage.module.css'

const INITIAL_MONTH = new Date(2026, 7, 1)
const WEEKDAYS = ['S', 'M', 'T', 'W', 'TH', 'F', 'ST']

function AttendancePage() {
  const [visibleMonth, setVisibleMonth] = useState(INITIAL_MONTH)
  const navigate = useNavigate()
  const { today, monthData, isLoading, isCheckingIn, error, checkIn } = useAttendance(
    visibleMonth.getFullYear(),
    visibleMonth.getMonth(),
  )

  const changeMonth = (amount: number) => {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1))
  }

  return (
    <>
        {error && <p className={styles.error} role="alert">{error}</p>}
        {isLoading && <p className={styles.feedback}>Loading attendance...</p>}

        {!isLoading && today && monthData && (
          <div className={styles.attendanceLayout}>
            <div className={styles.primaryColumn}>
              <section className={styles.todayPanel} aria-labelledby="today-heading">
                <header className={styles.panelHeader}>
                  <h2 id="today-heading">Today’s Status</h2>
                  <span className={styles.statusBadge}>{formatStatus(today.status)}</span>
                </header>

                <div className={styles.todayDetails}>
                  <div className={styles.detailRow}>
                    <Clock3 aria-hidden="true" />
                    <div><h3>Intern At</h3><p>{today.companyName}</p></div>
                  </div>
                  <div className={styles.detailRow}>
                    <Clock3 aria-hidden="true" />
                    <div><h3>Working Days</h3><p>{today.workingDays} | {today.shiftStart} - {today.shiftEnd}</p></div>
                  </div>
                </div>
                <button className={styles.internshipDetailsButton} type="button" onClick={() => navigate('/intern-seeker/internship-details')}>
                  View Internship Details
                </button>
              </section>

              <button className={styles.checkInButton} type="button" disabled={today.status !== 'not-checked-in' || isCheckingIn} onClick={() => void checkIn()}>
                {isCheckingIn ? 'Checking in...' : today.status === 'not-checked-in' ? 'Check in now' : `Checked in at ${today.checkedInAt}`}
              </button>

              <MonthlySummary monthData={monthData} />
            </div>

            <aside className={styles.secondaryColumn}>
              <AttendanceCalendar monthData={monthData} onPrevious={() => changeMonth(-1)} onNext={() => changeMonth(1)} />
            </aside>
          </div>
        )}
    </>
  )
}

function AttendanceCalendar({ monthData, onPrevious, onNext }: { monthData: AttendanceMonth; onPrevious: () => void; onNext: () => void }) {
  const calendarDays = useMemo(() => buildCalendarDays(monthData), [monthData])
  const monthLabel = new Intl.DateTimeFormat('en-PH', { month: 'long', year: 'numeric' }).format(new Date(monthData.year, monthData.month, 1))

  return (
    <section className={styles.calendarPanel} aria-labelledby="calendar-heading">
      <header className={styles.calendarHeader}>
        <div><h2 id="calendar-heading">Calendar</h2><strong>{monthLabel}</strong></div>
        <div className={styles.monthControls}>
          <button type="button" aria-label="Previous month" onClick={onPrevious}><ChevronLeft /></button>
          <button type="button" aria-label="Next month" onClick={onNext}><ChevronRight /></button>
        </div>
      </header>
      <div className={styles.calendarGrid} role="grid" aria-label={monthLabel}>
        {WEEKDAYS.map((weekday) => <span className={styles.weekday} role="columnheader" key={weekday}>{weekday}</span>)}
        {calendarDays.map((day) => day.day === null
          ? <span aria-hidden="true" key={day.key} />
          : <span className={`${styles.calendarDay} ${day.status ? styles[day.status] : ''}`} role="gridcell" aria-label={`${monthLabel} ${day.day}${day.status ? `, ${day.status}` : ''}`} key={day.key}>{day.day}</span>)}
      </div>
      <div className={styles.legend} aria-label="Calendar legend">
        <span><i className={styles.presentDot} />Present</span>
        <span><i className={styles.lateDot} />Late</span>
        <span><i className={styles.absentDot} />Absent</span>
      </div>
    </section>
  )
}

function MonthlySummary({ monthData }: { monthData: AttendanceMonth }) {
  const summaryItems = [
    { label: 'Days Present', value: String(monthData.summary.daysPresent).padStart(2, '0'), className: styles.presentCard },
    { label: 'Absences', value: String(monthData.summary.absences).padStart(2, '0'), className: styles.absentCard },
    { label: 'Late Arrivals', value: String(monthData.summary.lateArrivals).padStart(2, '0'), className: styles.lateCard },
    { label: 'Attendance Rate', value: `${monthData.summary.attendanceRate}%`, className: styles.rateCard },
  ]

  return (
    <section className={styles.summaryPanel} aria-labelledby="summary-heading">
      <h2 id="summary-heading">Monthly Summary</h2>
      <div className={styles.summaryGrid}>
        {summaryItems.map((item) => <article className={`${styles.summaryCard} ${item.className}`} key={item.label}><strong>{item.label}</strong><span>{item.value}</span></article>)}
      </div>
    </section>
  )
}

function buildCalendarDays(monthData: AttendanceMonth) {
  const firstWeekday = new Date(monthData.year, monthData.month, 1).getDay()
  const numberOfDays = new Date(monthData.year, monthData.month + 1, 0).getDate()
  const statusByDay = new Map<number, AttendanceDayStatus>()
  monthData.records.forEach((record) => statusByDay.set(Number(record.date.slice(-2)), record.status))

  return [
    ...Array.from({ length: firstWeekday }, (_, index) => ({ key: `empty-${index}`, day: null, status: undefined })),
    ...Array.from({ length: numberOfDays }, (_, index) => ({ key: `day-${index + 1}`, day: index + 1, status: statusByDay.get(index + 1) })),
  ]
}

const formatStatus = (status: string) => status.split('-').map((part) => part[0].toUpperCase() + part.slice(1)).join(' ')
export default AttendancePage
