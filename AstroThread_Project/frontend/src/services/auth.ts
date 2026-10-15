// Client for the authentication endpoints (backend/auth.py) and the signed-in
// session. The token is kept in localStorage when "Remember me" is checked,
// otherwise in sessionStorage so it is cleared when the browser closes.
import { useSyncExternalStore } from 'react'
import { API_BASE_URL, ApiError } from './api'

export interface AuthUser {
  id: number
  name: string
  email: string
  role: 'user' | 'owner'
}

/** Field name -> message, as returned in the API's "fields" object. */
export type AuthFieldErrors = Partial<Record<string, string>>

export class AuthError extends ApiError {
  readonly fields: AuthFieldErrors

  constructor(message: string, status?: number, fields: AuthFieldErrors = {}) {
    super(message, status)
    this.name = 'AuthError'
    this.fields = fields
  }
}

const TOKEN_KEY = 'astrothread.token'
const USER_KEY = 'astrothread.user'
const AUTH_EVENT = 'astrothread:auth'

// ---------------------------------------------------------------- storage

function storages(): Storage[] {
  try {
    return [window.localStorage, window.sessionStorage]
  } catch {
    return []
  }
}

function readItem(key: string): string | null {
  for (const storage of storages()) {
    try {
      const value = storage.getItem(key)
      if (value !== null) return value
    } catch {
      // Storage can be blocked (private mode, browser settings).
    }
  }
  return null
}

function clearSession() {
  for (const storage of storages()) {
    try {
      storage.removeItem(TOKEN_KEY)
      storage.removeItem(USER_KEY)
    } catch {
      // Ignore blocked storage.
    }
  }
}

function saveSession(token: string, user: AuthUser, remember: boolean) {
  clearSession()
  const storage = remember ? window.localStorage : window.sessionStorage
  try {
    storage.setItem(TOKEN_KEY, token)
    storage.setItem(USER_KEY, JSON.stringify(user))
  } catch {
    // If storage is blocked the user stays signed in until the page reloads.
  }
  window.dispatchEvent(new Event(AUTH_EVENT))
}

// ---------------------------------------------------------------- session

function isAuthUser(value: unknown): value is AuthUser {
  if (typeof value !== 'object' || value === null) return false
  const user = value as Record<string, unknown>
  return (
    typeof user.id === 'number' &&
    typeof user.name === 'string' &&
    typeof user.email === 'string' &&
    (user.role === 'user' || user.role === 'owner')
  )
}

let cachedRaw: string | null = null
let cachedUser: AuthUser | null = null

/** The signed-in user, or null. The same object is returned until it changes. */
export function getCurrentUser(): AuthUser | null {
  const raw = readItem(USER_KEY)
  if (raw !== cachedRaw) {
    cachedRaw = raw
    try {
      const parsed: unknown = raw ? JSON.parse(raw) : null
      cachedUser = isAuthUser(parsed) ? parsed : null
    } catch {
      cachedUser = null
    }
  }
  return cachedUser
}

/** Token to send as "Authorization: Bearer <token>", or null when signed out. */
export function getToken(): string | null {
  return readItem(TOKEN_KEY)
}

function subscribe(onChange: () => void) {
  window.addEventListener(AUTH_EVENT, onChange)
  window.addEventListener('storage', onChange) // sign-in/out in another tab
  return () => {
    window.removeEventListener(AUTH_EVENT, onChange)
    window.removeEventListener('storage', onChange)
  }
}

/** React hook: re-renders when the user signs in or out. */
export function useCurrentUser() {
  return useSyncExternalStore(subscribe, getCurrentUser)
}

export function logout() {
  clearSession()
  window.dispatchEvent(new Event(AUTH_EVENT))
}

// ---------------------------------------------------------------- requests

async function postAuth(path: string, body: Record<string, string>): Promise<{ token: string; user: AuthUser }> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new AuthError('Could not reach the AstroThread server.')
  }

  let data: unknown = null
  try {
    data = await response.json()
  } catch {
    // Handled below.
  }
  const result = (typeof data === 'object' && data !== null ? data : {}) as Record<string, unknown>

  if (!response.ok) {
    const message =
      typeof result.error === 'string'
        ? result.error
        : `The server responded with an error (${response.status}).`
    const fields =
      typeof result.fields === 'object' && result.fields !== null
        ? (result.fields as AuthFieldErrors)
        : {}
    throw new AuthError(message, response.status, fields)
  }

  if (typeof result.token !== 'string' || !isAuthUser(result.user)) {
    throw new AuthError('The server returned an invalid response.')
  }
  return { token: result.token, user: result.user }
}

/** POST /api/auth/login; saves the session and returns the user. */
export async function login(email: string, password: string, remember: boolean): Promise<AuthUser> {
  const { token, user } = await postAuth('/api/auth/login', { email, password })
  saveSession(token, user, remember)
  return user
}

/** POST /api/auth/register; signs the new user in. Used by the Create Account page. */
export async function register(name: string, email: string, password: string): Promise<AuthUser> {
  const { token, user } = await postAuth('/api/auth/register', { name, email, password })
  saveSession(token, user, false)
  return user
}
