import { useRef, useState, type FormEvent } from 'react'
import { homePathFor, signUp } from '../../auth/auth'
import Icon from '../../components/Icon/Icon'
import Link from '../../router/Link'
import { navigate, routes, safeReturnPath, useSearchParam, withReturnPath } from '../../router/router'
import { ApiError } from '../../services/api'
// The card, fields and notices are the same as on the Login page.
import '../Login/LoginPage.css'
import './SignUpPage.css'

type Field = 'name' | 'email' | 'password' | 'confirm'
type Values = Record<Field, string>
type FieldErrors = Partial<Record<Field, string>>

const FIELDS: Field[] = ['name', 'email', 'password', 'confirm']
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// Same limits as POST /api/auth/register, which checks them again.
const MAX_NAME_LENGTH = 100
const MIN_PASSWORD_LENGTH = 8
const MAX_PASSWORD_LENGTH = 1024

function validate(values: Values): FieldErrors {
  const errors: FieldErrors = {}
  if (!values.name.trim()) errors.name = 'Enter your name.'
  else if (values.name.trim().length > MAX_NAME_LENGTH) {
    errors.name = `Use at most ${MAX_NAME_LENGTH} characters.`
  }
  if (!EMAIL_PATTERN.test(values.email.trim())) errors.email = 'Enter a valid email address.'
  if (values.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`
  } else if (values.password.length > MAX_PASSWORD_LENGTH) {
    errors.password = `Use at most ${MAX_PASSWORD_LENGTH} characters.`
  }
  if (!values.confirm) errors.confirm = 'Repeat your password.'
  else if (values.confirm !== values.password) errors.confirm = 'Passwords do not match.'
  return errors
}

function signUpErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 409) {
      return 'An account with this email already exists. Sign in instead, or use another email.'
    }
    if (error.status === undefined || error.status >= 500) {
      return `${error.message} Please try again in a moment.`
    }
    return error.message
  }
  return 'Something went wrong while creating your account. Please try again.'
}

const fieldConfig: Record<
  Field,
  { label: string; type: string; autoComplete: string; placeholder: string }
> = {
  name: { label: 'Name', type: 'text', autoComplete: 'name', placeholder: 'Enter your name' },
  email: { label: 'Email', type: 'email', autoComplete: 'email', placeholder: 'Enter your email' },
  password: {
    label: 'Password',
    type: 'password',
    autoComplete: 'new-password',
    placeholder: 'Create a password',
  },
  confirm: {
    label: 'Confirm password',
    type: 'password',
    autoComplete: 'new-password',
    placeholder: 'Repeat your password',
  },
}

/** Figma "09-sign-up" (screen 03-Sign-Up). */
function SignUpPage() {
  const returnTo = safeReturnPath(useSearchParam('next'))
  const [values, setValues] = useState<Values>({ name: '', email: '', password: '', confirm: '' })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const inputRefs = useRef<Partial<Record<Field, HTMLInputElement | null>>>({})

  function updateField(field: Field, value: string) {
    const next = { ...values, [field]: value }
    setValues(next)
    setNotice(null)
    if (submitted) setErrors(validate(next))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading) return
    setSubmitted(true)
    const nextErrors = validate(values)
    setErrors(nextErrors)

    const firstInvalid = FIELDS.find((field) => nextErrors[field])
    if (firstInvalid) {
      setNotice(null)
      inputRefs.current[firstInvalid]?.focus()
      return
    }

    setNotice(null)
    setLoading(true)
    try {
      // The server creates a User account and signs it in with the session cookie.
      const user = await signUp(values.name.trim(), values.email.trim(), values.password)
      // Back to the thread that asked for sign-in, else the role's home page.
      navigate(returnTo ?? homePathFor(user.role))
    } catch (error) {
      setLoading(false)
      setNotice(signUpErrorMessage(error))
      if (error instanceof ApiError && error.status === 409) inputRefs.current.email?.focus()
    }
  }

  return (
    <main className="login-page signup-page">
      <section className="login-page__inner container" aria-labelledby="signup-title">
        <form className="login-card" noValidate onSubmit={handleSubmit} aria-busy={loading}>
          <h1 className="login-card__title" id="signup-title">
            Create Account
          </h1>
          <p className="login-card__subtitle">
            Join AstroThread to save bookmarks and keep your profile.
          </p>

          {notice && (
            <p className="login-notice login-notice--error" role="alert">
              <Icon name="error" className="login-notice__icon" />
              <span>{notice}</span>
            </p>
          )}

          {FIELDS.map((field) => {
            const config = fieldConfig[field]
            const id = `signup-${field}`
            const error = errors[field]
            return (
              <div className="login-field" key={field}>
                <label className="login-field__label" htmlFor={id}>
                  {config.label}
                </label>
                <input
                  ref={(element) => {
                    inputRefs.current[field] = element
                  }}
                  id={id}
                  className={`login-field__input${error ? ' login-field__input--invalid' : ''}`}
                  type={config.type}
                  name={field}
                  autoComplete={config.autoComplete}
                  placeholder={config.placeholder}
                  value={values[field]}
                  onChange={(event) => updateField(field, event.target.value)}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? `${id}-error` : undefined}
                />
                {error && (
                  <p className="login-field__error" id={`${id}-error`}>
                    <Icon name="error" />
                    {error}
                  </p>
                )}
              </div>
            )
          })}

          <p className="signup-role-note" role="note">
            <Icon name="error" className="signup-role-note__icon" />
            <span>
              New accounts are created as standard <strong>User</strong> accounts. Owner access is
              assigned by the platform and cannot be chosen here.
            </span>
          </p>

          <button
            type="submit"
            className="button button--primary login-card__submit"
            disabled={loading}
          >
            {loading && <span className="login-card__spinner" aria-hidden="true" />}
            {loading ? 'Creating Account…' : 'Create Account'}
          </button>

          <p className="login-card__signup">
            Already have an account?
            <Link className="login-card__signup-link" href={withReturnPath(routes.login, returnTo)}>
              Sign In
            </Link>
          </p>
        </form>
      </section>
    </main>
  )
}

export default SignUpPage
