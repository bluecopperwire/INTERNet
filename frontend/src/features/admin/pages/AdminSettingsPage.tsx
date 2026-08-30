import { useState, type FormEvent } from 'react'
import { LockKeyhole, ShieldCheck } from 'lucide-react'
import headerImage from '../../../assets/requirements-header-image.png'
import adminStyles from './AuditLogsPage.module.css'
import styles from '../../employer/pages/EmployerSettingsPage.module.css'

export function AdminSettingsPage() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const updatePassword = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (newPassword.length < 8) return setMessage('Password must contain at least 8 characters.')
    if (newPassword !== confirmPassword) return setMessage('The passwords do not match.')
    setNewPassword(''); setConfirmPassword(''); setMessage('Password updated successfully.')
  }

  return <main className={styles.pageContainer}>
    <header className={adminStyles.hero}><img src={headerImage} alt="" className={adminStyles.heroImage} /><div className={adminStyles.heroOverlay} /><div className={adminStyles.heroContent}><h1>Settings</h1><p>Manage administrator preferences and security settings.</p></div></header>
    <div className={styles.settingsContent}>
      <section className={styles.settingsSection}>
        <header className={styles.sectionHeader}><div className={styles.sectionIcon}><LockKeyhole size={21} /></div><div><h2>Account Security</h2><p>Use a strong password to keep this administrator account secure.</p></div></header>
        <form className={styles.passwordForm} onSubmit={updatePassword}><div className={styles.passwordFields}><label><span>New Password</span><input type="password" value={newPassword} placeholder="Enter new password" autoComplete="new-password" onChange={(event) => { setNewPassword(event.target.value); setMessage('') }} required /></label><label><span>Confirm Password</span><input type="password" value={confirmPassword} placeholder="Confirm new password" autoComplete="new-password" onChange={(event) => { setConfirmPassword(event.target.value); setMessage('') }} required /></label></div><div className={styles.passwordHint}><ShieldCheck size={17} /><span>Use at least 8 characters and avoid reusing an old password.</span></div><footer className={styles.sectionFooter}><button className={styles.passwordButton} type="submit"><LockKeyhole size={17} /><span>Update Password</span></button></footer></form>
      </section>
      <p className={styles.feedback} role="status" aria-live="polite">{message}</p>
    </div>
  </main>
}

export default AdminSettingsPage
