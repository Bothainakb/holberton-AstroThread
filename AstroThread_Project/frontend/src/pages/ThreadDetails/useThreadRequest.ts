import { useEffect, useState } from 'react'
import { ApiError, EndpointUnavailableError } from '../../services/api'

export type ThreadRequestState<T> =
  | { status: 'loading' }
  | { status: 'ready'; data: T }
  /** The server has no route for this request yet. */
  | { status: 'unavailable' }
  /** The request failed; the message comes from the server when it sent one. */
  | { status: 'error'; message: string }

/**
 * Loads one extra resource for a database thread (NASA images, OpenAlex
 * papers) as its own request, so a slow answer only delays its own section.
 * Pass null while the thread id is not known or the request is not needed.
 */
export function useThreadRequest<T, K extends number | string = number>(
  threadId: K | null,
  load: (threadId: K, signal: AbortSignal) => Promise<T>,
  failureMessage: string,
) {
  const [attempt, setAttempt] = useState(0)
  // As in useThreadDetails: a result only counts for the request that made it.
  const [result, setResult] = useState<ThreadRequestState<T> & { request: string }>()
  const request = `${attempt}:${threadId}`

  useEffect(() => {
    if (threadId === null) return
    const controller = new AbortController()
    const { signal } = controller

    load(threadId, signal)
      .then((data) => setResult({ request, status: 'ready', data }))
      .catch((error: unknown) => {
        if (signal.aborted) return
        if (error instanceof EndpointUnavailableError) {
          setResult({ request, status: 'unavailable' })
        } else {
          const message = error instanceof ApiError ? error.message : failureMessage
          setResult({ request, status: 'error', message })
        }
      })

    return () => controller.abort()
  }, [threadId, request, load, failureMessage])

  const state: ThreadRequestState<T> = result?.request === request ? result : { status: 'loading' }
  return { state, retry: () => setAttempt((value) => value + 1) }
}
