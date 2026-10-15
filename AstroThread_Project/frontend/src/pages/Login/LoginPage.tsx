import { useRef, useState, type FormEvent } from 'react'
import Icon from '../../components/Icon/Icon'
import { navigate, routes } from '../../router/router'
import { AuthError, login } from '../../services/auth'
import './LoginPage.css'

type Field = 'email' | 'password'
type FieldErrors = Partial<Record<Field, string>>

// Quick format check before sending; the server does the real validation.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {}
  if (!EMAIL_PATTERN.test(email.trim())) errors.email = 'Enter a valid email address.'
  if (!password) errors.password = 'Enter your password.'
  return errors
}

/** Server messages such as "Invalid email or password" end without a period. */
function asSentence(text: string) {
  return /[.!?]$/.test(text) ? text : `${text}.`
}

/** Google sign-in is not part of the MVP. */
const GOOGLE_NOT_AVAILABLE = "Google sign-in isn't available yet. Sign in with your email instead."

/** Figma "05-login-session"; field states follow "08-login-form-states". */
function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitted, setSubmitted] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [remember, setRemember] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  // After the first submit, errors update as the user fixes the fields.
  function updateField(field: Field, value: string) {
    const next = { email, password, [field]: value }
    if (field === 'email') setEmail(value)
    else setPassword(value)
    setNotice(null)
    setFormError(null)
    if (submitted) setErrors(validate(next.email, next.password))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return
    setSubmitted(true)
    setNotice(null)
    setFormError(null)
    const nextErrors = validate(email, password)
    setErrors(nextErrors)

    if (nextErrors.email) {
      emailRef.current?.focus()
      return
    }
    if (nextErrors.password) {
      passwordRef.current?.focus()
      return
    }

    setSubmitting(true)
    try {
      await login(email.trim(), password, remember)
      navigate(routes.home)
    } catch (error) {
      if (error instanceof AuthError && (error.fields.email || error.fields.password)) {
        setErrors({ email: error.fields.email, password: error.fields.password })
      } else {
        setFormError(
          error instanceof AuthError ? asSentence(error.message) : 'Something went wrong. Please try again.',
        )
        // A wrong email or password: clear the password so it can be retyped.
        if (error instanceof AuthError && error.status === 401) {
          setPassword('')
          passwordRef.current?.focus()
        }
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-page__inner container" aria-labelledby="login-title">
        <form className="login-card" noValidate onSubmit={handleSubmit}>
          <h1 className="login-card__title" id="login-title">
            Welcome Back
          </h1>
          <p className="login-card__subtitle">Sign in to continue your research journey.</p>

          {formError && (
            <p className="login-notice login-notice--error" role="alert">
              <Icon name="error" className="login-notice__icon" />
              <span>{formError}</span>
            </p>
          )}

          {notice && (
            <p className="login-notice" role="status">
              <Icon name="error" className="login-notice__icon" />
              <span>{notice}</span>
            </p>
          )}

          <div className="login-field">
            <label className="login-field__label" htmlFor="login-email">
              Email
            </label>
            <input
              ref={emailRef}
              id="login-email"
              className={`login-field__input${errors.email ? ' login-field__input--invalid' : ''}`}
              type="email"
              name="email"
              autoComplete="email"
              placeholder="Enter your email"
              value={email}
              onChange={(event) => updateField('email', event.target.value)}
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={errors.email ? 'login-email-error' : undefined}
            />
            {errors.email && (
              <p className="login-field__error" id="login-email-error">
                <Icon name="error" />
                {errors.email}
              </p>
            )}
          </div>

          <div className="login-field">
            <label className="login-field__label" htmlFor="login-password">
              Password
            </label>
            <div className="login-field__control">
              <input
                ref={passwordRef}
                id="login-password"
                className={`login-field__input login-field__input--password${errors.password ? ' login-field__input--invalid' : ''}`}
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => updateField('password', event.target.value)}
                aria-invalid={errors.password ? true : undefined}
                aria-describedby={errors.password ? 'login-password-error' : undefined}
              />
              <button
                type="button"
                className="login-field__toggle"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                aria-controls="login-password"
                onClick={() => setShowPassword((shown) => !shown)}
              >
                <Icon name="eye" />
              </button>
            </div>
            {errors.password && (
              <p className="login-field__error" id="login-password-error">
                <Icon name="error" />
                {errors.password}
              </p>
            )}
          </div>

          <div className="login-card__options">
            <label className="login-remember">
              <input
                className="login-remember__box"
                type="checkbox"
                name="remember"
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
              />
              Remember me
            </label>
            {/* There is no password-reset screen or endpoint yet. */}
            <a className="login-card__link" href="#">
              Forgot password?
            </a>
          </div>

          <button
            type="submit"
            className="button button--primary login-card__submit"
            disabled={submitting}
            aria-busy={submitting || undefined}
          >
            {submitting ? 'Signing in…' : 'Sign In'}
          </button>

          <p className="login-card__signup">
            Don&apos;t have an account?
            {/* The Create Account page (Figma "09-sign-up") is not built yet. */}
            <a className="login-card__signup-link" href="#">
              Create Account
            </a>
          </p>

          <div className="login-divider" aria-hidden="true">
            <span className="login-divider__line" />
            <span className="login-divider__text">OR</span>
            <span className="login-divider__line" />
          </div>

          <button
            type="button"
            className="login-google"
            onClick={() => {
              setFormError(null)
              setNotice(GOOGLE_NOT_AVAILABLE)
            }}
          >
            <span className="login-google__badge" aria-hidden="true">
              G
            </span>
            Continue with Google
          </button>
        </form>
      </section>
    </main>
  )
}

export default LoginPage
