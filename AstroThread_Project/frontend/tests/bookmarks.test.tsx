// Tests for saving threads: the bookmark API calls (services/api.ts) and the
// bookmark button and notice in ThreadHero for every state. fetch is replaced,
// so the backend is not contacted.
import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { researchThreads } from '../src/data/threads'
import ThreadHero from '../src/pages/ThreadDetails/sections/ThreadHero'
import type { BookmarkNotice, BookmarkState } from '../src/pages/ThreadDetails/useThreadBookmark'
import { addBookmark, ApiError, fetchBookmarks, removeBookmark } from '../src/services/api'

const realFetch = globalThis.fetch
let requests: { url: string; method: string; body: string | null }[] = []

function respond(status: number, body: unknown = '') {
  requests = []
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    requests.push({ url: String(input), method: init?.method ?? 'GET', body: (init?.body as string) ?? null })
    const text = typeof body === 'string' ? body : JSON.stringify(body)
    return new Response(status === 204 ? null : text, {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

afterEach(() => {
  globalThis.fetch = realFetch
})

describe('bookmark API', () => {
  it('lists the saved threads of the signed-in user', async () => {
    respond(200, [{ id: 2, title: 'Gravitational Waves', category: 'Physics', description: '', progress: null, saved_at: null }])

    const threads = await fetchBookmarks()

    assert.deepEqual(threads.map((thread) => thread.id), [2])
    assert.deepEqual(requests, [{ url: '/api/bookmarks', method: 'GET', body: null }])
  })

  it('saves with POST {thread_id} and removes with DELETE', async () => {
    respond(201, { thread_id: 2, saved: true })
    await addBookmark(2)
    assert.deepEqual(requests, [{ url: '/api/bookmarks', method: 'POST', body: '{"thread_id":2}' }])

    respond(204)
    await removeBookmark(2)
    assert.deepEqual(requests, [{ url: '/api/bookmarks/2', method: 'DELETE', body: null }])
  })

  it('reports a signed-out request as a 401 ApiError', async () => {
    respond(401, { error: 'Authentication required' })

    await assert.rejects(addBookmark(2), (error: unknown) => {
      assert.ok(error instanceof ApiError)
      assert.equal(error.status, 401)
      return true
    })
  })

  it('rejects a saved-threads response in the wrong format', async () => {
    respond(200, { threads: [] })

    await assert.rejects(fetchBookmarks(), /unexpected format/)
  })
})

describe('ThreadHero bookmark button', () => {
  const render = (state: BookmarkState, notice: BookmarkNotice | null = null) =>
    renderToStaticMarkup(
      <ThreadHero
        thread={researchThreads[0]}
        headline="Black Holes"
        intro="Intro"
        categories={['Astrophysics']}
        paperCount={3}
        updatedLabel={null}
        onStartJourney={() => {}}
        bookmark={{ state, notice, onToggle: () => {} }}
      />,
    )
  const button = (html: string) => html.match(/<button[^>]*class="details-icon-button[^"]*"[^>]*>/)?.[0] ?? ''

  it('is an unpressed "Save thread" toggle with an outline icon', () => {
    const tag = button(render({ status: 'ready', saved: false, pending: false }))

    assert.match(tag, /aria-label="Save thread"/)
    assert.match(tag, /aria-pressed="false"/)
    assert.doesNotMatch(tag, /disabled/)
  })

  it('is pressed, cyan and filled once saved', () => {
    const html = render({ status: 'ready', saved: true, pending: true })
    const tag = button(html)

    assert.match(tag, /details-icon-button--saved/)
    assert.match(tag, /aria-pressed="true"/)
    assert.match(tag, /aria-label="Remove from saved threads"/)
    assert.match(tag, /aria-busy="true"/)
    assert.match(html, /<path d="M0 0H10V16L5 12.4L0 16Z" fill="currentColor"/)
  })

  it('asks visitors to sign in instead of saving', () => {
    const html = render(
      { status: 'signed-out' },
      { kind: 'sign-in', message: 'Sign in to save research threads to your profile.' },
    )

    assert.match(button(html), /aria-label="Save thread \(sign in required\)"/)
    assert.doesNotMatch(button(html), /aria-pressed/)
    assert.match(html, /role="alert"/)
    assert.match(html, /Sign in to save research threads/)
    // Both links bring the visitor back to this thread afterwards.
    assert.match(html, /href="\/login\?next=%2Fresearch-threads%2Fblack-holes"/)
    assert.match(html, /href="\/signup\?next=%2Fresearch-threads%2Fblack-holes"/)
  })

  it('cannot be used for threads outside the database or while loading', () => {
    assert.match(button(render({ status: 'unavailable' })), /disabled=""/)
    assert.match(button(render({ status: 'loading' })), /disabled=""/)
  })

  it('shows errors and confirmations', () => {
    const failed = render(
      { status: 'ready', saved: false, pending: false },
      { kind: 'error', message: 'The thread could not be saved: Unable to save this thread' },
    )
    assert.match(failed, /role="alert"/)
    assert.match(failed, /details-bookmark-notice__text--error/)

    const saved = render(
      { status: 'ready', saved: true, pending: false },
      { kind: 'done', message: 'Saved to your research threads.' },
    )
    assert.match(saved, /role="status"/)
    assert.match(saved, /Saved to your research threads\./)
  })
})
