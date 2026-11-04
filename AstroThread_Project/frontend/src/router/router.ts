
 // Minimal client-side routing on top of the History API, so the app does not
// need a routing dependency for its handful of pages.
import { useSyncExternalStore } from 'react'

export const routes = {
  home: '/',
  researchThreads: '/research-threads',
  researchSearch: '/research-search',
  login: '/login',
  signUp: '/signup',
  aiAssistant: '/ai-assistant',
  profile: '/profile',
  adminDashboard: '/admin',
} as const

/** Path of a thread's details page, e.g. "/research-threads/black-holes". */
export function threadDetailsPath(threadId: string) {
  return `${routes.researchThreads}/${encodeURIComponent(threadId)}`
}

/** Returns the thread id for "/research-threads/:id" paths, otherwise null. */
export function matchThreadDetails(pathname: string) {
  const match = pathname.match(/^\/research-threads\/([^/]+)$/)
  return match ? decodeURIComponent(match[1]) : null
}

/**
 * Where to go after signing in, from a "?next=" value. Only a Thread Details
 * path on this site ("/research-threads/black-holes") or the Profile page is
 * accepted, so the parameter can never send someone to another site or an
 * unexpected page.
 */
export function safeReturnPath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return null
  return matchThreadDetails(value) || value === routes.profile || value === routes.adminDashboard
    ? value
    : null
}

/** "/login?next=..." (or the sign-up page) that returns to `path` afterwards. */
export function withReturnPath(page: string, path: string | null | undefined) {
  const next = safeReturnPath(path)
  return next ? `${page}?${new URLSearchParams({ next })}` : page
}

const NAVIGATE_EVENT = 'astrothread:navigate'

function subscribe(onChange: () => void) {
  window.addEventListener('popstate', onChange)
  window.addEventListener(NAVIGATE_EVENT, onChange)
  return () => {
    window.removeEventListener('popstate', onChange)
    window.removeEventListener(NAVIGATE_EVENT, onChange)
  }
}

function getPathname() {
  // Treat "/research-threads/" the same as "/research-threads".
  return normalizePath(window.location.pathname)
}

export function usePathname() {
  return useSyncExternalStore(subscribe, getPathname)
}

function getSearch() {
  return window.location.search
}

/** Value of a URL query parameter such as "?q=...", or "" when it is missing. */
export function useSearchParam(name: string) {
  const search = useSyncExternalStore(subscribe, getSearch)
  return new URLSearchParams(search).get(name) ?? ''
}

/** Sets or removes a URL query parameter without adding a history entry. */
export function replaceSearchParam(name: string, value: string) {
  const url = new URL(window.location.href)
  if (value) url.searchParams.set(name, value)
  else url.searchParams.delete(name)
  if (url.href === window.location.href) return
  window.history.replaceState(window.history.state, '', url)
  window.dispatchEvent(new Event(NAVIGATE_EVENT))
}

/** Changes the URL path without adding a history entry (e.g. to a canonical address). */
export function replacePath(to: string) {
  const url = new URL(to, window.location.href)
  if (url.href === window.location.href) return
  window.history.replaceState(window.history.state, '', url)
  window.dispatchEvent(new Event(NAVIGATE_EVENT))
}

/**
 * History state of a Thread Details entry whose previous entry is plain Home
 * ("/"), so the browser's Back button (and the page's back arrow) from a
 * thread always returns to Home, not to Research Threads or old search results.
 */
const THREAD_ENTRY = { astrothreadHomeBehind: true } as const

function isThreadEntry(state: unknown) {
  return (state as typeof THREAD_ENTRY | null)?.astrothreadHomeBehind === true
}

function normalizePath(pathname: string) {
  const path = pathname.replace(/\/+$/, '')
  return path === '' ? '/' : path
}

/**
 * Fixes up the address the app was opened at. Run once before the first render.
 *
 * - The Research Search page was removed (Home is the only search), so its old
 *   address ("/research-search?q=...") opens the Home search instead.
 * - A Thread Details page opened straight from its URL (a bookmark, a new tab
 *   or a link from another site) gets a Home entry before it, so Back goes to
 *   Home there too. After a reload the entry is already marked; nothing changes.
 */
export function prepareStartUrl() {
  if (getPathname() === routes.researchSearch) {
    window.history.replaceState(null, '', routes.home + window.location.search)
  }

  if (!matchThreadDetails(getPathname()) || isThreadEntry(window.history.state)) return
  const here = window.location.href
  window.history.replaceState(null, '', routes.home)
  window.history.pushState(THREAD_ENTRY, '', here)
}

export function navigate(to: string) {
  const url = new URL(to, window.location.href)
  const path = normalizePath(url.pathname)
  const onThread = isThreadEntry(window.history.state)

  if (path === routes.home && !url.search && !url.hash && onThread) {
    // The entry before a thread is Home, so going back avoids stacking a
    // second Home entry (and Back from Home then leaves Thread Details behind).
    window.history.back()
    return
  }

  if (matchThreadDetails(path)) {
    // Turn the page being left into plain Home, then open the thread after it.
    if (!onThread && window.location.pathname + window.location.search !== routes.home) {
      window.history.replaceState(null, '', routes.home)
    }
    if (onThread) window.history.replaceState(THREAD_ENTRY, '', url)
    else window.history.pushState(THREAD_ENTRY, '', url)
  } else {
    window.history.pushState(null, '', url)
  }
  window.dispatchEvent(new Event(NAVIGATE_EVENT))

  if (url.hash) {
    // Wait for the new page to render before scrolling to the anchor.
    requestAnimationFrame(() => document.querySelector(url.hash)?.scrollIntoView())
  } else {
    window.scrollTo(0, 0)
  }
}

/** True for same-origin paths such as "/research-threads", false for "#anchor" or external URLs. */
export function isAppPath(href: string) {
  return href.startsWith('/') && !href.startsWith('//')
}
