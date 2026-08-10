import { useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, MapPin } from 'lucide-react'
import TrackingHeader from '../components/TrackingHeader'
import TrackingTabs from '../components/TrackingTabs'
import { useAttendance } from '../hooks/useAttendance'
import type { AttendanceDayStatus, AttendanceMonth, Holiday } from '../types/attendance.types'
import styles from './AttendancePage.module.css'

const INITIAL_MONTH = new Date(2026, 7, 1)
const WEEKDAYS = ['S', 'M', 'T', 'W', 'TH', 'F', 'ST']

function AttendancePage() {
  const [visibleMonth, setVisibleMonth] = useState(INITIAL_MONTH)
  const { today, monthData, holidays, isLoading, isCheckingIn, error, checkIn } = useAttendance(
    visibleMonth.getFullYear(),
    visibleMonth.getMonth(),
  )

  const changeMonth = (amount: number) => {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1))
  }

  return (
    <main className={styles.page}>
      <TrackingHeader />
      <section className={styles.trackingContent}>
        <TrackingTabs />

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
                    <div><h3>Check-in Time</h3><p>Working hours: {today.scheduleStart} - {today.scheduleEnd}</p></div>
                  </div>
                  <div className={styles.detailRow}>
                    <MapPin aria-hidden="true" />
                    <div><h3>Location</h3><p>{today.location}</p></div>
                  </div>
                </div>
              </section>

              <button className={styles.checkInButton} type="button" disabled={today.status !== 'not-checked-in' || isCheckingIn} onClick={() => void checkIn()}>
                {isCheckingIn ? 'Checking in...' : today.status === 'not-checked-in' ? 'Check in now' : `Checked in at ${today.checkedInAt}`}
              </button>

              <MonthlySummary monthData={monthData} />
            </div>

            <aside className={styles.secondaryColumn}>
              <AttendanceCalendar monthData={monthData} onPrevious={() => changeMonth(-1)} onNext={() => changeMonth(1)} />
              <UpcomingHolidays holidays={holidays} fromDate={today.date} />
            </aside>
          </div>
        )}
      </section>
    </main>
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

function UpcomingHolidays({ holidays, fromDate }: { holidays: Holiday[]; fromDate: string }) {
  return (
    <section className={styles.holidaysPanel} aria-labelledby="holidays-heading">
      <h2 id="holidays-heading">Upcoming Holidays</h2>
      <div className={styles.holidayList}>
        {holidays.length === 0 && <p>No upcoming holidays.</p>}
        {holidays.map((holiday) => (
          <article className={styles.holidayItem} key={holiday.id}>
            <CalendarDays aria-hidden="true" />
            <div><strong>{holiday.name}</strong><span>{formatHolidayDate(holiday.date)}</span></div>
            <small>{daysBetween(fromDate, holiday.date)} days left</small>
          </article>
        ))}
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
const formatHolidayDate = (date: string) => new Intl.DateTimeFormat('en-PH', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`))
const daysBetween = (from: string, to: string) => Math.max(0, Math.ceil((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000))

export default AttendancePage
