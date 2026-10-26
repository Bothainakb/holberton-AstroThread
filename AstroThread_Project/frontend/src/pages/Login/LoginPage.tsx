import { useEffect, useRef, useState, type FormEvent, type InputHTMLAttributes } from 'react'
import { homePathFor, signInWithCode, useAuth } from '../../auth/auth'
import Icon from '../../components/Icon/Icon'
import Link from '../../router/Link'
import { navigate, routes } from '../../router/router'
import { ApiError, requestCode } from '../../services/api'
import './LoginPage.css'

/** Both pages sign in with an emailed code; sign-up also asks for a name. */
type Mode = 'login' | 'sign-up'
/** First the email, then the 6-digit code from the email. */
type Step = 'email' | 'code'
type Field = 'name' | 'email' | 'code'
type Values = Record<Field, string>
type FieldErrors = Partial<Record<Field, string>>

interface Notice {
  kind: 'info' | 'error'
  message: string
}

// Same rules as backend/app/api/v1/auth.py; the server checks them again.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const CODE_PATTERN = /^\d{6}$/
const MAX_NAME_LENGTH = 100
const RESEND_WAIT_SECONDS = 60

const FIELD_ORDER: Field[] = ['name', 'email', 'code']

const COPY = {
  login: {
    title: 'Welcome Back',
    subtitle: 'Sign in with a one-time code sent to your email.',
    verify: 'Sign In',
    verifying: 'Signing In…',
    switchText: "Don't have an account?",
    switchLabel: 'Create Account',
    switchHref: routes.signUp,
  },
  'sign-up': {
    title: 'Create Account',
    subtitle: 'Join AstroThread to save your research journey.',
    verify: 'Create Account',
    verifying: 'Creating Account…',
    switchText: 'Already have an account?',
    switchLabel: 'Sign In',
    switchHref: routes.login,
  },
} as const

function validate(mode: Mode, step: Step, { name, email, code }: Values): FieldErrors {
  const errors: FieldErrors = {}
  if (step === 'code') {
    if (!CODE_PATTERN.test(code.trim())) errors.code = 'Enter the 6-digit code from the email.'
    return errors
  }
  if (mode === 'sign-up' && name.trim().length > MAX_NAME_LENGTH) {
    errors.name = `Use at most ${MAX_NAME_LENGTH} characters.`
  }
  if (!EMAIL_PATTERN.test(email.trim())) errors.email = 'Enter a valid email address.'
  return errors
}

/** Shown instead of a fake sign-in: Google sign-in has no backend support. */
const GOOGLE_NOT_CONNECTED =
  "Google sign-in isn't available yet. Sign in with your email instead."

function errorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === undefined || error.status >= 500) {
      return `${error.message} Please try again in a moment.`
    }
    // The server's messages are written for people, e.g. "No account found…".
    return error.message
  }
  return 'Something went wrong. Please try again.'
}

/** Figma "05-login-session" and "09-sign-up"; field states follow "08-login-form-states". */
function LoginPage({ mode }: { mode: Mode }) {
  const auth = useAuth()
  const copy = COPY[mode]
  const [step, setStep] = useState<Step>('email')
  const [values, setValues] = useState<Values>({ name: '', email: '', code: '' })
  const [remember, setRemember] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [resendIn, setResendIn] = useState(0)
  const refs = {
    name: useRef<HTMLInputElement>(null),
    email: useRef<HTMLInputElement>(null),
    code: useRef<HTMLInputElement>(null),
  }

  // Counts down until another code may be requested (the server enforces it too).
  useEffect(() => {
    if (resendIn <= 0) return
    const timer = window.setTimeout(() => setResendIn((seconds) => seconds - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [resendIn])

  // After the first submit, errors update as the user fixes the fields.
  function updateField(field: Field, value: string) {
    const next = { ...values, [field]: value }
    setValues(next)
    setNotice(null)
    if (submitted) setErrors(validate(mode, step, next))
  }

  async function sendCode() {
    const email = values.email.trim()
    setLoading(true)
    setNotice(null)
    try {
      await requestCode(email, mode === 'sign-up' ? 'signup' : 'login')
      setStep('code')
      setValues((current) => ({ ...current, code: '' }))
      setErrors({})
      setSubmitted(false)
      setResendIn(RESEND_WAIT_SECONDS)
      setNotice({
        kind: 'info',
        message: `We sent a 6-digit code to ${email}. It expires in 10 minutes.`,
      })
    } catch (error) {
      setNotice({ kind: 'error', message: errorMessage(error) })
      if (step === 'email') refs.email.current?.focus()
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading) return
    setSubmitted(true)
    const nextErrors = validate(mode, step, values)
    setErrors(nextErrors)
    setNotice(null)

    const firstInvalid = FIELD_ORDER.find((field) => nextErrors[field])
    if (firstInvalid) {
      refs[firstInvalid].current?.focus()
      return
    }

    if (step === 'email') {
      await sendCode()
      return
    }

    setLoading(true)
    try {
      const user = await signInWithCode(values.email.trim(), values.code.trim(), {
        name: values.name.trim(),
        remember,
      })
      // The destination comes from the role the server verified.
      navigate(homePathFor(user.role))
    } catch (error) {
      setLoading(false)
      setNotice({ kind: 'error', message: errorMessage(error) })
      if (error instanceof ApiError && error.status === 401) {
        setValues((current) => ({ ...current, code: '' }))
        refs.code.current?.focus()
      }
    }
  }

  function changeEmail() {
    setStep('email')
    setValues((current) => ({ ...current, code: '' }))
    setErrors({})
    setSubmitted(false)
    setNotice(null)
  }

  function renderField(field: Field, label: string, input: InputHTMLAttributes<HTMLInputElement>) {
    const id = `${mode}-${field}`
    return (
      <div className="login-field">
        <label className="login-field__label" htmlFor={id}>
          {label}
        </label>
        <input
          ref={refs[field]}
          id={id}
          className={`login-field__input${errors[field] ? ' login-field__input--invalid' : ''}`}
          name={field}
          value={values[field]}
          onChange={(event) => updateField(field, event.target.value)}
          aria-invalid={errors[field] ? true : undefined}
          aria-describedby={errors[field] ? `${id}-error` : undefined}
          {...input}
        />
        {errors[field] && (
          <p className="login-field__error" id={`${id}-error`}>
            <Icon name="error" />
            {errors[field]}
          </p>
        )}
      </div>
    )
  }

  const signedInAs = auth.status === 'signed-in' && !loading ? auth.user : null

  return (
    <main className="login-page">
      <section className="login-page__inner container" aria-labelledby={`${mode}-title`}>
        <form className="login-card" noValidate onSubmit={handleSubmit} aria-busy={loading}>
          <h1 className="login-card__title" id={`${mode}-title`}>
            {copy.title}
          </h1>
          <p className="login-card__subtitle">{copy.subtitle}</p>

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

          {step === 'email' ? (
            <>
              {mode === 'sign-up' &&
                renderField('name', 'Name (optional)', {
                  type: 'text',
                  autoComplete: 'name',
                  placeholder: 'Enter your name',
                })}
              {renderField('email', 'Email', {
                type: 'email',
                autoComplete: 'email',
                placeholder: 'Enter your email',
              })}
            </>
          ) : (
            renderField('code', 'Verification Code', {
              type: 'text',
              inputMode: 'numeric',
              autoComplete: 'one-time-code',
              maxLength: 6,
              placeholder: '6-digit code',
              autoFocus: true,
            })
          )}

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
            {step === 'code' && (
              <button
                type="button"
                className="login-card__link login-card__link-button"
                onClick={sendCode}
                disabled={loading || resendIn > 0}
              >
                {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
              </button>
            )}
          </div>

          <button
            type="submit"
            className="button button--primary login-card__submit"
            disabled={loading}
          >
            {loading && <span className="login-card__spinner" aria-hidden="true" />}
            {step === 'email'
              ? loading
                ? 'Sending Code…'
                : 'Send Code'
              : loading
                ? copy.verifying
                : copy.verify}
          </button>

          {step === 'code' ? (
            <p className="login-card__signup">
              Wrong email?
              <button
                type="button"
                className="login-card__signup-link login-card__link-button"
                onClick={changeEmail}
              >
                Use a different email
              </button>
            </p>
          ) : (
            <p className="login-card__signup">
              {copy.switchText}
              <Link className="login-card__signup-link" href={copy.switchHref}>
                {copy.switchLabel}
              </Link>
            </p>
          )}

          {mode === 'login' && (
            <>
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
            </>
          )}
        </form>
      </section>
    </main>
  )
}

export default LoginPage
