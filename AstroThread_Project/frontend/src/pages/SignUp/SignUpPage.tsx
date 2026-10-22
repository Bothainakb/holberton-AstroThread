import { useRef, useState, type FormEvent } from 'react'
import { homePathFor, signUp } from '../../auth/auth'
import Icon from '../../components/Icon/Icon'
import Link from '../../router/Link'
import { navigate, routes } from '../../router/router'
import { ApiError } from '../../services/api'
// Same card, fields and notices as the Login page.
import '../Login/LoginPage.css'

type Field = 'name' | 'email' | 'password' | 'confirm'
type Values = Record<Field, string>
type FieldErrors = Partial<Record<Field, string>>

// Matches the backend rules in app.py; the server checks them again.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 8
const MAX_NAME_LENGTH = 100

const FIELD_ORDER: Field[] = ['name', 'email', 'password', 'confirm']

function validate({ name, email, password, confirm }: Values): FieldErrors {
  const errors: FieldErrors = {}
  if (name.trim().length > MAX_NAME_LENGTH) {
    errors.name = `Use at most ${MAX_NAME_LENGTH} characters.`
  }
  if (!EMAIL_PATTERN.test(email.trim())) errors.email = 'Enter a valid email address.'
  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`
  }
  if (!confirm) errors.confirm = 'Repeat your password.'
  else if (confirm !== password) errors.confirm = 'Passwords do not match.'
  return errors
}

function signUpErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 409) return 'An account with this email already exists. Sign in instead.'
    if (error.status === undefined || error.status >= 500) {
      return `${error.message} Please try again in a moment.`
    }
    return error.message
  }
  return 'Something went wrong while creating your account. Please try again.'
}

/** Figma "09-sign-up", built from the Login page's card and field styles. */
function SignUpPage() {
  const [values, setValues] = useState<Values>({ name: '', email: '', password: '', confirm: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const refs = {
    name: useRef<HTMLInputElement>(null),
    email: useRef<HTMLInputElement>(null),
    password: useRef<HTMLInputElement>(null),
    confirm: useRef<HTMLInputElement>(null),
  }

  // After the first submit, errors update as the user fixes the fields.
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
    setNotice(null)

    const firstInvalid = FIELD_ORDER.find((field) => nextErrors[field])
    if (firstInvalid) {
      refs[firstInvalid].current?.focus()
      return
    }

    setLoading(true)
    try {
      const user = await signUp(values.name.trim(), values.email.trim(), values.password)
      navigate(homePathFor(user.role))
    } catch (error) {
      setLoading(false)
      setNotice(signUpErrorMessage(error))
      if (error instanceof ApiError && error.status === 409) refs.email.current?.focus()
    }
  }

  function renderField(
    field: Field,
    label: string,
    input: { type: string; autoComplete: string; placeholder: string },
  ) {
    const id = `signup-${field}`
    const isPassword = field === 'password' || field === 'confirm'
    const inputClasses = [
      'login-field__input',
      isPassword && 'login-field__input--password',
      errors[field] && 'login-field__input--invalid',
    ]
      .filter(Boolean)
      .join(' ')

    const control = (
      <input
        ref={refs[field]}
        id={id}
        className={inputClasses}
        type={isPassword && showPassword ? 'text' : input.type}
        name={field}
        autoComplete={input.autoComplete}
        placeholder={input.placeholder}
        value={values[field]}
        onChange={(event) => updateField(field, event.target.value)}
        aria-invalid={errors[field] ? true : undefined}
        aria-describedby={errors[field] ? `${id}-error` : undefined}
      />
    )

    return (
      <div className="login-field">
        <label className="login-field__label" htmlFor={id}>
          {label}
        </label>
        {field === 'password' ? (
          <div className="login-field__control">
            {control}
            <button
              type="button"
              className="login-field__toggle"
              aria-label={showPassword ? 'Hide passwords' : 'Show passwords'}
              aria-pressed={showPassword}
              aria-controls="signup-password signup-confirm"
              onClick={() => setShowPassword((shown) => !shown)}
            >
              <Icon name="eye" />
            </button>
          </div>
        ) : isPassword ? (
          <div className="login-field__control">{control}</div>
        ) : (
          control
        )}
        {errors[field] && (
          <p className="login-field__error" id={`${id}-error`}>
            <Icon name="error" />
            {errors[field]}
          </p>
        )}
      </div>
    )
  }

  return (
    <main className="login-page">
      <section className="login-page__inner container" aria-labelledby="signup-title">
        <form className="login-card" noValidate onSubmit={handleSubmit} aria-busy={loading}>
          <h1 className="login-card__title" id="signup-title">
            Create Account
          </h1>
          <p className="login-card__subtitle">Join AstroThread to save your research journey.</p>

          {notice && (
            <p className="login-notice login-notice--error" role="alert">
              <Icon name="error" className="login-notice__icon" />
              <span>{notice}</span>
            </p>
          )}

          {renderField('name', 'Name (optional)', {
            type: 'text',
            autoComplete: 'name',
            placeholder: 'Enter your name',
          })}
          {renderField('email', 'Email', {
            type: 'email',
            autoComplete: 'email',
            placeholder: 'Enter your email',
          })}
          {renderField('password', 'Password', {
            type: 'password',
            autoComplete: 'new-password',
            placeholder: `At least ${MIN_PASSWORD_LENGTH} characters`,
          })}
          {renderField('confirm', 'Confirm Password', {
            type: 'password',
            autoComplete: 'new-password',
            placeholder: 'Repeat your password',
          })}

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
            <Link className="login-card__signup-link" href={routes.login}>
              Sign In
            </Link>
          </p>
        </form>
      </section>
    </main>
  )
}

export default SignUpPage
