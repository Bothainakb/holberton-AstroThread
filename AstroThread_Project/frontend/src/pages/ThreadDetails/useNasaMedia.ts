import { useEffect, useState } from 'react'
import { ApiError, EndpointUnavailableError, fetchNasaMedia } from '../../services/api'
import type { ApiNasaMedia } from '../../services/nasaMedia'

export type NasaMediaState =
  | { status: 'loading' }
  | { status: 'ready'; media: ApiNasaMedia }
  /** The server has no GET /api/threads/:id/nasa-media route yet. */
  | { status: 'unavailable' }
  /** NASA or the server failed; the message comes from the server when it sent one. */
  | { status: 'error'; message: string }

/**
 * Loads NASA images for a database thread through the backend. It is a
 * separate request from the thread details, so a slow NASA answer only delays
 * this section. Pass null while the thread id is not known.
 */
export function useNasaMedia(threadId: number | null) {
  const [attempt, setAttempt] = useState(0)
  // As in useThreadDetails: a result only counts for the request that made it.
  const [result, setResult] = useState<NasaMediaState & { request: string }>()
  const request = `${attempt}:${threadId}`

  useEffect(() => {
    if (threadId === null) return
    const controller = new AbortController()
    const { signal } = controller

    fetchNasaMedia(threadId, signal)
      .then((media) => setResult({ request, status: 'ready', media }))
      .catch((error: unknown) => {
        if (signal.aborted) return
        if (error instanceof EndpointUnavailableError) {
          setResult({ request, status: 'unavailable' })
        } else {
          const message =
            error instanceof ApiError ? error.message : 'Something went wrong while loading NASA images.'
          setResult({ request, status: 'error', message })
        }
      })

    return () => controller.abort()
  }, [threadId, request])

  const state: NasaMediaState = result?.request === request ? result : { status: 'loading' }
  return { state, retry: () => setAttempt((value) => value + 1) }
}
