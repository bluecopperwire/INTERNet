import { type FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import googleLogo from '../../../assets/google-logo.svg'
import leftPanelArtwork from '../../../assets/login_left-panel.svg'
import { authService } from '../../../services/auth.service'
import { normalizeApiError } from '../../../services/api'
import { useAuthStore } from '../../../stores/useAuthStore'
import type { LoginTabRole } from '../types/auth.types'
import styles from './LoginPage.module.css'

const ROLES: ReadonlyArray<{ label: string; value: LoginTabRole }> = [
  { label: 'Intern Seeker', value: 'intern-seeker' },
  { label: 'Company', value: 'company' },
  { label: 'QCPESO', value: 'qcpeso' },
  { label: 'Admin', value: 'admin' },
]

function LoginPage() {
  const [role, setRole] = useState<LoginTabRole>('intern-seeker')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { login, user, status } = useAuthStore()

  useEffect(() => {
    if (status === 'authenticated' && user) {
      const returnTo = searchParams.get('returnTo')
      if (returnTo) {
        navigate(decodeURIComponent(returnTo), { replace: true })
        return
      }

      switch (user.userRole) {
        case 'student':
          navigate('/intern-seeker', { replace: true })
          break
        case 'company':
          navigate('/employer/dashboard', { replace: true })
          break
        case 'peso_personnel':
          navigate('/qcpeso/dashboard', { replace: true })
          break
        case 'admin':
          navigate('/admin/dashboard', { replace: true })
          break
      }
    }
  }, [status, user, navigate, searchParams])

  const selectRole = (newRole: LoginTabRole) => {
    setRole(newRole)
    setError('')
  }

  const handleGoogleLogin = () => {
    authService.startGoogleLogin()
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!email.trim() || !password) {
      setError('Please enter your email address and password.')
      return
    }

    setError('')
    setLoading(true)
    try {
      const userRole = await login({ email: email.trim(), password }, role)
      const returnTo = searchParams.get('returnTo')
      if (returnTo) {
        navigate(decodeURIComponent(returnTo), { replace: true })
        return
      }

      switch (userRole) {
        case 'student':
          navigate('/intern-seeker', { replace: true })
          break
        case 'company':
          navigate('/employer/dashboard', { replace: true })
          break
        case 'peso_personnel':
          navigate('/qcpeso/dashboard', { replace: true })
          break
        case 'admin':
          navigate('/admin/dashboard', { replace: true })
          break
        default:
          navigate('/', { replace: true })
      }
    } catch (err: any) {
      const norm = normalizeApiError(err)
      setError(norm.message || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className={styles.page}>
      <aside className={styles.artPanel} aria-hidden="true">
        <img src={leftPanelArtwork} alt="" />
      </aside>

      <section className={styles.loginPanel} aria-labelledby="login-heading">
        <div className={styles.loginContent}>
          <div className={styles.roleTabs} aria-label="Select account type" role="group">
            {ROLES.map((r) => (
              <button
                className={role === r.value ? styles.activeRole : styles.roleButton}
                key={r.value}
                onClick={() => selectRole(r.value)}
                type="button"
                aria-pressed={role === r.value}
              >
                {r.label}
              </button>
            ))}
          </div>

          <h1 id="login-heading">Welcome Back!</h1>

          {role === 'intern-seeker' && (
            <>
              <button className={styles.googleButton} type="button" onClick={handleGoogleLogin}>
                <img src={googleLogo} alt="" />
                <span>Login with Google</span>
              </button>

              <div className={styles.divider}>
                <span>Or login with email</span>
              </div>
            </>
          )}

          {role === 'intern-seeker' && (
            <p className={styles.signupPrompt}>
              Don&apos;t have an account?{' '}
              <Link to="/sign-up">Sign Up</Link>
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
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-describedby={error ? 'login-error' : undefined}
            />

            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-describedby={error ? 'login-error' : undefined}
            />

            <div className={styles.formOptions}>
              <label className={styles.rememberMe}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
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

            <button className={styles.loginButton} type="submit" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
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
