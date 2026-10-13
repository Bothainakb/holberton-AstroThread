// Client for the AstroThread Flask API (backend/app.py).

/** Base URL of the backend; override with VITE_API_BASE_URL in frontend/.env.local. */
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:5000').replace(
  /\/+$/,
  '',
)

/** A research thread as stored in the `research_threads` table. */
export interface ApiThread {
  id: number
  title: string
  category: string
  description: string
}

export class ApiError extends Error {
  readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function getJson(path: string, signal?: AbortSignal): Promise<unknown> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: { Accept: 'application/json' },
      signal,
    })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new ApiError('Could not reach the AstroThread server.')
  }

  if (!response.ok) {
    throw new ApiError(`The server responded with an error (${response.status}).`, response.status)
  }
  try {
    return await response.json()
  } catch {
    throw new ApiError('The server returned an invalid response.')
  }
}

function isApiThread(value: unknown): value is ApiThread {
  if (typeof value !== 'object' || value === null) return false
  const thread = value as Record<string, unknown>
  return (
    typeof thread.id === 'number' &&
    typeof thread.title === 'string' &&
    typeof thread.category === 'string' &&
    typeof thread.description === 'string'
  )
}

interface FetchThreadsOptions {
  /** Searches title, category and description; blank returns every thread. */
  query?: string
  signal?: AbortSignal
}

/** GET /api/threads, or GET /api/threads?q=... when searching. */
export async function fetchThreads({ query, signal }: FetchThreadsOptions = {}): Promise<ApiThread[]> {
  const trimmed = query?.trim()
  const path = trimmed ? `/api/threads?${new URLSearchParams({ q: trimmed })}` : '/api/threads'
  const data = await getJson(path, signal)
  if (!Array.isArray(data) || !data.every(isApiThread)) {
    throw new ApiError('The server returned research threads in an unexpected format.')
  }
  return data
}
