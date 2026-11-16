import { useCallback, useEffect, useState } from 'react'
import { restoreSession, useAuth } from '../../auth/auth'
import {
  ApiError,
  fetchBookmarks,
  fetchProfile,
  removeBookmark,
  updateProfile,
  type Profile,
  type ProfileChanges,
  type SavedThread,
} from '../../services/api'

export type ProfileState =
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'error'; message: string }
  | { status: 'ready'; profile: Profile }

function isSessionError(error: unknown) {
  return error instanceof ApiError && error.status === 401
}

function messageFor(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback
}

/**
 * The signed-in user's profile from GET /api/profile, plus the actions the
 * page offers. A 401 means the session ended: the auth state is refreshed,
 * which switches the page to its signed-out state.
 */
export function useProfile() {
  const auth = useAuth()
  const userId = auth.status === 'signed-in' ? auth.user.id : null
  const [loaded, setLoaded] = useState<{ userId: number; state: ProfileState } | null>(null)
  const [attempt, setAttempt] = useState(0)

  const handleSessionError = useCallback((error: unknown) => {
    if (!isSessionError(error)) return false
    void restoreSession()
    return true
  }, [])

  useEffect(() => {
    if (userId === null) return
    const controller = new AbortController()

    fetchProfile(controller.signal)
      .then((profile) => setLoaded({ userId, state: { status: 'ready', profile } }))
      .catch((error: unknown) => {
        if (controller.signal.aborted || handleSessionError(error)) return
        setLoaded({
          userId,
          state: { status: 'error', message: messageFor(error, 'Your profile could not be loaded.') },
        })
      })

    return () => controller.abort()
  }, [userId, attempt, handleSessionError])

  let state: ProfileState
  if (auth.status === 'loading') state = { status: 'loading' }
  else if (auth.status === 'signed-out') state = { status: 'signed-out' }
  else if (loaded?.userId !== userId) state = { status: 'loading' }
  else state = loaded.state

  const profile = state.status === 'ready' ? state.profile : null

  /** Reloads everything (after removing a saved thread, for example). */
  const reload = useCallback(() => setAttempt((value) => value + 1), [])

  /** PATCH /api/profile; resolves with an error message, or null when saved. */
  async function saveChanges(changes: ProfileChanges): Promise<string | null> {
    if (!profile || userId === null) return 'Your profile is not loaded yet.'
    try {
      const account = await updateProfile(changes)
      setLoaded((current) =>
        current?.state.status === 'ready'
          ? { userId, state: { status: 'ready', profile: { ...current.state.profile, ...account } } }
          : current,
      )
      return null
    } catch (error) {
      if (handleSessionError(error)) return 'Your session has ended. Sign in again.'
      return messageFor(error, 'Your changes could not be saved.')
    }
  }

  /** DELETE /api/bookmarks/:id, then reloads the profile counts and lists. */
  async function removeSaved(threadId: number): Promise<string | null> {
    try {
      await removeBookmark(threadId)
    } catch (error) {
      if (handleSessionError(error)) return 'Your session has ended. Sign in again.'
      // Already removed (for example in another tab): just refresh the list.
      if (!(error instanceof ApiError && error.status === 404)) {
        return messageFor(error, 'The thread could not be removed.')
      }
    }
    reload()
    return null
  }

  /** Every saved thread, for "View all saved" (the profile only includes the newest 3). */
  async function loadAllSaved(): Promise<SavedThread[] | string> {
    try {
      return await fetchBookmarks()
    } catch (error) {
      if (handleSessionError(error)) return 'Your session has ended. Sign in again.'
      return messageFor(error, 'Your saved threads could not be loaded.')
    }
  }

  return { state, reload, saveChanges, removeSaved, loadAllSaved }
}
