// Minimal client-side routing on top of the History API, so the app does not
// need a routing dependency for its handful of pages.
import { useSyncExternalStore } from 'react'

export const routes = {
  home: '/',
  researchThreads: '/research-threads',
  researchSearch: '/research-search',
  login: '/login',
  signUp: '/signup',
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
  const path = window.location.pathname.replace(/\/+$/, '')
  return path === '' ? '/' : path
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

export function navigate(to: string) {
  const url = new URL(to, window.location.href)
  window.history.pushState(null, '', url)
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
