import { useEffect, useState } from 'react'
import { restoreSession, useAuth } from '../../auth/auth'
import {
  addPaperBookmark,
  ApiError,
  fetchPaperBookmarks,
  removePaperBookmark,
  type PaperRef,
} from '../../services/api'
import type { BookmarkNotice } from './useThreadBookmark'

/** One saved paper, by its database id and/or OpenAlex id (whichever is known). */
interface SavedEntry {
  paperId: number | null
  openalexId: string | null
}

export type PaperBookmarksStatus = 'unavailable' | 'loading' | 'signed-out' | 'ready' | 'error'

export interface PaperBookmarks {
  status: PaperBookmarksStatus
  isSaved: (paper: PaperRef) => boolean
  isPending: (paper: PaperRef) => boolean
  toggle: (paper: PaperRef) => void
  notice: BookmarkNotice | null
}

const SIGN_IN = 'Sign in to save research papers to your profile.'
const SESSION_ENDED = 'Your session has ended. Sign in again to save research papers.'

function refKey(paper: PaperRef) {
  return 'paperId' in paper ? `paper:${paper.paperId}` : `openalex:${paper.openalexId}`
}

function matches(entry: SavedEntry, paper: PaperRef) {
  return 'paperId' in paper ? entry.paperId === paper.paperId : entry.openalexId === paper.openalexId
}

function isSessionError(error: unknown) {
  return error instanceof ApiError && error.status === 401
}

function errorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : 'Something went wrong.'
}

/**
 * The signed-in user's saved papers (GET /api/bookmarks/papers), for the paper
 * cards of one database thread. toggle() saves or removes a paper straight
 * away (the icon changes before the server answers) and puts it back if the
 * request fails. Visitors get a sign-in prompt instead; nothing is saved.
 */
export function usePaperBookmarks(threadId: number | null): PaperBookmarks {
  const auth = useAuth()
  const userId = auth.status === 'signed-in' ? auth.user.id : null
  // Results only count for the user and thread that produced them.
  const key = `${userId}:${threadId}`
  const [attempt, setAttempt] = useState(0)
  const [loaded, setLoaded] = useState<{ key: string; saved: SavedEntry[] } | { key: string; error: string }>()
  const [pending, setPending] = useState<string[]>([])
  const [notice, setNotice] = useState<(BookmarkNotice & { key: string }) | null>(null)

  useEffect(() => {
    if (userId === null || threadId === null) return
    const controller = new AbortController()

    fetchPaperBookmarks(controller.signal)
      .then((papers) =>
        setLoaded({
          key,
          saved: papers.map((paper) => ({ paperId: paper.paper_id, openalexId: paper.openalex_id })),
        }),
      )
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        if (isSessionError(error)) {
          void restoreSession()
          return
        }
        setLoaded({ key, error: errorMessage(error) })
      })

    return () => controller.abort()
  }, [userId, threadId, key, attempt])

  const current = loaded?.key === key ? loaded : undefined
  const status: PaperBookmarksStatus =
    threadId === null
      ? 'unavailable'
      : auth.status === 'signed-out'
        ? 'signed-out'
        : auth.status !== 'signed-in' || current === undefined
          ? 'loading'
          : 'error' in current
            ? 'error'
            : 'ready'
  const saved = current && 'saved' in current ? current.saved : []

  function update(change: (entries: SavedEntry[]) => SavedEntry[]) {
    setLoaded((value) => (value && value.key === key && 'saved' in value ? { key, saved: change(value.saved) } : value))
  }

  async function toggle(paper: PaperRef) {
    if (status === 'signed-out') {
      setNotice({ key, kind: 'sign-in', message: SIGN_IN })
      return
    }
    if (status === 'error') {
      setNotice(null)
      setAttempt((value) => value + 1)
      return
    }
    const id = refKey(paper)
    if (status !== 'ready' || pending.includes(id)) return

    const entry = saved.find((item) => matches(item, paper))
    setPending((ids) => [...ids, id])
    setNotice(null)

    try {
      if (entry) {
        update((entries) => entries.filter((item) => item !== entry))
        // An OpenAlex paper saved here has its database id once the server answered.
        if (entry.paperId === null) throw new ApiError('Please wait a moment and try again.')
        await removePaperBookmark(entry.paperId)
        setNotice({ key, kind: 'done', message: 'Removed from your saved papers.' })
      } else {
        const added: SavedEntry = {
          paperId: 'paperId' in paper ? paper.paperId : null,
          openalexId: 'openalexId' in paper ? paper.openalexId : null,
        }
        update((entries) => [...entries, added])
        const paperId = await addPaperBookmark(paper, threadId)
        update((entries) => entries.map((item) => (item === added ? { ...item, paperId } : item)))
        setNotice({ key, kind: 'done', message: 'Saved to your papers.' })
      }
    } catch (error) {
      // Put the icon back as it was.
      update((entries) => (entry ? [...entries, entry] : entries.filter((item) => !matches(item, paper))))
      if (isSessionError(error)) {
        void restoreSession()
        setNotice({ key, kind: 'sign-in', message: SESSION_ENDED })
      } else {
        setNotice({
          key,
          kind: 'error',
          message: `${entry ? 'The paper could not be removed' : 'The paper could not be saved'}: ${errorMessage(error)}`,
        })
      }
    } finally {
      setPending((ids) => ids.filter((item) => item !== id))
    }
  }

  return {
    status,
    isSaved: (paper) => saved.some((item) => matches(item, paper)),
    isPending: (paper) => pending.includes(refKey(paper)),
    toggle: (paper) => void toggle(paper),
    notice: notice?.key === key ? notice : null,
  }
}
