import { type FormEvent, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import googleLogo from '../../../assets/google-logo.svg'
import leftPanelArtwork from '../../../assets/login_left-panel.svg'
import type { SignUpData, SignUpRole } from '../types/auth.types'
import styles from './SignUpPage.module.css'

const SIGN_UP_ROLES: ReadonlyArray<{ label: string; value: SignUpRole }> = [
  { label: 'Intern Seeker', value: 'intern-seeker' },
  { label: 'QCPESO', value: 'qcpeso' },
]

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
  employeeIdNumber: '',
  position: '',
  department: '',
  employeeIdFile: null,
}

const isSignUpRole = (role: string | undefined): role is SignUpRole =>
  role === 'intern-seeker' || role === 'qcpeso'

function SignUpPage() {
  const { role } = useParams()
  const [step, setStep] = useState(0)
  const [data, setData] = useState<SignUpData>({
    ...INITIAL_DATA,
    role: isSignUpRole(role) ? role : 'intern-seeker',
  })
  const [error, setError] = useState('')

  const updateField = <Field extends keyof SignUpData>(field: Field, value: SignUpData[Field]) => {
    setData((current) => ({ ...current, [field]: value }))
    setError('')
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

    if (!data.firstName.trim() || !data.middleName.trim() || !data.lastName.trim()) {
      setError('Please provide your complete name.')
      return
    }

    if (!data.sex || !data.birthDate) {
      setError('Please select your sex and birth date.')
      return
    }

    setError('')
    setStep(2)
  }

  const saveProfile = (event: FormEvent<HTMLFormElement>) => {
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

    setError('')
  }

  const saveEmployeeProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (
      !data.employeeIdNumber.trim() ||
      !data.position ||
      !data.department ||
      !data.employeeIdFile
    ) {
      setError('Please complete all employee verification fields.')
      return
    }

    if (!data.employeeIdFile.type.startsWith('image/')) {
      setError('Please upload your employee ID as an image file.')
      return
    }

    setError('')
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
              onSubmit={continueFromProfile}
            />
          )}
          {step === 2 && data.role === 'intern-seeker' && (
            <LocationStep
              data={data}
              error={error}
              onChange={updateField}
              onSubmit={saveProfile}
            />
          )}
          {step === 2 && data.role === 'qcpeso' && (
            <EmployeeStep
              data={data}
              error={error}
              onChange={updateField}
              onSubmit={saveEmployeeProfile}
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
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

function AccountStep({ data, error, onChange, onSubmit }: StepProps) {
  return (
    <>
      <div className={styles.roleTabs} aria-label="Select account type" role="group">
        {SIGN_UP_ROLES.map((role) => (
          <button
            className={data.role === role.value ? styles.activeRole : styles.roleButton}
            key={role.value}
            onClick={() => onChange('role', role.value)}
            type="button"
            aria-pressed={data.role === role.value}
          >
            {role.label}
          </button>
        ))}
      </div>

      <h1>Get more opportunities</h1>

      {data.role === 'intern-seeker' && (
        <>
          <button className={styles.googleButton} type="button">
            <img src={googleLogo} alt="" />
            <span>Sign Up with Google</span>
          </button>
          <div className={styles.divider}>
            <span>Or sign up with email</span>
          </div>
        </>
      )}

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

function BasicProfileStep({ data, error, onChange, onSubmit }: StepProps) {
  return (
    <>
      <header className={styles.stepHeader}>
        <h1>Basic Profile Information</h1>
        <p>Let us know who you are</p>
      </header>
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        <TextField id="first-name" label="First Name" required placeholder="Enter your first name" value={data.firstName} onChange={(value) => onChange('firstName', value)} />
        <TextField id="middle-name" label="Middle Name" required placeholder="Enter your middle name" value={data.middleName} onChange={(value) => onChange('middleName', value)} />
        <TextField id="last-name" label="Last Name" required placeholder="Enter your last name" value={data.lastName} onChange={(value) => onChange('lastName', value)} />
        <TextField id="extension-name" label="Extension Name" placeholder="Enter your extension name" value={data.extensionName} onChange={(value) => onChange('extensionName', value)} />
        <SelectField id="sex" label="Sex" required value={data.sex} onChange={(value) => onChange('sex', value)} options={['Female', 'Male', 'Prefer not to say']} />
        <TextField id="birth-date" label="Birth Date" required type="date" value={data.birthDate} onChange={(value) => onChange('birthDate', value)} />
        <FormError error={error} />
        <button className={styles.primaryButton} type="submit">Continue</button>
        <p className={styles.pageNumber}>Page 1 of 2</p>
      </form>
    </>
  )
}

function LocationStep({ data, error, onChange, onSubmit }: StepProps) {
  return (
    <>
      <header className={styles.stepHeader}>
        <h1>User Location Information</h1>
        <p>See jobs near you</p>
      </header>
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        <TextField id="contact-number" label="Contact Number" required type="tel" autoComplete="tel" placeholder="Enter your contact number" value={data.contactNumber} onChange={(value) => onChange('contactNumber', value)} />
        <TextField id="street-address" label="House/Block No./Street" required autoComplete="street-address" placeholder="Enter your street address" value={data.streetAddress} onChange={(value) => onChange('streetAddress', value)} />
        <SelectField id="barangay" label="Barangay" required value={data.barangay} onChange={(value) => onChange('barangay', value)} options={['Bagumbayan', 'Batasan Hills', 'Commonwealth', 'Cubao', 'Diliman']} />
        <TextField id="district" label="District" required placeholder="Enter district" value={data.district} onChange={(value) => onChange('district', value)} />
        <TextField id="city" label="City" required autoComplete="address-level2" placeholder="Enter city" value={data.city} onChange={(value) => onChange('city', value)} />
        <SelectField id="inquiry-channel" label="Inquiry via" required value={data.inquiryChannel} onChange={(value) => onChange('inquiryChannel', value)} options={['QC PESO Office', 'School', 'Social Media', 'Referral', 'Other']} />
        <FormError error={error} />
        <button className={styles.primaryButton} type="submit">Save and Continue</button>
        <p className={styles.pageNumber}>Page 2 of 2</p>
      </form>
    </>
  )
}

function EmployeeStep({ data, error, onChange, onSubmit }: StepProps) {
  return (
    <>
      <header className={styles.stepHeader}>
        <h1>QCPESO Employee Information</h1>
        <p>Verify your employee status</p>
      </header>
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        <TextField
          id="employee-id-number"
          label="Employee ID Number"
          required
          placeholder="Enter your Employee ID Number"
          value={data.employeeIdNumber}
          onChange={(value) => onChange('employeeIdNumber', value)}
        />
        <SelectField
          id="position"
          label="Position/Designation"
          required
          value={data.position}
          onChange={(value) => onChange('position', value)}
          options={['Administrative Staff', 'Coordinator', 'Employment Officer', 'Supervisor']}
        />
        <SelectField
          id="department"
          label="Department/Office"
          required
          value={data.department}
          onChange={(value) => onChange('department', value)}
          options={['Administration', 'Employment Services', 'Labor Market Information', 'Training and Development']}
        />
        <FileField
          id="employee-id-file"
          label="Upload Employee ID"
          file={data.employeeIdFile}
          onChange={(file) => onChange('employeeIdFile', file)}
        />
        <FormError error={error} />
        <button className={styles.primaryButton} type="submit">Continue</button>
        <p className={styles.pageNumber}>Page 2 of 2</p>
      </form>
    </>
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

interface FileFieldProps {
  id: string
  label: string
  file: File | null
  onChange: (file: File | null) => void
}

function FileField({ id, label, file, onChange }: FileFieldProps) {
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}<span> *</span></label>
      <label className={`${styles.fileControl} ${file ? styles.hasFile : ''}`} htmlFor={id}>
        {file?.name ?? 'Input Employee ID Image'}
      </label>
      <input
        className={styles.fileInput}
        id={id}
        type="file"
        accept="image/*"
        required
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
      />
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
