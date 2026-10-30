import { useEffect, useState } from 'react'
import {
  ApiError,
  EndpointUnavailableError,
  fetchThreadDetails,
  fetchThreads,
  type ApiThreadDetails,
} from '../../services/api'
import { findThreadForRoute } from './threadRoute'

export type ThreadDetailsState =
  | { status: 'loading' }
  | { status: 'ready'; details: ApiThreadDetails }
  /** No database thread has this id or slug. */
  | { status: 'not-in-database' }
  /** The server has no GET /api/threads/:id route yet. */
  | { status: 'unavailable' }
  | { status: 'error'; message: string }

/**
 * Loads the thread a "/research-threads/:id" URL names. The URL holds a slug
 * ("black-holes") or a database id ("1"); the thread is looked up in
 * GET /api/threads (findThreadForRoute), then loaded with GET /api/threads/:id.
 */
export async function loadThreadDetails(
  routeId: string,
  signal?: AbortSignal,
): Promise<ThreadDetailsState> {
  try {
    const match = findThreadForRoute(await fetchThreads({ signal }), routeId)
    if (!match) return { status: 'not-in-database' }
    return { status: 'ready', details: await fetchThreadDetails(match.id, signal) }
  } catch (error) {
    if (signal?.aborted) throw error
    if (error instanceof EndpointUnavailableError) return { status: 'unavailable' }
    if (error instanceof ApiError && error.status === 404) return { status: 'not-in-database' }
    const message =
      error instanceof ApiError ? error.message : 'Something went wrong while loading this thread.'
    return { status: 'error', message }
  }
}

export function useThreadDetails(routeId: string) {
  const [attempt, setAttempt] = useState(0)
  // The result remembers which request produced it, so a retry or another
  // thread shows the loading state until its own response arrives.
  const [result, setResult] = useState<ThreadDetailsState & { request: string }>()
  const request = `${attempt}:${routeId}`

  useEffect(() => {
    const controller = new AbortController()

    loadThreadDetails(routeId, controller.signal)
      .then((state) => setResult({ request, ...state }))
      .catch(() => {
        // Only an aborted request throws; a newer request replaces it.
      })

    return () => controller.abort()
  }, [routeId, request])

  const state: ThreadDetailsState = result?.request === request ? result : { status: 'loading' }
  return { state, retry: () => setAttempt((value) => value + 1) }
}
