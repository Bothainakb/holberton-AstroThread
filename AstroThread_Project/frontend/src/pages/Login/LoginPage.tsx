import { useRef, useState, type FormEvent } from 'react'
import { homePathFor, signIn, useAuth } from '../../auth/auth'
import Icon from '../../components/Icon/Icon'
import Link from '../../router/Link'
import { navigate, routes, safeReturnPath, useSearchParam, withReturnPath } from '../../router/router'
import { ApiError } from '../../services/api'
import './LoginPage.css'

type Field = 'email' | 'password'
type FieldErrors = Partial<Record<Field, string>>

interface Notice {
  kind: 'info' | 'error'
  message: string
}

// Simple format check before sending; the server verifies the credentials.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {}
  if (!EMAIL_PATTERN.test(email.trim())) errors.email = 'Enter a valid email address.'
  if (!password) errors.password = 'Enter your password.'
  return errors
}

/** Shown instead of a fake sign-in: Google sign-in has no backend support. */
const GOOGLE_NOT_CONNECTED =
  "Google sign-in isn't available yet. Sign in with your email and password instead."

function loginErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Incorrect email or password. Please try again.'
    if (error.status === undefined || error.status >= 500) {
      return `${error.message} Please try again in a moment.`
    }
    return error.message
  }
  return 'Something went wrong while signing in. Please try again.'
}

/** Figma "05-login-session"; field states follow "08-login-form-states". */
function LoginPage() {
  const returnTo = safeReturnPath(useSearchParam('next'))
  const auth = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  // After the first submit, errors update as the user fixes the fields.
  function updateField(field: Field, value: string) {
    const next = { email, password, [field]: value }
    if (field === 'email') setEmail(value)
    else setPassword(value)
    setNotice(null)
    if (submitted) setErrors(validate(next.email, next.password))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading) return
    setSubmitted(true)
    const nextErrors = validate(email, password)
    setErrors(nextErrors)
    setNotice(null)

    if (nextErrors.email) {
      emailRef.current?.focus()
      return
    }
    if (nextErrors.password) {
      passwordRef.current?.focus()
      return
    }

    setLoading(true)
    try {
      const user = await signIn(email.trim(), password, remember)
      // Back to the thread that asked for sign-in (e.g. to save it), else the
      // destination for the role the server verified.
      navigate(returnTo ?? homePathFor(user.role))
    } catch (error) {
      setLoading(false)
      setNotice({ kind: 'error', message: loginErrorMessage(error) })
      if (error instanceof ApiError && error.status === 401) {
        setPassword('')
        passwordRef.current?.focus()
      }
    }
  }

  const signedInAs = auth.status === 'signed-in' && !loading ? auth.user : null

  return (
    <main className="login-page">
      <section className="login-page__inner container" aria-labelledby="login-title">
        <form className="login-card" noValidate onSubmit={handleSubmit} aria-busy={loading}>
          <h1 className="login-card__title" id="login-title">
            Welcome Back
          </h1>
          <p className="login-card__subtitle">Sign in to continue your research journey.</p>

          {signedInAs && !notice && (
            <p className="login-notice" role="status">
              <Icon name="error" className="login-notice__icon" />
              <span>
                You&apos;re signed in as {signedInAs.email}
                {signedInAs.role === 'owner' ? ' (Owner)' : ''}. Signing in again switches accounts.
              </span>
            </p>
          )}

          {notice && (
            <p
              className={`login-notice${notice.kind === 'error' ? ' login-notice--error' : ''}`}
              role={notice.kind === 'error' ? 'alert' : 'status'}
            >
              <Icon name="error" className="login-notice__icon" />
              <span>{notice.message}</span>
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
            disabled={loading}
          >
            {loading && <span className="login-card__spinner" aria-hidden="true" />}
            {loading ? 'Signing In…' : 'Sign In'}
          </button>

          <p className="login-card__signup">
            Don&apos;t have an account?
            <Link className="login-card__signup-link" href={withReturnPath(routes.signUp, returnTo)}>
              Create Account
            </Link>
          </p>

          <div className="login-divider" aria-hidden="true">
            <span className="login-divider__line" />
            <span className="login-divider__text">OR</span>
            <span className="login-divider__line" />
          </div>

          <button
            type="button"
            className="login-google"
            onClick={() => setNotice({ kind: 'info', message: GOOGLE_NOT_CONNECTED })}
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
