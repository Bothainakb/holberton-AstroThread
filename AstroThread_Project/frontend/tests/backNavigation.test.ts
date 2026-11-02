// Tests for Back from Thread Details (navigate and prepareStartUrl in
// router/router.ts): the history entry before a thread is always plain Home.
import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import { navigate, prepareStartUrl } from '../src/router/router'

const ORIGIN = 'http://localhost:5173'

/** A browser history with just what the router uses. */
class FakeHistory {
  entries: { url: string; state: unknown }[] = []
  index = -1

  get current() {
    return this.entries[this.index]
  }

  get state() {
    return this.current.state
  }

  pushState(state: unknown, _title: string, url: string | URL) {
    this.entries.splice(this.index + 1)
    this.entries.push({ url: new URL(url, this.current?.url ?? ORIGIN).href, state })
    this.index += 1
  }

  replaceState(state: unknown, _title: string, url: string | URL) {
    this.entries[this.index] = { url: new URL(url, this.current.url).href, state }
  }

  back() {
    if (this.index > 0) this.index -= 1
  }

  /** Paths of every entry, and of the current one. */
  paths() {
    return this.entries.map(({ url }) => new URL(url).pathname + new URL(url).search)
  }

  path() {
    const url = new URL(this.current.url)
    return url.pathname + url.search
  }
}

let history: FakeHistory

/** Opens the app at `path` (a new tab), as main.tsx does. */
function openApp(path: string) {
  history = new FakeHistory()
  history.pushState(null, '', ORIGIN + path)
  Object.assign(globalThis, {
    window: {
      get location() {
        return new URL(history.current.url)
      },
      history,
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent() {
        return true
      },
      scrollTo() {},
    },
    requestAnimationFrame() {},
  })
  prepareStartUrl()
}

describe('Back from Thread Details', () => {
  beforeEach(() => openApp('/'))

  it('returns to Home after opening a thread from Home', () => {
    navigate('/research-threads/dark-matter')
    history.back()
    assert.equal(history.path(), '/')
  })

  it('returns to plain Home, not to the search results the thread was opened from', () => {
    history.replaceState(null, '', '/?q=dark')
    navigate('/research-threads/dark-matter')
    assert.deepEqual(history.paths(), ['/', '/research-threads/dark-matter'])
    history.back()
    assert.equal(history.path(), '/')
  })

  it('returns to Home, not Research Threads, when the thread was opened there', () => {
    navigate('/research-threads')
    navigate('/research-threads/black-holes')
    history.back()
    assert.equal(history.path(), '/')
  })

  it('opening another thread from a thread still has Home behind it', () => {
    navigate('/research-threads/black-holes')
    navigate('/research-threads/exoplanets')
    assert.deepEqual(history.paths(), ['/', '/research-threads/exoplanets'])
  })

  it('the page Back link (to Home) goes back instead of adding a Home entry', () => {
    navigate('/research-threads/dark-matter')
    navigate('/')
    assert.deepEqual(history.paths(), ['/', '/research-threads/dark-matter'])
    assert.equal(history.path(), '/')
  })

  it('returns to Home after signing in from a thread and coming back to it', () => {
    navigate('/research-threads/black-holes')
    navigate('/login?next=%2Fresearch-threads%2Fblack-holes')
    navigate('/research-threads/black-holes')
    history.back()
    assert.equal(history.path(), '/')
  })

  it('leaves other navigation alone', () => {
    navigate('/research-threads')
    navigate('/profile')
    assert.deepEqual(history.paths(), ['/', '/research-threads', '/profile'])
    history.back()
    assert.equal(history.path(), '/research-threads')
  })
})

describe('prepareStartUrl', () => {
  it('puts Home before a thread opened straight from its URL', () => {
    openApp('/research-threads/dark-matter')
    assert.deepEqual(history.paths(), ['/', '/research-threads/dark-matter'])
    assert.equal(history.path(), '/research-threads/dark-matter')
  })

  it('does nothing more after a reload of that thread', () => {
    openApp('/research-threads/dark-matter')
    prepareStartUrl()
    assert.deepEqual(history.paths(), ['/', '/research-threads/dark-matter'])
  })

  it('sends the removed Research Search page to the Home search', () => {
    openApp('/research-search?q=black')
    assert.deepEqual(history.paths(), ['/?q=black'])
  })

  it('leaves other pages alone', () => {
    openApp('/research-threads')
    assert.deepEqual(history.paths(), ['/research-threads'])
  })
})
