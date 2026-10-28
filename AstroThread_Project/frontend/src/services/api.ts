// Client for the AstroThread Flask API (backend/app.py).

/**
 * Base URL of the backend. By default requests go to this site's own /api,
 * which Vite proxies to Flask (vite.config.ts); that keeps the HttpOnly login
 * cookie first-party. Override with VITE_API_BASE_URL in frontend/.env.local.
 */
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')

/** A research thread as returned by GET /api/threads. */
export interface ApiThread {
  id: number
  title: string
  category: string
  description: string
  /** URL name used by the Thread Details page, e.g. "black-holes". */
  slug?: string | null
  /** Papers saved for this thread (cached from OpenAlex). */
  paperCount?: number
  /** Stages that have content, out of totalStages. */
  completedStages?: number
  totalStages?: number
  /** When the thread was added, as an ISO date string. */
  updatedAt?: string | null
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

/**
 * POST /api/auth/register: creates a standard user account. The server signs
 * the new account in with the same HttpOnly session cookie as login.
 */
export async function register(name: string, email: string, password: string): Promise<AuthUser> {
  const response = await send('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
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
/** One image from NASA's Image and Video Library. */
export interface NasaImage {
  title: string
  description: string
  imageUrl: string | null
}

function isNasaImage(value: unknown): value is NasaImage {
  if (typeof value !== 'object' || value === null) return false
  const item = value as Record<string, unknown>
  return (
    typeof item.title === 'string' &&
    typeof item.description === 'string' &&
    (typeof item.imageUrl === 'string' || item.imageUrl === null || item.imageUrl === undefined)
  )
}

/** NASA images for one thread, from GET /api/threads/<slug>. */
export async function fetchNasaImages(slug: string, signal?: AbortSignal): Promise<NasaImage[]> {
  const data = await getJson(`/api/threads/${encodeURIComponent(slug)}`, signal)
  const nasa = typeof data === 'object' && data !== null ? (data as { nasa?: unknown }).nasa : null
  if (typeof nasa !== 'object' || nasa === null) {
    throw new ApiError('The server returned NASA media in an unexpected format.')
  }

  const { media, error } = nasa as { media?: unknown; error?: unknown }
  if (typeof error === 'string') throw new ApiError(error)
  if (!Array.isArray(media) || !media.every(isNasaImage)) {
    throw new ApiError('The server returned NASA media in an unexpected format.')
  }

  // Only show images served over https.
  return media.map((item) => ({
    ...item,
    imageUrl: item.imageUrl?.startsWith('https://') ? item.imageUrl : null,
  }))
}
