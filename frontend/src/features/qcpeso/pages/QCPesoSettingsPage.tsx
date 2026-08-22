import { useState, type FormEvent } from 'react'
import { LockKeyhole, ShieldCheck } from 'lucide-react'
import QCPesoHero from '../components/QCPesoHero'
import styles from './QCPesoSettingsPage.module.css'

export function QCPesoSettingsPage() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')

  const updatePassword = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (newPassword.length < 8) return setMessage('Password must contain at least 8 characters.')
    if (newPassword !== confirmPassword) return setMessage('The passwords do not match.')
    setNewPassword('')
    setConfirmPassword('')
    setMessage('Password updated successfully.')
  }

  return (
    <main className={styles.pageContainer}>
      <QCPesoHero title="Settings" subtitle="Manage your account preferences and security settings." comfortableSpacing />

      <div className={styles.settingsContent}>
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
