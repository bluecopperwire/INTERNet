import { useState, type FormEvent } from 'react'
import { LockKeyhole, ShieldCheck } from 'lucide-react'
import { EmployerHero } from '../../employer/components/EmployerHero'
import styles from '../../employer/pages/EmployerSettingsPage.module.css'
import { authService } from '../../../services/auth.service'
import { useToastStore } from '../../../stores/useToastStore'
import { getErrorMessage } from '../../../utils/error-message'
import { getPasswordError, PASSWORD_REQUIREMENTS } from '../../../utils/input-validation'

export function AdminSettingsPage() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const toast = useToastStore()

  const updatePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!currentPassword) return setMessage('Please enter your current password.')
    const passwordError = getPasswordError(newPassword, 'New password')
    if (passwordError) return setMessage(passwordError)
    if (newPassword !== confirmPassword) return setMessage('The passwords do not match.')

    setIsSubmitting(true)
    try {
      await authService.changePassword({ currentPassword, password: newPassword })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setMessage('Password updated successfully.')
      toast.success('Password updated successfully.')
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(
        error,
        'Failed to update password. Please check your current password and try again.',
      )
      setMessage(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className={styles.pageContainer}>
      <EmployerHero
        title="Settings"
        subtitle="Manage your account preferences and security settings."
        comfortableSpacing
      />

      <div className={styles.settingsContent}>
        <section className={styles.settingsSection}>
          <header className={styles.sectionHeader}>
            <div className={styles.sectionIcon}>
              <LockKeyhole size={21} aria-hidden="true" />
            </div>
            <div>
              <h2>Account Security</h2>
              <p>Use a strong password to keep your administrator account secure.</p>
            </div>
          </header>

          <form className={styles.passwordForm} onSubmit={updatePassword}>
            <div className={styles.passwordFields}>
              <label className={styles.fullWidth}>
                <span>Current Password</span>
                <input
                  type="password"
                  value={currentPassword}
                  placeholder="Enter current password"
                  autoComplete="current-password"
                  onChange={(event) => {
                    setCurrentPassword(event.target.value)
                    setMessage('')
                  }}
                  required
                />
              </label>
              <label>
                <span>New Password</span>
                <input
                  type="password"
                  value={newPassword}
                  placeholder="Enter new password"
                  autoComplete="new-password"
                  onChange={(event) => {
                    setNewPassword(event.target.value)
                    setMessage('')
                  }}
                  required
                />
              </label>
              <label>
                <span>Confirm Password</span>
                <input
                  type="password"
                  value={confirmPassword}
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                  onChange={(event) => {
                    setConfirmPassword(event.target.value)
                    setMessage('')
                  }}
                  required
                />
              </label>
            </div>

            <div className={styles.passwordHint}>
              <ShieldCheck size={17} aria-hidden="true" />
              <span>{PASSWORD_REQUIREMENTS}</span>
            </div>

            <footer className={styles.sectionFooter}>
              <button
                className={styles.passwordButton}
                type="submit"
                disabled={isSubmitting}
              >
                <LockKeyhole size={17} aria-hidden="true" />
                <span>{isSubmitting ? 'Updating...' : 'Update Password'}</span>
              </button>
            </footer>
          </form>
        </section>

        <p className={styles.feedback} role="status" aria-live="polite">
          {message}
        </p>
      </div>
    </main>
  )
}

export default AdminSettingsPage
