import { useEffect, useState } from 'react'
import { restoreSession, useAuth } from '../../auth/auth'
import {
  addBookmark,
  ApiError,
  EndpointUnavailableError,
  fetchBookmarks,
  removeBookmark,
} from '../../services/api'

export type BookmarkState =
  /** The thread is not in the database, so it cannot be saved. */
  | { status: 'unavailable' }
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'ready'; saved: boolean; pending: boolean }
  /** Whether the thread is saved could not be loaded. */
  | { status: 'error'; message: string }

/** A message under the button, e.g. the sign-in prompt for visitors. */
export type BookmarkNotice =
  | { kind: 'sign-in'; message: string }
  | { kind: 'error'; message: string }
  | { kind: 'done'; message: string }

const SIGN_IN = 'Sign in to save research threads to your profile.'
const SESSION_ENDED = 'Your session has ended. Sign in again to save research threads.'

function isSessionError(error: unknown) {
  return error instanceof ApiError && error.status === 401
}

/**
 * Saved state of one database thread for the signed-in user, from
 * GET /api/bookmarks. toggle() saves or removes it straight away (the icon
 * changes before the server answers) and puts it back if the request fails.
 * Visitors get a sign-in prompt instead; nothing is saved for them.
 */
export function useThreadBookmark(threadId: number | null) {
  const auth = useAuth()
  const userId = auth.status === 'signed-in' ? auth.user.id : null
  // Results only count for the user and thread that produced them.
  const key = `${userId}:${threadId}`
  const [attempt, setAttempt] = useState(0)
  const [loaded, setLoaded] = useState<
    { key: string; saved: boolean } | { key: string; error: string }
  >()
  const [pending, setPending] = useState<string | null>(null)
  const [notice, setNotice] = useState<(BookmarkNotice & { key: string }) | null>(null)

  useEffect(() => {
    if (userId === null || threadId === null) return
    const controller = new AbortController()

    fetchBookmarks(controller.signal)
      .then((threads) => setLoaded({ key, saved: threads.some((thread) => thread.id === threadId) }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        if (isSessionError(error)) {
          // The UI thought it was signed in; refresh it, which shows the prompt.
          setNotice({ key: `null:${threadId}`, kind: 'sign-in', message: SESSION_ENDED })
          void restoreSession()
          return
        }
        const message =
          error instanceof ApiError && !(error instanceof EndpointUnavailableError)
            ? error.message
            : 'Saved threads are not available right now.'
        setLoaded({ key, error: message })
      })

    return () => controller.abort()
  }, [key, userId, threadId, attempt])

  let state: BookmarkState
  if (threadId === null) state = { status: 'unavailable' }
  else if (auth.status === 'loading') state = { status: 'loading' }
  else if (auth.status === 'signed-out') state = { status: 'signed-out' }
  else if (loaded?.key !== key) state = { status: 'loading' }
  else if ('error' in loaded) state = { status: 'error', message: loaded.error }
  else state = { status: 'ready', saved: loaded.saved, pending: pending === key }

  async function toggle() {
    if (threadId === null) return
    if (state.status === 'signed-out') {
      setNotice({ key, kind: 'sign-in', message: SIGN_IN })
      return
    }
    if (state.status === 'error') {
      setNotice(null)
      setAttempt((value) => value + 1)
      return
    }
    if (state.status !== 'ready' || state.pending) return

    const next = !state.saved
    setLoaded({ key, saved: next })
    setPending(key)
    setNotice(null)
    try {
      if (next) await addBookmark(threadId)
      else await removeBookmark(threadId)
      setNotice({
        key,
        kind: 'done',
        message: next ? 'Saved to your research threads.' : 'Removed from your saved threads.',
      })
    } catch (error) {
      const alreadyRemoved =
        !next &&
        error instanceof ApiError &&
        error.status === 404 &&
        !(error instanceof EndpointUnavailableError)
      if (alreadyRemoved) {
        setNotice({ key, kind: 'done', message: 'Removed from your saved threads.' })
      } else {
        setLoaded({ key, saved: !next })
        if (isSessionError(error)) {
          setNotice({ key: `null:${threadId}`, kind: 'sign-in', message: SESSION_ENDED })
          void restoreSession()
        } else {
          const reason = error instanceof ApiError ? error.message : 'Please try again.'
          setNotice({
            key,
            kind: 'error',
            message: `${next ? 'The thread could not be saved' : 'The thread could not be removed'}: ${reason}`,
          })
        }
      }
    } finally {
      setPending(null)
    }
  }

  return {
    state,
    notice: notice?.key === key ? (notice as BookmarkNotice) : null,
    toggle,
  }
}
