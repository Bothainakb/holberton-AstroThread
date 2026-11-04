import { useState } from 'react'
import Tag from '../../components/Tag/Tag'
import {
  createAdminThread,
  deleteAdminThread,
  updateAdminThread,
  type AdminThread,
} from '../../services/adminApi'
import { adminErrorMessage, AdminDeleteCard, AdminFormCard, formatAdminDate } from './adminShared'

// Same limits as backend/app/api/v1/owner_threads.py, which checks them again.
const MAX_TITLE = 150
const MAX_DESCRIPTION = 5000
const CATEGORIES = ['Astronomy', 'Astrophysics', 'Cosmology', 'Physics']

/** Null: no form. "new": creating a thread. Otherwise the thread being edited. */
export type ThreadEditor = 'new' | AdminThread | null

function ThreadForm({
  thread,
  onSaved,
  onCancel,
}: {
  thread: AdminThread | null
  onSaved: (title: string) => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState(thread?.title ?? '')
  const [category, setCategory] = useState(thread?.category ?? CATEGORIES[0])
  const [description, setDescription] = useState(thread?.description ?? '')
  const [featured, setFeatured] = useState(thread?.is_featured ?? false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Keeps a category the list doesn't have, so editing never changes it silently.
  const categories = CATEGORIES.includes(category) ? CATEGORIES : [category, ...CATEGORIES]

  async function save() {
    if (!title.trim() || !description.trim()) {
      setError('Enter a title and a summary.')
      return
    }
    setSaving(true)
    setError(null)
    const fields = {
      title: title.trim(),
      category,
      description: description.trim(),
      is_featured: featured,
    }
    try {
      if (thread) await updateAdminThread(thread.id, fields)
      else await createAdminThread(fields)
      onSaved(fields.title)
    } catch (failure) {
      setSaving(false)
      setError(adminErrorMessage(failure, 'The thread could not be saved.'))
    }
  }

  return (
    <AdminFormCard
      title={thread ? 'Edit research thread' : 'New research thread'}
      description={thread ? 'Changes appear for all users.' : 'It appears for all users once saved.'}
      saveLabel={thread ? 'Save changes' : 'Create thread'}
      saving={saving}
      error={error}
      onSubmit={save}
      onCancel={onCancel}
    >
      <label className="admin-field">
        <span>Title</span>
        <input
          className="admin-input"
          value={title}
          maxLength={MAX_TITLE}
          autoFocus
          onChange={(event) => setTitle(event.target.value)}
        />
      </label>
      <label className="admin-field">
        <span>Category</span>
        <select className="admin-input" value={category} onChange={(event) => setCategory(event.target.value)}>
          {categories.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </label>
      <label className="admin-field">
        <span>Summary</span>
        <textarea
          className="admin-input admin-input--area"
          value={description}
          maxLength={MAX_DESCRIPTION}
          onChange={(event) => setDescription(event.target.value)}
        />
      </label>
      <label className="admin-check">
        <input type="checkbox" checked={featured} onChange={(event) => setFeatured(event.target.checked)} />
        Show as a featured thread on Home
      </label>
    </AdminFormCard>
  )
}

/** "Research threads" tab of Figma "11-Owner-Dashboard". */
function ThreadsPanel({
  threads,
  editor,
  onEditorChange,
  onChanged,
}: {
  threads: AdminThread[]
  editor: ThreadEditor
  onEditorChange: (editor: ThreadEditor) => void
  /** Reloads the list after a change. */
  onChanged: () => void
}) {
  const [deleting, setDeleting] = useState<AdminThread | null>(null)
  const [busy, setBusy] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  function askDelete(thread: AdminThread) {
    setDeleting(thread)
    setDeleteError(null)
    setMessage('')
    if (editor !== 'new' && editor?.id === thread.id) onEditorChange(null)
  }

  async function confirmDelete() {
    if (!deleting) return
    setBusy(true)
    setDeleteError(null)
    try {
      await deleteAdminThread(deleting.id)
      setMessage(`Deleted "${deleting.title}".`)
      setDeleting(null)
      onChanged()
    } catch (failure) {
      setDeleteError(adminErrorMessage(failure, 'The thread could not be deleted.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <p className="admin-live" role="status">
        {message}
      </p>

      {threads.length === 0 ? (
        <p className="admin-card admin-empty">No research threads yet. Create the first one.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">Title</th>
                <th scope="col">Category</th>
                <th scope="col">Featured</th>
                <th scope="col">Last updated</th>
                <th scope="col" className="admin-table__actions">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {threads.map((thread) => {
                const selected =
                  deleting?.id === thread.id || (editor !== 'new' && editor?.id === thread.id)
                return (
                  <tr key={thread.id} className={selected ? 'admin-table__row--selected' : undefined}>
                    <th scope="row">{thread.title}</th>
                    <td>
                      <Tag>{thread.category}</Tag>
                    </td>
                    <td>{thread.is_featured ? 'Yes' : 'No'}</td>
                    <td>{formatAdminDate(thread.updated_at)}</td>
                    <td className="admin-table__actions">
                      <button
                        type="button"
                        className="admin-button admin-button--small"
                        aria-label={`Edit ${thread.title}`}
                        onClick={() => {
                          setDeleting(null)
                          setMessage('')
                          onEditorChange(thread)
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="admin-button admin-button--small admin-button--danger"
                        aria-label={`Delete ${thread.title}`}
                        onClick={() => askDelete(thread)}
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

      <p className="admin-note">
        {threads.length} research {threads.length === 1 ? 'thread' : 'threads'} · Related papers come
        from OpenAlex and are not edited here.
      </p>

      {(editor || deleting) && (
        <div className="admin-panels">
          {editor && (
            <ThreadForm
              key={editor === 'new' ? 'new' : editor.id}
              thread={editor === 'new' ? null : editor}
              onSaved={(title) => {
                setMessage(`Saved "${title}".`)
                onEditorChange(null)
                onChanged()
              }}
              onCancel={() => onEditorChange(null)}
            />
          )}
          {deleting && (
            <AdminDeleteCard
              key={deleting.id}
              title={`Delete "${deleting.title}"?`}
              description="The thread and its timeline events will be removed for all users. This cannot be undone."
              confirmLabel="Delete thread"
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

export default ThreadsPanel
