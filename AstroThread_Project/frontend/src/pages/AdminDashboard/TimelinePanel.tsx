import { useEffect, useState } from 'react'
import {
  createAdminEvent,
  deleteAdminEvent,
  fetchAdminEvents,
  updateAdminEvent,
  type AdminEvent,
  type AdminThread,
} from '../../services/adminApi'
import { adminErrorMessage, AdminDeleteCard, AdminFormCard } from './adminShared'

// Same limits as backend/app/api/v1/owner_threads.py, which checks them again.
const MIN_YEAR = -3000
const MAX_YEAR = 2100
const MAX_TITLE = 150
const MAX_DESCRIPTION = 2000
const MAX_SOURCE = 200
const MAX_URL = 500
const URL_PATTERN = /^https?:\/\/\S+$/

/** Null: no form. "new": adding an event. Otherwise the event being edited. */
export type EventEditor = 'new' | AdminEvent | null

function EventForm({
  threadId,
  event: original,
  onSaved,
  onCancel,
}: {
  threadId: number
  event: AdminEvent | null
  onSaved: (title: string) => void
  onCancel: () => void
}) {
  const [year, setYear] = useState(original ? String(original.year) : '')
  const [title, setTitle] = useState(original?.title ?? '')
  const [description, setDescription] = useState(original?.description ?? '')
  const [sourceName, setSourceName] = useState(original?.source_name ?? '')
  const [sourceUrl, setSourceUrl] = useState(original?.source_url ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    const parsedYear = Number(year)
    if (!/^-?\d+$/.test(year.trim()) || parsedYear < MIN_YEAR || parsedYear > MAX_YEAR) {
      setError(`Enter a year from ${MIN_YEAR} to ${MAX_YEAR}.`)
      return
    }
    if (!title.trim()) {
      setError('Enter a title.')
      return
    }
    if (sourceUrl.trim() && !URL_PATTERN.test(sourceUrl.trim())) {
      setError('The source link must start with http:// or https://.')
      return
    }

    setSaving(true)
    setError(null)
    const fields = {
      year: parsedYear,
      title: title.trim(),
      description: description.trim() || null,
      source_name: sourceName.trim() || null,
      source_url: sourceUrl.trim() || null,
    }
    try {
      if (original) await updateAdminEvent(original.id, fields)
      else await createAdminEvent(threadId, fields)
      onSaved(fields.title)
    } catch (failure) {
      setSaving(false)
      setError(adminErrorMessage(failure, 'The event could not be saved.'))
    }
  }

  return (
    <AdminFormCard
      title={original ? 'Edit timeline event' : 'New timeline event'}
      description="Shown on the thread's timeline for all users."
      saveLabel={original ? 'Save changes' : 'Add event'}
      saving={saving}
      error={error}
      onSubmit={save}
      onCancel={onCancel}
    >
      <label className="admin-field">
        <span>Year</span>
        <input
          className="admin-input"
          inputMode="numeric"
          value={year}
          autoFocus
          onChange={(event) => setYear(event.target.value)}
        />
      </label>
      <label className="admin-field">
        <span>Title</span>
        <input
          className="admin-input"
          value={title}
          maxLength={MAX_TITLE}
          onChange={(event) => setTitle(event.target.value)}
        />
      </label>
      <label className="admin-field">
        <span>Description (optional)</span>
        <textarea
          className="admin-input admin-input--area"
          value={description}
          maxLength={MAX_DESCRIPTION}
          onChange={(event) => setDescription(event.target.value)}
        />
      </label>
      <label className="admin-field">
        <span>Source name (optional)</span>
        <input
          className="admin-input"
          value={sourceName}
          maxLength={MAX_SOURCE}
          onChange={(event) => setSourceName(event.target.value)}
        />
      </label>
      <label className="admin-field">
        <span>Source link (optional)</span>
        <input
          className="admin-input"
          type="url"
          placeholder="https://"
          value={sourceUrl}
          maxLength={MAX_URL}
          onChange={(event) => setSourceUrl(event.target.value)}
        />
      </label>
    </AdminFormCard>
  )
}

/** "Timeline events" tab: one selected thread's events. Same style as the threads tab. */
function TimelinePanel({
  threads,
  threadId,
  onThreadChange,
  editor,
  onEditorChange,
}: {
  threads: AdminThread[]
  threadId: number
  onThreadChange: (threadId: number) => void
  editor: EventEditor
  onEditorChange: (editor: EventEditor) => void
}) {
  const [loaded, setLoaded] = useState<{ key: string; events: AdminEvent[] | null; error: string | null }>()
  const [attempt, setAttempt] = useState(0)
  const [deleting, setDeleting] = useState<AdminEvent | null>(null)
  const [busy, setBusy] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const key = `${threadId}:${attempt}`

  useEffect(() => {
    const controller = new AbortController()
    fetchAdminEvents(threadId, controller.signal)
      .then((events) => setLoaded({ key, events, error: null }))
      .catch((failure: unknown) => {
        if (controller.signal.aborted) return
        const error = adminErrorMessage(failure, 'The timeline events could not be loaded.')
        setLoaded({ key, events: null, error })
      })
    return () => controller.abort()
  }, [key, threadId])

  // After saving, the old list stays visible until the new one arrives.
  const current = loaded && loaded.key.startsWith(`${threadId}:`) ? loaded : null
  const events = current?.events ?? null

  function reload() {
    setAttempt((value) => value + 1)
  }

  function selectThread(id: number) {
    onThreadChange(id)
    onEditorChange(null)
    setDeleting(null)
    setMessage('')
  }

  async function confirmDelete() {
    if (!deleting) return
    setBusy(true)
    setDeleteError(null)
    try {
      await deleteAdminEvent(deleting.id)
      setMessage(`Deleted "${deleting.title}".`)
      setDeleting(null)
      reload()
    } catch (failure) {
      setDeleteError(adminErrorMessage(failure, 'The event could not be deleted.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <label className="admin-field admin-field--thread">
        <span>Research thread</span>
        <select
          className="admin-input"
          value={threadId}
          onChange={(event) => selectThread(Number(event.target.value))}
        >
          {threads.map((thread) => (
            <option key={thread.id} value={thread.id}>
              {thread.title}
            </option>
          ))}
        </select>
      </label>

      <p className="admin-live" role="status">
        {message}
      </p>

      {current?.error ? (
        <div className="admin-card admin-empty" role="alert">
          <p>{current.error}</p>
          <button type="button" className="admin-button" onClick={reload}>
            Try again
          </button>
        </div>
      ) : !events ? (
        <p className="admin-card admin-empty" role="status">
          Loading timeline events…
        </p>
      ) : events.length === 0 ? (
        <p className="admin-card admin-empty">This thread has no timeline events yet.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">Year</th>
                <th scope="col">Title</th>
                <th scope="col">Source</th>
                <th scope="col" className="admin-table__actions">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => {
                const selected =
                  deleting?.id === event.id || (editor !== 'new' && editor?.id === event.id)
                return (
                  <tr key={event.id} className={selected ? 'admin-table__row--selected' : undefined}>
                    <td>{event.year}</td>
                    <th scope="row">{event.title}</th>
                    <td>{event.source_name ?? '—'}</td>
                    <td className="admin-table__actions">
                      <button
                        type="button"
                        className="admin-button admin-button--small"
                        aria-label={`Edit ${event.title}`}
                        onClick={() => {
                          setDeleting(null)
                          setMessage('')
                          onEditorChange(event)
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="admin-button admin-button--small admin-button--danger"
                        aria-label={`Delete ${event.title}`}
                        onClick={() => {
                          setDeleting(event)
                          setDeleteError(null)
                          setMessage('')
                          if (editor !== 'new' && editor?.id === event.id) onEditorChange(null)
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {events && (
        <p className="admin-note">
          {events.length} timeline {events.length === 1 ? 'event' : 'events'}
        </p>
      )}

      {(editor || deleting) && (
        <div className="admin-panels">
          {editor && (
            <EventForm
              key={editor === 'new' ? 'new' : editor.id}
              threadId={threadId}
              event={editor === 'new' ? null : editor}
              onSaved={(title) => {
                setMessage(`Saved "${title}".`)
                onEditorChange(null)
                reload()
              }}
              onCancel={() => onEditorChange(null)}
            />
          )}
          {deleting && (
            <AdminDeleteCard
              key={deleting.id}
              title={`Delete "${deleting.title}"?`}
              description="The event will be removed from this thread's timeline for all users. This cannot be undone."
              confirmLabel="Delete event"
              deleting={busy}
              error={deleteError}
              onConfirm={confirmDelete}
              onCancel={() => setDeleting(null)}
            />
          )}
        </div>
      )}
    </>
  )
}

export default TimelinePanel
