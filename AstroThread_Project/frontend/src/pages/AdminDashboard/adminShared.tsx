import { useEffect, useRef, type FormEvent, type ReactNode } from 'react'
import { restoreSession } from '../../auth/auth'
import { ApiError } from '../../services/api'

export function adminErrorMessage(error: unknown, fallback: string) {
  // The session ended: refreshing it sends the page back to Login.
  if (error instanceof ApiError && error.status === 401) void restoreSession()
  return error instanceof ApiError ? error.message : fallback
}

/** "7 Oct 2026" (Figma), or a dash for a missing or unreadable date. */
export function formatAdminDate(value: string | null) {
  const date = value ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

/** Card holding the create/edit form; it scrolls into view when it opens. */
export function AdminFormCard({
  title,
  description,
  saveLabel,
  saving,
  error,
  onSubmit,
  onCancel,
  children,
}: {
  title: string
  description: string
  saveLabel: string
  saving: boolean
  error: string | null
  onSubmit: () => void
  onCancel: () => void
  children: ReactNode
}) {
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    formRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!saving) onSubmit()
  }

  return (
    <form ref={formRef} className="admin-card admin-form" noValidate onSubmit={handleSubmit} aria-busy={saving}>
      <h2 className="admin-card__title">{title}</h2>
      <p className="admin-card__text">{description}</p>
      {error && (
        <p className="admin-form__error" role="alert">
          {error}
        </p>
      )}
      {children}
      <div className="admin-card__actions">
        <button type="submit" className="admin-button admin-button--primary" disabled={saving}>
          {saving ? 'Saving…' : saveLabel}
        </button>
        <button type="button" className="admin-button" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  )
}

/** Confirmation shown after clicking Delete on a row. */
export function AdminDeleteCard({
  title,
  description,
  confirmLabel,
  deleting,
  error,
  onConfirm,
  onCancel,
}: {
  title: string
  description: string
  confirmLabel: string
  deleting: boolean
  error: string | null
  onConfirm: () => void
  onCancel: () => void
}) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  // Focus starts on the safe choice.
  useEffect(() => {
    cancelRef.current?.focus()
  }, [])

  return (
    <div
      className="admin-card admin-card--danger"
      role="alertdialog"
      aria-labelledby="admin-delete-title"
      aria-describedby="admin-delete-text"
    >
      <h2 className="admin-card__title" id="admin-delete-title">
        {title}
      </h2>
      <p className="admin-card__text" id="admin-delete-text">
        {description}
      </p>
      {error && (
        <p className="admin-form__error" role="alert">
          {error}
        </p>
      )}
      <div className="admin-card__actions">
        <button
          type="button"
          className="admin-button admin-button--danger-solid"
          onClick={onConfirm}
          disabled={deleting}
        >
          {deleting ? 'Deleting…' : confirmLabel}
        </button>
        <button type="button" className="admin-button" ref={cancelRef} onClick={onCancel} disabled={deleting}>
          Cancel
        </button>
      </div>
    </div>
  )
}
