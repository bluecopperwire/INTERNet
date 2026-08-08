import { type FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import googleLogo from '../../../assets/google-logo.svg'
import leftPanelArtwork from '../../../assets/login_left-panel.svg'
import type { LoginCredentials, UserRole } from '../types/auth.types'
import styles from './LoginPage.module.css'

const ROLES: ReadonlyArray<{ label: string; value: UserRole }> = [
  { label: 'Intern Seeker', value: 'intern-seeker' },
  { label: 'Company', value: 'company' },
  { label: 'QCPESO', value: 'qcpeso' },
]

const INITIAL_CREDENTIALS: LoginCredentials = {
  email: '',
  password: '',
  rememberMe: true,
  role: 'intern-seeker',
}

function LoginPage() {
  const [credentials, setCredentials] = useState<LoginCredentials>(INITIAL_CREDENTIALS)
  const [error, setError] = useState('')

  const selectRole = (role: UserRole) => {
    setCredentials((current) => ({ ...current, role }))
    setError('')
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!credentials.email.trim() || !credentials.password) {
      setError('Please enter your email address and password.')
      return
    }

    setError('')
  }

  return (
    <main className={styles.page}>
      <aside className={styles.artPanel} aria-hidden="true">
        <img src={leftPanelArtwork} alt="" />
      </aside>

      <section className={styles.loginPanel} aria-labelledby="login-heading">
        <div className={styles.loginContent}>
          <div className={styles.roleTabs} aria-label="Select account type" role="group">
            {ROLES.map((role) => (
              <button
                className={credentials.role === role.value ? styles.activeRole : styles.roleButton}
                key={role.value}
                onClick={() => selectRole(role.value)}
                type="button"
                aria-pressed={credentials.role === role.value}
              >
                {role.label}
              </button>
            ))}
          </div>

          <h1 id="login-heading">Welcome Back!</h1>

          {credentials.role === 'intern-seeker' && (
            <>
              <button className={styles.googleButton} type="button">
                <img src={googleLogo} alt="" />
                <span>Login with Google</span>
              </button>

              <div className={styles.divider}>
                <span>Or login with email</span>
              </div>
            </>
          )}

          {credentials.role !== 'company' && (
            <p className={styles.signupPrompt}>
              Don&apos;t have an account?{' '}
              <Link to={`/sign-up/${credentials.role}`}>Sign Up</Link>
            </p>
          )}

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="Enter email address"
              value={credentials.email}
              onChange={(event) =>
                setCredentials((current) => ({ ...current, email: event.target.value }))
              }
              aria-describedby={error ? 'login-error' : undefined}
            />

            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter password"
              value={credentials.password}
              onChange={(event) =>
                setCredentials((current) => ({ ...current, password: event.target.value }))
              }
              aria-describedby={error ? 'login-error' : undefined}
            />

            <div className={styles.formOptions}>
              <label className={styles.rememberMe}>
                <input
                  type="checkbox"
                  checked={credentials.rememberMe}
                  onChange={(event) =>
                    setCredentials((current) => ({
                      ...current,
                      rememberMe: event.target.checked,
                    }))
                  }
                />
                <span>Remember me</span>
              </label>

              <button className={styles.textButton} type="button">
                Forgot Password?
              </button>
            </div>

            {error && (
              <p className={styles.error} id="login-error" role="alert">
                {error}
              </p>
            )}

            <button className={styles.loginButton} type="submit">
              Login
            </button>
          </form>

          <p className={styles.legalNotice}>
            By continuing, you agree to QC PESO&apos;s{' '}
            <Link to="/terms-of-service">Terms of Service</Link> &amp;{' '}
            <Link to="/privacy-policy">Privacy Policy</Link>. This platform is a free public service
            of the Quezon City Government.
          </p>
        </div>
      </section>
    </main>
  )
}

export default LoginPage
