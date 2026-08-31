import { type FormEvent, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import googleLogo from '../../../assets/google-logo.svg'
import leftPanelArtwork from '../../../assets/login_left-panel.svg'
import { authService } from '../../../services/auth.service'
import { useAuthStore } from '../../../stores/useAuthStore'
import type { SignUpData } from '../types/auth.types'
import {
  SIGNUP_INQUIRY_OPTIONS,
  SIGNUP_SEX_OPTIONS,
  toStudentInquiryMethod,
  toStudentSex,
} from '../signup-options'
import styles from './SignUpPage.module.css'

const INITIAL_DATA: SignUpData = {
  role: 'intern-seeker',
  email: '',
  password: '',
  confirmPassword: '',
  firstName: '',
  middleName: '',
  lastName: '',
  extensionName: '',
  sex: '',
  birthDate: '',
  contactNumber: '',
  streetAddress: '',
  barangay: '',
  district: '',
  city: '',
  inquiryChannel: '',
}

const NAME_PATTERN = /^[A-Za-z ]+$/
const sanitizeName = (value: string) => value.replace(/[^A-Za-z ]/g, '')

function SignUpPage() {
  const [searchParams] = useSearchParams()
  const isGoogle = searchParams.get('source') === 'google'
  const [step, setStep] = useState(isGoogle ? 1 : 0)
  const [data, setData] = useState<SignUpData>(INITIAL_DATA)
  const [error, setError] = useState('')
  const [, setLoading] = useState(false)

  const navigate = useNavigate()
  const { registerStudent } = useAuthStore()

  const updateField = <Field extends keyof SignUpData>(field: Field, value: SignUpData[Field]) => {
    setData((current) => ({ ...current, [field]: value }))
    setError('')
  }

  const updateNameField = (field: 'firstName' | 'middleName' | 'lastName' | 'extensionName', value: string) => {
    const sanitizedValue = sanitizeName(value)
    setData((current) => ({ ...current, [field]: sanitizedValue }))
    setError(value !== sanitizedValue ? 'Names can only contain letters.' : '')
  }

  const continueFromAccount = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!data.email.trim() || !data.password || !data.confirmPassword) {
      setError('Please complete all account fields.')
      return
    }

    if (!/^\S+@\S+\.\S+$/.test(data.email)) {
      setError('Please enter a valid email address.')
      return
    }

    if (data.password !== data.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setError('')
    setStep(1)
  }

  const continueFromProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!data.firstName.trim() || !data.lastName.trim()) {
      setError('Please provide your first and last name.')
      return
    }

    if (![data.firstName, data.middleName, data.lastName, data.extensionName].filter(Boolean).every((name) => NAME_PATTERN.test(name.trim()))) {
      setError('Names can only contain letters.')
      return
    }

    if (!data.sex || !data.birthDate) {
      setError('Please select your sex and birth date.')
      return
    }

    setError('')
    setStep(2)
  }

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const requiredLocationFields = [
      data.contactNumber,
      data.streetAddress,
      data.barangay,
      data.district,
      data.city,
      data.inquiryChannel,
    ]

    if (requiredLocationFields.some((field) => !field.trim())) {
      setError('Please complete all location and contact fields.')
      return
    }

    const sex = toStudentSex(data.sex)
    const inquiryMethod = toStudentInquiryMethod(data.inquiryChannel)
    if (!sex || !inquiryMethod) {
      setError('Please select valid sex and inquiry options.')
      return
    }

    setError('')
    setLoading(true)

    try {
      if (isGoogle) {
        const res = await authService.completeGoogleSignup({
          firstName: data.firstName.trim(),
          middleName: data.middleName.trim() || undefined,
          lastName: data.lastName.trim(),
          extensionName: data.extensionName.trim() || undefined,
          sex,
          birthDate: data.birthDate,
          contactNumber: data.contactNumber.trim(),
          addressLine: data.streetAddress.trim(),
          addressBarangay: data.barangay.trim(),
          addressDistrict: data.district.trim(),
          addressCity: data.city.trim(),
          inquiryMethod,
        })
        const { setAccessToken, loadMe } = useAuthStore.getState()
        setAccessToken(res.accessToken)
        await loadMe()
      } else {
        await registerStudent({
          email: data.email.trim().toLowerCase(),
          password: data.password,
          firstName: data.firstName.trim(),
          middleName: data.middleName.trim() || undefined,
          lastName: data.lastName.trim(),
          extensionName: data.extensionName.trim() || undefined,
          sex,
          birthDate: data.birthDate,
          contactNumber: data.contactNumber.trim(),
          addressLine: data.streetAddress.trim(),
          addressBarangay: data.barangay.trim(),
          addressDistrict: data.district.trim(),
          addressCity: data.city.trim(),
          inquiryMethod,
        })
      }
      navigate('/intern-seeker', { replace: true })
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check your information.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className={styles.page}>
      <aside className={styles.artPanel} aria-hidden="true">
        <img src={leftPanelArtwork} alt="" />
      </aside>

      <section className={styles.formPanel} aria-live="polite">
        <div className={`${styles.content} ${step > 0 ? styles.profileContent : ''}`}>
          {step === 0 && (
            <AccountStep
              data={data}
              error={error}
              onChange={updateField}
              onSubmit={continueFromAccount}
            />
          )}
          {step === 1 && (
            <BasicProfileStep
              data={data}
              error={error}
              onChange={updateField}
              onNameChange={updateNameField}
              onSubmit={continueFromProfile}
              onBack={() => setStep(0)}
            />
          )}
          {step === 2 && (
            <LocationStep
              data={data}
              error={error}
              onChange={updateField}
              onSubmit={saveProfile}
              onBack={() => setStep(1)}
            />
          )}

          <LegalNotice />
        </div>
      </section>
    </main>
  )
}

interface StepProps {
  data: SignUpData
  error: string
  onChange: <Field extends keyof SignUpData>(field: Field, value: SignUpData[Field]) => void
  onNameChange?: (field: 'firstName' | 'middleName' | 'lastName' | 'extensionName', value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onBack?: () => void
}

function AccountStep({ data, error, onChange, onSubmit }: StepProps) {
  return (
    <>
      <h1>Get more opportunities</h1>

      <button
        className={styles.googleButton}
        type="button"
        onClick={() => authService.startGoogleSignup()}
      >
        <img src={googleLogo} alt="" />
        <span>Sign Up with Google</span>
      </button>
      <div className={styles.divider}>
        <span>Or sign up with email</span>
      </div>

      <p className={styles.loginPrompt}>
        Already have an account? <Link to="/">Login</Link>
      </p>

      <form className={styles.form} onSubmit={onSubmit} noValidate>
        <TextField
          id="signup-email"
          label="Email Address"
          type="email"
          autoComplete="email"
          placeholder="Enter email address"
          value={data.email}
          onChange={(value) => onChange('email', value)}
        />
        <TextField
          id="signup-password"
          label="Password"
          type="password"
          autoComplete="new-password"
          placeholder="Enter password"
          value={data.password}
          onChange={(value) => onChange('password', value)}
        />
        <TextField
          id="confirm-password"
          label="Confirm Password"
          type="password"
          autoComplete="new-password"
          placeholder="Enter password"
          value={data.confirmPassword}
          onChange={(value) => onChange('confirmPassword', value)}
        />
        <FormError error={error} />
        <button className={styles.primaryButton} type="submit">
          Continue
        </button>
      </form>
    </>
  )
}

function BasicProfileStep({ data, error, onChange, onNameChange, onSubmit, onBack }: StepProps) {
  return (
    <>
      <header className={styles.stepHeader}>
        <h1>Basic Profile Information</h1>
        <p>Let us know who you are</p>
      </header>
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        <TextField id="first-name" label="First Name" required placeholder="Enter your first name" value={data.firstName} onChange={(value) => onNameChange?.('firstName', value)} />
        <TextField id="middle-name" label="Middle Name" placeholder="Enter your middle name" value={data.middleName} onChange={(value) => onNameChange?.('middleName', value)} />
        <TextField id="last-name" label="Last Name" required placeholder="Enter your last name" value={data.lastName} onChange={(value) => onNameChange?.('lastName', value)} />
        <TextField id="extension-name" label="Extension Name" placeholder="Enter your extension name" value={data.extensionName} onChange={(value) => onNameChange?.('extensionName', value)} />
        <SelectField id="sex" label="Sex" required value={data.sex} onChange={(value) => onChange('sex', value)} options={[...SIGNUP_SEX_OPTIONS]} />
        <TextField id="birth-date" label="Birth Date" required type="date" value={data.birthDate} onChange={(value) => onChange('birthDate', value)} />
        <FormError error={error} />
        <button className={styles.primaryButton} type="submit">Continue</button>
        <BackButton onClick={onBack} />
        <p className={styles.pageNumber}>Page 1 of 2</p>
      </form>
    </>
  )
}

function LocationStep({ data, error, onChange, onSubmit, onBack }: StepProps) {
  return (
    <>
      <header className={styles.stepHeader}>
        <h1>User Location Information</h1>
        <p>See jobs near you</p>
      </header>
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        <TextField id="contact-number" label="Contact Number" required type="tel" autoComplete="tel" placeholder="Enter your contact number" value={data.contactNumber} onChange={(value) => onChange('contactNumber', value)} />
        <TextField id="street-address" label="House/Block No./Street" required autoComplete="street-address" placeholder="Enter your street address" value={data.streetAddress} onChange={(value) => onChange('streetAddress', value)} />
        <TextField id="barangay" label="Barangay" required autoComplete="address-level3" placeholder="Enter barangay" value={data.barangay} onChange={(value) => onChange('barangay', value)} />
        <TextField id="district" label="District" required placeholder="Enter district" value={data.district} onChange={(value) => onChange('district', value)} />
        <TextField id="city" label="City" required autoComplete="address-level2" placeholder="Enter city" value={data.city} onChange={(value) => onChange('city', value)} />
        <SelectField id="inquiry-channel" label="Inquiry via" required value={data.inquiryChannel} onChange={(value) => onChange('inquiryChannel', value)} options={[...SIGNUP_INQUIRY_OPTIONS]} />
        <FormError error={error} />
        <button className={styles.primaryButton} type="submit">Save and Continue</button>
        <BackButton onClick={onBack} />
        <p className={styles.pageNumber}>Page 2 of 2</p>
      </form>
    </>
  )
}

function BackButton({ onClick }: { onClick?: () => void }) {
  return (
    <button type="button" className={styles.backButton} onClick={onClick}>
      Back
    </button>
  )
}

interface TextFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  type?: string
  placeholder?: string
  autoComplete?: string
}

function TextField({ id, label, value, onChange, required = false, type = 'text', placeholder, autoComplete }: TextFieldProps) {
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}{required && <span> *</span>}</label>
      <input
        id={id}
        className={!value && type === 'date' ? styles.placeholderControl : undefined}
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  )
}

interface SelectFieldProps extends Omit<TextFieldProps, 'type' | 'placeholder' | 'autoComplete'> {
  options: string[]
}

function SelectField({ id, label, value, onChange, required = false, options }: SelectFieldProps) {
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}{required && <span> *</span>}</label>
      <select
        id={id}
        className={!value ? styles.placeholderControl : undefined}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="" disabled>Choose Option</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </div>
  )
}

function FormError({ error }: { error: string }) {
  return error ? <p className={styles.error} role="alert">{error}</p> : null
}

function LegalNotice() {
  return (
    <p className={styles.legalNotice}>
      By continuing, you agree to QC PESO&apos;s <Link to="/terms-of-service">Terms of Service</Link> &amp;{' '}
      <Link to="/privacy-policy">Privacy Policy</Link>. This platform is a free public service of the Quezon City Government.
    </p>
  )
}

export default SignUpPage
