import { useSyncExternalStore } from 'react'

export const routes = {
  home: '/',
  researchThreads: '/research-threads',
  researchSearch: '/research-search',
  login: '/login',
  signup: '/signup',
} as const

export function threadDetailsPath(threadId: string) {
  return `${routes.researchThreads}/${encodeURIComponent(threadId)}`
}

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
  const path = window.location.pathname.replace(/\/+$/, '')
  return path === '' ? '/' : path
}

export function usePathname() {
  return useSyncExternalStore(subscribe, getPathname)
}

function getSearch() {
  return window.location.search
}

export function useSearchParam(name: string) {
  const search = useSyncExternalStore(subscribe, getSearch)
  return new URLSearchParams(search).get(name) ?? ''
}

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
    requestAnimationFrame(() => document.querySelector(url.hash)?.scrollIntoView())
  } else {
    window.scrollTo(0, 0)
  }
}

export function isAppPath(href: string) {
  return href.startsWith('/') && !href.startsWith('//')
}
