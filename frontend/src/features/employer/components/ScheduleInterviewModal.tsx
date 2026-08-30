import { useState } from 'react'
import { CalendarDays, Clock3, MapPin, Video, X } from 'lucide-react'
import styles from './ScheduleInterviewModal.module.css'

interface ScheduleInterviewModalProps {
  applicantName: string
  isSaving?: boolean
  onClose: () => void
  onSchedule: (details: { date: string; time: string; mode: 'online' | 'in-person'; meetingUrl?: string; location?: string; remarks: string }) => void
}

export function ScheduleInterviewModal({ applicantName, isSaving = false, onClose, onSchedule }: ScheduleInterviewModalProps) {
  const [mode, setMode] = useState<'online' | 'in-person'>('online')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [meetingUrl, setMeetingUrl] = useState('')
  const [location, setLocation] = useState('')
  const [remarks, setRemarks] = useState('')

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSchedule({ date, time, mode, meetingUrl: mode === 'online' ? meetingUrl : undefined, location: mode === 'in-person' ? location : undefined, remarks })
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <form className={styles.modal} onClick={(event) => event.stopPropagation()} onSubmit={handleSubmit}>
        <header className={styles.header}>
          <div><h2>Schedule Interview</h2><p>Set an interview schedule for {applicantName}.</p></div>
          <button className={styles.closeBtn} type="button" aria-label="Close schedule interview" onClick={onClose}><X /></button>
        </header>

        <div className={styles.formBody}>
          <div className={styles.dateTimeGrid}>
            <label className={styles.field}>Date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} required /><CalendarDays aria-hidden="true" /></label>
            <label className={styles.field}>Time<input type="time" value={time} onChange={(event) => setTime(event.target.value)} required /><Clock3 aria-hidden="true" /></label>
          </div>

          <fieldset className={styles.modeField}><legend>Interview Mode</legend><div className={styles.modeChoices}>
            <label><input type="radio" name="interview-mode" value="online" checked={mode === 'online'} onChange={() => setMode('online')} />Online</label>
            <label><input type="radio" name="interview-mode" value="in-person" checked={mode === 'in-person'} onChange={() => setMode('in-person')} />In-person</label>
          </div></fieldset>

          {mode === 'online' ? (
            <label className={styles.field}>Online Meeting URL<div className={styles.inputWithIcon}><input type="url" value={meetingUrl} onChange={(event) => setMeetingUrl(event.target.value)} placeholder="Enter meeting URL..." required /><Video aria-hidden="true" /></div></label>
          ) : (
            <label className={styles.field}>Physical Location<div className={styles.inputWithIcon}><input type="text" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Enter interview location..." required /><MapPin aria-hidden="true" /></div></label>
          )}

          <label className={styles.field}>Remarks<textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} placeholder="Add remarks..." maxLength={500} rows={4} /><span className={styles.count}>{remarks.length}/500</span></label>
        </div>

        <footer className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={isSaving}>Cancel</button>
          <button type="submit" className={styles.scheduleBtn} disabled={isSaving}>{isSaving ? 'Scheduling...' : 'Schedule Interview'}</button>
        </footer>
      </form>
    </div>
  )
}
