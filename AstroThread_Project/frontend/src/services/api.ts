// Client for the AstroThread Flask API (backend/app.py).

/**
 * Base URL of the backend. By default requests go to this site's own /api,
 * which Vite proxies to Flask (vite.config.ts); that keeps the HttpOnly login
 * cookie first-party. Override with VITE_API_BASE_URL in frontend/.env.local.
 */
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')

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

const UNREACHABLE = 'Could not reach the AstroThread server.'

async function send(path: string, init: RequestInit = {}): Promise<Response> {
  try {
    // Same-origin requests include the session cookie by default.
    return await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { Accept: 'application/json', ...init.headers },
    })
  } catch (error) {
    if (init.signal?.aborted) throw error
    throw new ApiError(UNREACHABLE)
  }
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    throw new ApiError('The server returned an invalid response.')
  }
}

async function getJson(path: string, signal?: AbortSignal): Promise<unknown> {
  const response = await send(path, { signal })
  if (!response.ok) {
    throw new ApiError(`The server responded with an error (${response.status}).`, response.status)
  }
  return readJson(response)
}

/** Error for a failed auth request, using the server's `error` message when it sent one. */
async function authError(response: Response): Promise<ApiError> {
  const body: unknown = await response.json().catch(() => null)
  const message =
    typeof body === 'object' && body !== null && typeof (body as { error?: unknown }).error === 'string'
      ? (body as { error: string }).error
      : null
  // No JSON error means Flask did not answer, e.g. the dev proxy could not connect.
  if (!message && response.status >= 500) {
    return new ApiError(`${UNREACHABLE} Check that the backend is running.`, response.status)
  }
  return new ApiError(message ?? `The server responded with an error (${response.status}).`, response.status)
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

/** Account role, as stored in the `users` table and verified by the backend. */
export type Role = 'user' | 'owner'

/** The signed-in account returned by the auth endpoints. */
export interface AuthUser {
  id: number
  email: string
  role: Role
}

function readAuthUser(data: unknown): AuthUser {
  const user = typeof data === 'object' && data !== null ? (data as { user?: unknown }).user : null
  if (typeof user === 'object' && user !== null) {
    const { id, email, role } = user as Record<string, unknown>
    if (typeof id === 'number' && typeof email === 'string' && (role === 'user' || role === 'owner')) {
      return { id, email, role }
    }
  }
  throw new ApiError('The server returned the account in an unexpected format.')
}

/** POST /api/auth/login; the server sets an HttpOnly session cookie on success. */
export async function login(email: string, password: string, remember: boolean): Promise<AuthUser> {
  const response = await send('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, remember }),
  })
  if (!response.ok) throw await authError(response)
  return readAuthUser(await readJson(response))
}

/** GET /api/auth/me: the signed-in account, or null when there is no valid session. */
export async function fetchCurrentUser(): Promise<AuthUser | null> {
  const response = await send('/api/auth/me')
  if (response.status === 401) return null
  if (!response.ok) throw await authError(response)
  return readAuthUser(await readJson(response))
}

/** POST /api/auth/logout: clears the session cookie. */
export async function logout(): Promise<void> {
  const response = await send('/api/auth/logout', { method: 'POST' })
  if (!response.ok) throw await authError(response)
}
