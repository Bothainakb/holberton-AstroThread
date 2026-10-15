// Signed-in state for the UI. The session itself is an HttpOnly cookie that
// JavaScript cannot read, and the role shown here only changes what the UI
// displays: the backend checks the stored role on every protected request.
import { useSyncExternalStore } from 'react'
import { routes } from '../router/router'
import { fetchCurrentUser, login, logout, type AuthUser, type Role } from '../services/api'

export type AuthState =
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'signed-in'; user: AuthUser }

let state: AuthState = { status: 'loading' }
const listeners = new Set<() => void>()

function setState(next: AuthState) {
  state = next
  listeners.forEach((listener) => listener())
}

function subscribe(onChange: () => void) {
  listeners.add(onChange)
  return () => listeners.delete(onChange)
}

export function useAuth() {
  return useSyncExternalStore(subscribe, () => state)
}

/** Asks the backend whether the session cookie is still valid (on page load). */
export async function restoreSession() {
  try {
    const user = await fetchCurrentUser()
    setState(user ? { status: 'signed-in', user } : { status: 'signed-out' })
  } catch {
    // Server unreachable: show the signed-out UI; the cookie is kept.
    setState({ status: 'signed-out' })
  }
}

export async function signIn(email: string, password: string, remember: boolean) {
  const user = await login(email, password, remember)
  setState({ status: 'signed-in', user })
  return user
}

export async function signOut() {
  try {
    await logout()
  } finally {
    setState({ status: 'signed-out' })
  }
}

/**
 * Page opened after signing in, by verified role. There is no Owner Dashboard
 * yet, so owners land on the same page as users; point `owner` at the
 * dashboard route once it exists.
 */
const HOME_PATH_BY_ROLE: Record<Role, string> = {
  user: routes.researchThreads,
  owner: routes.researchThreads,
}

export function homePathFor(role: Role) {
  return HOME_PATH_BY_ROLE[role]
}
