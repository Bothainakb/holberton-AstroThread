// Client for the AstroThread Flask API (backend/app.py).

import { parseNasaMedia, type ApiNasaMedia } from './nasaMedia'
import { parseOpenAlexPapers, type ApiOpenAlexPapers } from './openAlexPapers'

/**
 * Base URL of the backend. By default requests go to this site's own /api,
 * which Vite proxies to Flask (vite.config.ts); that keeps the HttpOnly login
 * cookie first-party. Override with VITE_API_BASE_URL in frontend/.env.local.
 */
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')

/** A research thread as stored in the `research_threads` table. */
export interface ApiThread {
  id: number
  slug?: string | null
  title: string
  category: string
  description: string
  updatedAt?: string | null
  paperCount?: number
  completedStages?: number
  totalStages?: number
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

  if (!message && response.status >= 500) {
    return new ApiError(`${UNREACHABLE} Check that the backend is running.`, response.status)
  }

  return new ApiError(
    message ?? `The server responded with an error (${response.status}).`,
    response.status,
  )
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
  query?: string
  signal?: AbortSignal
}

/** GET /api/threads, or GET /api/threads?q=... when searching. */
export async function fetchThreads({
  query,
  signal,
}: FetchThreadsOptions = {}): Promise<ApiThread[]> {
  const trimmed = query?.trim()
  const path = trimmed
    ? `/api/threads?${new URLSearchParams({ q: trimmed })}`
    : '/api/threads'

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
  const user =
    typeof data === 'object' && data !== null
      ? (data as { user?: unknown }).user
      : null

  if (typeof user === 'object' && user !== null) {
    const { id, email, role } = user as Record<string, unknown>

    if (
      typeof id === 'number' &&
      typeof email === 'string' &&
      (role === 'user' || role === 'owner')
    ) {
      return { id, email, role }
    }
  }

  throw new ApiError('The server returned the account in an unexpected format.')
}

/** POST /api/auth/login. */
export async function login(
  email: string,
  password: string,
  remember: boolean,
): Promise<AuthUser> {
  const response = await send('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, remember }),
  })

  if (!response.ok) throw await authError(response)

  return readAuthUser(await readJson(response))
}

/** POST /api/auth/register. */
export async function register(
  name: string,
  email: string,
  password: string,
): Promise<AuthUser> {
  const response = await send('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  })

  if (!response.ok) throw await authError(response)

  return readAuthUser(await readJson(response))
}

/** GET /api/auth/me. */
export async function fetchCurrentUser(): Promise<AuthUser | null> {
  const response = await send('/api/auth/me')

  if (response.status === 401) return null
  if (!response.ok) throw await authError(response)

  return readAuthUser(await readJson(response))
}

/** POST /api/auth/logout. */
export async function logout(): Promise<void> {
  const response = await send('/api/auth/logout', { method: 'POST' })

  if (!response.ok) throw await authError(response)
}

// ----- Profile -----

export class EndpointUnavailableError extends ApiError {
  constructor() {
    super('This feature is not available on the server yet.', 404)
    this.name = 'EndpointUnavailableError'
  }
}

export interface ThreadProgress {
  current_stage: number
  stage_count: number
}

export interface ProfileUser {
  id: number
  name: string | null
  email: string
  role: Role
  bio: string | null
  avatar_url: string | null
  initials: string
  member_since: string | null
}

export interface ProfileAccount {
  user: ProfileUser
  plan: { name: string; status: string; ai_assistance: string }
  settings: { email_notifications: boolean; language: string }
}

export interface ProfileStats {
  threads_explored: number
  threads_available: number
  papers_read: number
  papers_read_this_week: number
  discoveries_viewed: number
  discoveries_viewed_this_week: number
  stages_completed: number
  stages_total: number
}

export interface SavedThread {
  id: number
  title: string
  category: string
  description: string
  progress: ThreadProgress | null
  saved_at: string | null
}

export interface RecentThread {
  id: number
  title: string
  category: string
  progress: ThreadProgress | null
  last_viewed_at: string | null
}

interface NamedItem {
  id: number
  title: string
}

export interface ProfileActivity {
  id: number
  type: 'started_thread' | 'completed_stage' | 'read_paper' | 'viewed_discovery' | string
  stage_number: number | null
  created_at: string | null
  thread: NamedItem | null
  paper: NamedItem | null
  discovery: NamedItem | null
}

export interface Profile extends ProfileAccount {
  stats: ProfileStats
  saved_threads: { count: number; items: SavedThread[] }
  recently_explored: RecentThread[]
  activity: ProfileActivity[]
}

export interface ProfileChanges {
  name?: string
  bio?: string | null
  avatar_url?: string | null
  email_notifications?: boolean
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isProfileAccount(value: unknown): value is ProfileAccount {
  if (
    !isRecord(value) ||
    !isRecord(value.user) ||
    !isRecord(value.plan) ||
    !isRecord(value.settings)
  ) {
    return false
  }

  const { user, settings } = value

  return (
    typeof user.id === 'number' &&
    typeof user.email === 'string' &&
    (user.role === 'user' || user.role === 'owner') &&
    typeof settings.email_notifications === 'boolean'
  )
}

function isProfile(value: unknown): value is Profile {
  if (!isProfileAccount(value)) return false

  const data = value as unknown as Record<string, unknown>

  return (
    isRecord(data.stats) &&
    isRecord(data.saved_threads) &&
    Array.isArray(data.saved_threads.items) &&
    Array.isArray(data.recently_explored) &&
    Array.isArray(data.activity)
  )
}

async function missingRouteError(response: Response): Promise<ApiError> {
  if (response.status === 404) {
    const body: unknown = await response.clone().json().catch(() => null)

    if (!isRecord(body) || typeof body.error !== 'string') {
      return new EndpointUnavailableError()
    }
  }

  return authError(response)
}

/** GET /api/profile. */
export async function fetchProfile(signal?: AbortSignal): Promise<Profile> {
  const response = await send('/api/profile', { signal })

  if (!response.ok) throw await missingRouteError(response)

  const data = await readJson(response)

  if (!isProfile(data)) {
    throw new ApiError('The server returned the profile in an unexpected format.')
  }

  return data
}

/** PATCH /api/profile. */
export async function updateProfile(
  changes: ProfileChanges,
): Promise<ProfileAccount> {
  const response = await send('/api/profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(changes),
  })

  if (!response.ok) throw await missingRouteError(response)

  const data = await readJson(response)

  if (!isProfileAccount(data)) {
    throw new ApiError('The server returned the profile in an unexpected format.')
  }

  return data
}

// ----- Bookmarks (saved research threads) -----

/** GET /api/bookmarks: the signed-in user's saved threads, newest first (401 when signed out). */
export async function fetchBookmarks(signal?: AbortSignal): Promise<SavedThread[]> {
  const response = await send('/api/bookmarks', { signal })

  if (!response.ok) throw await missingRouteError(response)

  const data = await readJson(response)

  if (
    !Array.isArray(data) ||
    !data.every((item) => isRecord(item) && typeof item.id === 'number' && typeof item.title === 'string')
  ) {
    throw new ApiError('The server returned saved threads in an unexpected format.')
  }

  return data as SavedThread[]
}

/** POST /api/bookmarks: saves a thread for the signed-in user; saving it again is not an error. */
export async function addBookmark(threadId: number): Promise<void> {
  const response = await send('/api/bookmarks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ thread_id: threadId }),
  })

  if (!response.ok) throw await missingRouteError(response)
}

/** DELETE /api/bookmarks/:threadId. */
export async function removeBookmark(threadId: number): Promise<void> {
  const response = await send(`/api/bookmarks/${threadId}`, {
    method: 'DELETE',
  })

  if (!response.ok) throw await missingRouteError(response)
}

// ----- Thread Details -----

export interface ApiTimelineEvent {
  id: number
  year: number
  title: string
  description: string | null
  /** The source of a key discovery (migration 009); missing from older servers. */
  source_name?: string | null
  source_url?: string | null
}

export interface ApiChart {
  id: number
  title: string
  chart_type: string
  note: string | null
  dataset: unknown
}

export interface ApiThreadPaper {
  id: number
  title: string
  authors: string | null
  year: number | null
  url: string | null
  illustrative: boolean
}

/** One of a thread's research stages, from the thread_stages table. */
export interface ApiThreadStage {
  position: number
  icon: string
  title: string
  summary: string
  paragraphs: string[]
  facts: { label: string; title: string; text: string }[]
}

/** A recent development from latest_developments, with the page that announced it. */
export interface ApiDevelopment {
  id: number
  /** "YYYY-MM-DD" */
  date: string
  title: string
  text: string
  source_name: string | null
  /** An https link to the original source, or null. */
  source_url: string | null
}

export interface ApiThreadDetails {
  thread: ApiThread
  timeline: ApiTimelineEvent[]
  latest: ApiTimelineEvent | null
  /** Missing from servers older than migration 007's stages. */
  stages?: ApiThreadStage[]
  /** Newest first. Missing from servers older than migration 008. */
  developments?: ApiDevelopment[]
  charts: ApiChart[]
  papers: ApiThreadPaper[]
}

function isApiDevelopment(value: unknown): value is ApiDevelopment {
  if (!isRecord(value)) return false
  const { id, date, title, text, source_name: sourceName, source_url: sourceUrl } = value
  return (
    typeof id === 'number' &&
    typeof date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    typeof title === 'string' &&
    typeof text === 'string' &&
    (sourceName === null || typeof sourceName === 'string') &&
    (sourceUrl === null || typeof sourceUrl === 'string')
  )
}

function isApiThreadStage(value: unknown): value is ApiThreadStage {
  if (!isRecord(value)) return false
  const { position, icon, title, summary, paragraphs, facts } = value
  return (
    typeof position === 'number' &&
    typeof icon === 'string' &&
    typeof title === 'string' &&
    typeof summary === 'string' &&
    Array.isArray(paragraphs) &&
    paragraphs.every((paragraph) => typeof paragraph === 'string') &&
    Array.isArray(facts) &&
    facts.every(
      (fact) =>
        isRecord(fact) &&
        typeof fact.label === 'string' &&
        typeof fact.title === 'string' &&
        typeof fact.text === 'string',
    )
  )
}

function isApiThreadDetails(value: unknown): value is ApiThreadDetails {
  if (!isRecord(value) || !isApiThread(value.thread)) return false

  const { timeline, latest, stages, developments, charts, papers } = value

  return (
    (stages === undefined || (Array.isArray(stages) && stages.every(isApiThreadStage))) &&
    (developments === undefined ||
      (Array.isArray(developments) && developments.every(isApiDevelopment))) &&
    Array.isArray(timeline) &&
    timeline.every(
      (event) =>
        isRecord(event) &&
        typeof event.year === 'number' &&
        typeof event.title === 'string',
    ) &&
    (latest === null || isRecord(latest)) &&
    Array.isArray(charts) &&
    Array.isArray(papers) &&
    papers.every(
      (paper) =>
        isRecord(paper) &&
        typeof paper.title === 'string' &&
        typeof paper.illustrative === 'boolean',
    )
  )
}

/** GET /api/threads/:id. */
export async function fetchThreadDetails(
  threadId: number,
  signal?: AbortSignal,
): Promise<ApiThreadDetails> {
  const response = await send(`/api/threads/${threadId}`, { signal })

  if (!response.ok) throw await missingRouteError(response)

  const data = await readJson(response)

  if (!isApiThreadDetails(data)) {
    throw new ApiError('The server returned the research thread in an unexpected format.')
  }

  return data
}

/**
 * PUT /api/profile/progress/:threadId: records that the signed-in user has
 * opened `stage` (stages 1..stage count as completed; the server never lowers it).
 */
export async function saveThreadProgress(
  threadId: number,
  stageCount: number,
  stage: number,
): Promise<void> {
  const response = await send(`/api/profile/progress/${threadId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stage_count: stageCount, current_stage: stage, completed_stage: stage }),
  })

  if (!response.ok) throw await missingRouteError(response)
}

// ----- NASA media -----

/** GET /api/threads/:id/nasa-media. */
export async function fetchNasaMedia(
  threadId: number,
  signal?: AbortSignal,
): Promise<ApiNasaMedia> {
  return getNasaMedia(`/api/threads/${threadId}/nasa-media`, signal)
}

/** GET /api/design-threads/:slug/nasa-media: NASA images for a design preview (allowed slugs only). */
export async function fetchDesignNasaMedia(slug: string, signal?: AbortSignal): Promise<ApiNasaMedia> {
  return getNasaMedia(`/api/design-threads/${encodeURIComponent(slug)}/nasa-media`, signal)
}

async function getNasaMedia(path: string, signal?: AbortSignal): Promise<ApiNasaMedia> {
  const response = await send(path, { signal })

  if (!response.ok) throw await missingRouteError(response)

  const media = parseNasaMedia(await readJson(response))

  if (!media) {
    throw new ApiError('The server returned NASA media in an unexpected format.')
  }

  return media
}

// ----- OpenAlex papers -----

/** GET /api/threads/:id/openalex-papers: search results for threads with no papers. */
export async function fetchOpenAlexPapers(
  threadId: number,
  signal?: AbortSignal,
): Promise<ApiOpenAlexPapers> {
  return getOpenAlexPapers(`/api/threads/${threadId}/openalex-papers`, signal)
}

/**
 * GET /api/design-threads/:slug/openalex-papers: the same search for a design
 * preview with no database record (only the slugs the backend allows).
 */
export async function fetchDesignOpenAlexPapers(
  slug: string,
  signal?: AbortSignal,
): Promise<ApiOpenAlexPapers> {
  return getOpenAlexPapers(`/api/design-threads/${encodeURIComponent(slug)}/openalex-papers`, signal)
}

async function getOpenAlexPapers(path: string, signal?: AbortSignal): Promise<ApiOpenAlexPapers> {
  const response = await send(path, { signal })

  if (!response.ok) throw await missingRouteError(response)

  const papers = parseOpenAlexPapers(await readJson(response))

  if (!papers) {
    throw new ApiError('The server returned OpenAlex papers in an unexpected format.')
  }

  return papers
}
