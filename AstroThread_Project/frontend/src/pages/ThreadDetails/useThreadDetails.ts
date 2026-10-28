import { useEffect, useState } from 'react'
import {
  ApiError,
  EndpointUnavailableError,
  fetchThreadDetails,
  fetchThreads,
  type ApiThreadDetails,
} from '../../services/api'

export type ThreadDetailsState =
  | { status: 'loading' }
  | { status: 'ready'; details: ApiThreadDetails }
  /** The thread is only in the frontend list, not in the database. */
  | { status: 'not-in-database' }
  /** The server has no GET /api/threads/:id route yet. */
  | { status: 'unavailable' }
  | { status: 'error'; message: string }

/**
 * Loads a thread from the API. Pages use slugs ("black-holes") and the
 * database uses numeric ids, so the thread is found in GET /api/threads by
 * its title first, then loaded with GET /api/threads/:id.
 */
export function useThreadDetails(title: string) {
  const [attempt, setAttempt] = useState(0)
  // The result remembers which request produced it, so a retry or another
  // thread shows the loading state until its own response arrives.
  const [result, setResult] = useState<ThreadDetailsState & { request: string }>()
  const request = `${attempt}:${title}`

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller

    async function load(): Promise<ThreadDetailsState> {
      const threads = await fetchThreads({ signal })
      const match = threads.find((thread) => thread.title.toLowerCase() === title.toLowerCase())
      if (!match) return { status: 'not-in-database' }
      return { status: 'ready', details: await fetchThreadDetails(match.id, signal) }
    }

    load()
      .then((state) => setResult({ request, ...state }))
      .catch((error: unknown) => {
        if (signal.aborted) return
        if (error instanceof EndpointUnavailableError) {
          setResult({ request, status: 'unavailable' })
        } else if (error instanceof ApiError && error.status === 404) {
          setResult({ request, status: 'not-in-database' })
        } else {
          const message =
            error instanceof ApiError ? error.message : 'Something went wrong while loading this thread.'
          setResult({ request, status: 'error', message })
        }
      })

    return () => controller.abort()
  }, [title, request])

  const state: ThreadDetailsState = result?.request === request ? result : { status: 'loading' }
  return { state, retry: () => setAttempt((value) => value + 1) }
}
