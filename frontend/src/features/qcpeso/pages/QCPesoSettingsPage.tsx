import { useState, type FormEvent } from 'react'
import { BellRing, LockKeyhole, Save, ShieldCheck } from 'lucide-react'
import QCPesoHero from '../components/QCPesoHero'
import styles from './QCPesoSettingsPage.module.css'

interface NotificationPreferences {
  management: boolean
  monitor: boolean
  dashboard: boolean
}

const initialPreferences: NotificationPreferences = { management: true, monitor: false, dashboard: false }

export function QCPesoSettingsPage() {
  const [preferences, setPreferences] = useState(initialPreferences)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')

  const togglePreference = (key: keyof NotificationPreferences) => {
    setPreferences((current) => ({ ...current, [key]: !current[key] }))
    setMessage('')
  }

  const updatePassword = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (newPassword.length < 8) return setMessage('Password must contain at least 8 characters.')
    if (newPassword !== confirmPassword) return setMessage('The passwords do not match.')
    setNewPassword('')
    setConfirmPassword('')
    setMessage('Password updated successfully.')
  }

  const notificationOptions = [
    { key: 'management' as const, title: 'Management Notifications', description: 'Updates from application and employer management activities.' },
    { key: 'monitor' as const, title: 'Monitor Notifications', description: 'Updates for referrals, active interns, and attendance monitoring.' },
    { key: 'dashboard' as const, title: 'Dashboard Notifications', description: 'Summary alerts and important dashboard recommendations.' },
  ]

  return (
    <main className={styles.pageContainer}>
      <QCPesoHero title="Settings" subtitle="Manage your account preferences and security settings." comfortableSpacing />

      <div className={styles.settingsContent}>
        <section className={styles.settingsSection}>
          <header className={styles.sectionHeader}>
            <div className={styles.sectionIcon}><BellRing size={21} aria-hidden="true" /></div>
            <div><h2>Notification Preferences</h2><p>Choose which QC PESO activity updates you want to receive.</p></div>
          </header>

          <div className={styles.notificationLayout}>
            <div className={styles.settingIntro}>
              <h3>System notifications</h3>
              <p>Changes apply to your QC PESO account and can be updated anytime.</p>
            </div>
            <div className={styles.notificationControls}>
              {notificationOptions.map((option) => (
                <label className={styles.notificationOption} key={option.key}>
                  <input type="checkbox" checked={preferences[option.key]} onChange={() => togglePreference(option.key)} />
                  <span className={styles.optionText}><strong>{option.title}</strong><span>{option.description}</span></span>
                  <span className={styles.toggle} aria-hidden="true"><span /></span>
                </label>
              ))}
            </div>
          </div>
          <footer className={styles.sectionFooter}>
            <button className={styles.primaryButton} type="button" onClick={() => setMessage('Notification preferences saved.')}>
              <Save size={17} aria-hidden="true" /><span>Save Preferences</span>
            </button>
          </footer>
        </section>

        <section className={styles.settingsSection}>
          <header className={styles.sectionHeader}>
            <div className={styles.sectionIcon}><LockKeyhole size={21} aria-hidden="true" /></div>
            <div><h2>Account Security</h2><p>Use a strong password to keep your QC PESO account secure.</p></div>
          </header>
          <form className={styles.passwordForm} onSubmit={updatePassword}>
            <div className={styles.passwordFields}>
              <label><span>New Password</span><input type="password" value={newPassword} placeholder="Enter new password" autoComplete="new-password" onChange={(event) => { setNewPassword(event.target.value); setMessage('') }} required /></label>
              <label><span>Confirm Password</span><input type="password" value={confirmPassword} placeholder="Confirm new password" autoComplete="new-password" onChange={(event) => { setConfirmPassword(event.target.value); setMessage('') }} required /></label>
            </div>
            <div className={styles.passwordHint}><ShieldCheck size={17} aria-hidden="true" /><span>Use at least 8 characters and avoid reusing an old password.</span></div>
            <footer className={styles.sectionFooter}>
              <button className={styles.passwordButton} type="submit"><LockKeyhole size={17} aria-hidden="true" /><span>Update Password</span></button>
            </footer>
          </form>
        </section>

        <p className={styles.feedback} role="status" aria-live="polite">{message}</p>
      </div>
    </main>
  )
}

export default QCPesoSettingsPage
