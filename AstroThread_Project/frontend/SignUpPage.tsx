import { useState, type ChangeEvent, type FormEvent, type MouseEvent } from 'react'
import { navigate, routes } from '../../router/router'
import { AuthError, registerUser } from '../../services/authService'
import './SignUpPage.css'

type FormValues = {
  name: string
  email: string
  password: string
  confirmPassword: string
}

type FieldName = keyof FormValues
type FieldErrors = Partial<Record<FieldName, string>>

const EMPTY_FORM: FormValues = { name: '', email: '', password: '', confirmPassword: '' }
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 8
const MAX_NAME_LENGTH = 100
const MAX_EMAIL_LENGTH = 255

const FIELDS: { name: FieldName; label: string; type: string; placeholder: string; autoComplete: string }[] = [
  { name: 'name', label: 'Name', type: 'text', placeholder: 'Enter your name', autoComplete: 'name' },
  { name: 'email', label: 'Email', type: 'email', placeholder: 'Enter your email', autoComplete: 'email' },
  { name: 'password', label: 'Password', type: 'password', placeholder: 'Create a password', autoComplete: 'new-password' },
  { name: 'confirmPassword', label: 'Confirm password', type: 'password', placeholder: 'Repeat your password', autoComplete: 'new-password' },
]

function validate(values: FormValues): FieldErrors {
  const errors: FieldErrors = {}
  const name = values.name.trim()
  const email = values.email.trim()

  if (!name) errors.name = 'Enter your name.'
  else if (name.length > MAX_NAME_LENGTH) errors.name = `Name must be ${MAX_NAME_LENGTH} characters or fewer.`

  if (!email) errors.email = 'Enter your email.'
  else if (email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) errors.email = 'Enter a valid email address.'

  if (!values.password) errors.password = 'Enter a password.'
  else if (values.password.length < MIN_PASSWORD_LENGTH)
    errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`

  if (!values.confirmPassword) errors.confirmPassword = 'Repeat your password.'
  else if (values.confirmPassword !== values.password) errors.confirmPassword = 'Passwords do not match.'

  return errors
}

function isFieldName(value: string | undefined): value is FieldName {
  return value === 'name' || value === 'email' || value === 'password' || value === 'confirmPassword'
}

function handleAppLink(event: MouseEvent<HTMLAnchorElement>) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  event.preventDefault()
  navigate(event.currentTarget.getAttribute('href') ?? routes.home)
}

function SignUpPage() {
  const [values, setValues] = useState<FormValues>(EMPTY_FORM)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const name = event.target.name as FieldName
    const { value } = event.target
    setValues((previous) => ({ ...previous, [name]: value }))
    if (errors[name]) setErrors((previous) => ({ ...previous, [name]: undefined }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)

    const validationErrors = validate(values)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) {
      const first = FIELDS.find((field) => validationErrors[field.name])
      if (first) document.getElementById(`signup-${first.name}`)?.focus()
      return
    }

    setIsSubmitting(true)
    try {
      await registerUser({
        name: values.name.trim(),
        email: values.email.trim().toLowerCase(),
        password: values.password,
      })

      navigate(`${routes.login}?registered=1`)
    } catch (error) {
      if (error instanceof AuthError && isFieldName(error.field)) {
        const field = error.field
        setErrors((previous) => ({ ...previous, [field]: error.message }))
      } else {
        setFormError(error instanceof AuthError ? error.message : 'Something went wrong. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="signup-page">
      <section className="signup-card" aria-labelledby="signup-title">
        <header className="signup-heading">
          <h1 id="signup-title" className="signup-title">Create Account</h1>
          <p className="signup-subtitle">Join AstroThread to save bookmarks and keep your profile.</p>
        </header>

        <form className="signup-form" onSubmit={handleSubmit} noValidate>
          {FIELDS.map((field) => {
            const inputId = `signup-${field.name}`
            const errorId = `${inputId}-error`
            const fieldError = errors[field.name]
            return (
              <div className="signup-field" key={field.name}>
                <label className="signup-label" htmlFor={inputId}>{field.label}</label>
                <input
                  id={inputId}
                  className={fieldError ? 'signup-input signup-input--error' : 'signup-input'}
                  name={field.name}
                  type={field.type}
                  placeholder={field.placeholder}
                  autoComplete={field.autoComplete}
                  value={values[field.name]}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  aria-invalid={fieldError ? true : undefined}
                  aria-describedby={fieldError ? errorId : undefined}
                />
                {fieldError && <p id={errorId} className="signup-field-error">{fieldError}</p>}
              </div>
            )
          })}

          <p className="signup-role-note">
            New accounts are created as standard User accounts. Owner access is assigned by the platform and cannot be
            chosen here.
          </p>

          {formError && <p className="signup-form-error" role="alert">{formError}</p>}

          <button className="signup-submit" type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
            {isSubmitting ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="signup-switch">
          <span>Already have an account?</span>
          <a className="signup-switch-link" href={routes.login} onClick={handleAppLink}>Sign In</a>
        </p>
      </section>
    </main>
  )
}

export default SignUpPage
