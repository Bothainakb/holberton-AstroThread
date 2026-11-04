import { useEffect, useState, type KeyboardEvent } from 'react'
import { useAuth } from '../../auth/auth'
import Link from '../../router/Link'
import { replacePath, routes, withReturnPath } from '../../router/router'
import { ApiError } from '../../services/api'
import { fetchAdminThreads, type AdminThread } from '../../services/adminApi'
import { adminErrorMessage } from './adminShared'
import ThreadsPanel, { type ThreadEditor } from './ThreadsPanel'
import TimelinePanel, { type EventEditor } from './TimelinePanel'
import './AdminDashboardPage.css'

const TABS = [
  { id: 'threads', label: 'Research threads' },
  { id: 'timeline', label: 'Timeline events' },
] as const
type Tab = (typeof TABS)[number]['id']

type Loaded =
  | { status: 'ready'; threads: AdminThread[] }
  | { status: 'forbidden' }
  | { status: 'error'; message: string }

function NoAccess() {
  return (
    <main className="admin-page">
      <div className="admin-status container" role="alert">
        <p>You don&apos;t have access to the Admin Dashboard.</p>
        <Link className="admin-button" href={routes.home}>
          Back to Home
        </Link>
      </div>
    </main>
  )
}

/** Figma "11-Owner-Dashboard", shown to people as the Admin Dashboard. */
function AdminDashboardPage() {
  const auth = useAuth()
  const isAdmin = auth.status === 'signed-in' && auth.user.role === 'owner'
  const signedOut = auth.status === 'signed-out'
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [tab, setTab] = useState<Tab>('threads')
  const [threadEditor, setThreadEditor] = useState<ThreadEditor>(null)
  const [eventEditor, setEventEditor] = useState<EventEditor>(null)
  const [timelineThreadId, setTimelineThreadId] = useState<number | null>(null)

  // Visitors are sent to Login and come back here afterwards.
  useEffect(() => {
    if (signedOut) replacePath(withReturnPath(routes.login, routes.adminDashboard))
  }, [signedOut])

  useEffect(() => {
    if (!isAdmin) return
    const controller = new AbortController()
    fetchAdminThreads(controller.signal)
      .then((threads) => setLoaded({ status: 'ready', threads }))
      .catch((failure: unknown) => {
        if (controller.signal.aborted) return
        if (failure instanceof ApiError && failure.status === 403) {
          setLoaded({ status: 'forbidden' })
          return
        }
        setLoaded({
          status: 'error',
          message: adminErrorMessage(failure, 'The research threads could not be loaded.'),
        })
      })
    return () => controller.abort()
  }, [isAdmin, attempt])

  if (auth.status === 'signed-in' && !isAdmin) return <NoAccess />
  if (loaded?.status === 'forbidden') return <NoAccess />

  if (!isAdmin || !loaded) {
    return (
      <main className="admin-page" aria-busy="true">
        <p className="admin-status container" role="status">
          Loading the Admin Dashboard…
        </p>
      </main>
    )
  }

  const threads = loaded.status === 'ready' ? loaded.threads : []
  const selectedThread = threads.find((thread) => thread.id === timelineThreadId) ?? threads[0]

  function reload() {
    setAttempt((value) => value + 1)
  }

  function selectTab(next: Tab) {
    setTab(next)
    document.getElementById(`admin-tab-${next}`)?.focus()
  }

  function handleTabKey(event: KeyboardEvent) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    selectTab(tab === 'threads' ? 'timeline' : 'threads')
  }

  return (
    <main className="admin-page">
      <header className="admin-header container">
        <div>
          <span className="admin-header__role">Role: Admin</span>
          <h1 className="admin-header__title">Admin Dashboard</h1>
          <p className="admin-header__text">Create, edit and delete the research content users see.</p>
        </div>
        {tab === 'threads' ? (
          <button
            type="button"
            className="admin-button admin-button--primary"
            onClick={() => setThreadEditor('new')}
          >
            + New research thread
          </button>
        ) : (
          <button
            type="button"
            className="admin-button admin-button--primary"
            disabled={!selectedThread}
            onClick={() => setEventEditor('new')}
          >
            + New timeline event
          </button>
        )}
      </header>

      <div className="admin-body container">
        <div className="admin-tabs" role="tablist" aria-label="Admin sections" onKeyDown={handleTabKey}>
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`admin-tab-${id}`}
              className="admin-tabs__tab"
              aria-selected={tab === id}
              aria-controls="admin-panel"
              tabIndex={tab === id ? 0 : -1}
              onClick={() => selectTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

        <div role="tabpanel" id="admin-panel" aria-labelledby={`admin-tab-${tab}`}>
          {loaded.status === 'error' ? (
            <div className="admin-card admin-empty" role="alert">
              <p>{loaded.message}</p>
              <button type="button" className="admin-button" onClick={reload}>
                Try again
              </button>
            </div>
          ) : tab === 'threads' ? (
            <ThreadsPanel
              threads={threads}
              editor={threadEditor}
              onEditorChange={setThreadEditor}
              onChanged={reload}
            />
          ) : selectedThread ? (
            <TimelinePanel
              threads={threads}
              threadId={selectedThread.id}
              onThreadChange={setTimelineThreadId}
              editor={eventEditor}
              onEditorChange={setEventEditor}
            />
          ) : (
            <p className="admin-card admin-empty">Create a research thread first.</p>
          )}
        </div>
      </div>
    </main>
  )
}

export default AdminDashboardPage
