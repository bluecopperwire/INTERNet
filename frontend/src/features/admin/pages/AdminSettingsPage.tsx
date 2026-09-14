import { useState, type FormEvent } from 'react'
import { LockKeyhole, ShieldCheck } from 'lucide-react'
import { PageHero } from '../../../components/PageHero'
import styles from '../../employer/pages/EmployerSettingsPage.module.css'
import { useToastStore } from '../../../stores/useToastStore'
import { getPasswordError, PASSWORD_REQUIREMENTS } from '../../../utils/input-validation'

export function AdminSettingsPage() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const toast = useToastStore()
  const updatePassword = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const passwordError = getPasswordError(newPassword, 'New password')
    if (passwordError) return setMessage(passwordError)
    if (newPassword !== confirmPassword) return setMessage('The passwords do not match.')
    setNewPassword(''); setConfirmPassword(''); setMessage(''); toast.success('Password updated successfully.')
  }

  return <main className={styles.pageContainer}>
    <PageHero title="Settings" subtitle="Manage administrator preferences and security settings." />
    <div className={styles.settingsContent}>
      <section className={styles.settingsSection}>
        <header className={styles.sectionHeader}><div className={styles.sectionIcon}><LockKeyhole size={21} /></div><div><h2>Account Security</h2><p>Use a strong password to keep this administrator account secure.</p></div></header>
        <form className={styles.passwordForm} onSubmit={updatePassword}><div className={styles.passwordFields}><label><span>New Password</span><input type="password" value={newPassword} placeholder="Enter new password" autoComplete="new-password" onChange={(event) => { setNewPassword(event.target.value); setMessage('') }} required /></label><label><span>Confirm Password</span><input type="password" value={confirmPassword} placeholder="Confirm new password" autoComplete="new-password" onChange={(event) => { setConfirmPassword(event.target.value); setMessage('') }} required /></label></div><div className={styles.passwordHint}><ShieldCheck size={17} /><span>{PASSWORD_REQUIREMENTS}</span></div><footer className={styles.sectionFooter}><button className={styles.passwordButton} type="submit"><LockKeyhole size={17} /><span>Update Password</span></button></footer></form>
      </section>
      <p className={styles.feedback} role="status" aria-live="polite">{message}</p>
    </div>
  </main>
}

export default AdminSettingsPage
