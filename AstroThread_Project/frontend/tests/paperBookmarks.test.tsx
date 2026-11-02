// Tests for saving research papers: the bookmark button on paper cards, which
// paper each card saves (database id or OpenAlex id), the sign-in prompt, and
// the requests sent to /api/bookmarks/papers. fetch is replaced; no backend is contacted.
import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import PaperCard from '../src/components/PaperCard/PaperCard'
import RelatedPapers from '../src/pages/ThreadDetails/sections/RelatedPapers'
import type { PaperBookmarks } from '../src/pages/ThreadDetails/usePaperBookmarks'
import { addPaperBookmark, fetchPaperBookmarks, removePaperBookmark, type PaperRef } from '../src/services/api'

const PAPER = { id: 1, year: 1916, title: 'Schwarzschild 1916', authors: 'K. Schwarzschild', url: 'https://arxiv.org/abs/physics/9905030' }

function fakeBookmarks(overrides: Partial<PaperBookmarks> = {}, saved: PaperRef[] = []): PaperBookmarks & { toggled: PaperRef[] } {
  const toggled: PaperRef[] = []
  const same = (a: PaperRef, b: PaperRef) => JSON.stringify(a) === JSON.stringify(b)
  return {
    status: 'ready',
    isSaved: (paper) => saved.some((item) => same(item, paper)),
    isPending: () => false,
    toggle: (paper) => toggled.push(paper),
    notice: null,
    toggled,
    ...overrides,
  }
}

describe('PaperCard bookmark button', () => {
  it('is a working toggle that shows the saved state', () => {
    const unsaved = renderToStaticMarkup(
      <PaperCard paper={PAPER} bookmark={{ saved: false, pending: false, onToggle: () => {} }} />,
    )
    assert.match(unsaved, /aria-pressed="false"/)
    assert.match(unsaved, /aria-label="Save &quot;Schwarzschild 1916&quot;"/)
    assert.doesNotMatch(unsaved, /paper-card__bookmark--saved|disabled=""/)

    const saved = renderToStaticMarkup(
      <PaperCard paper={PAPER} bookmark={{ saved: true, pending: false, onToggle: () => {} }} />,
    )
    assert.match(saved, /paper-card__bookmark paper-card__bookmark--saved/)
    assert.match(saved, /aria-pressed="true"/)
    assert.match(saved, /Remove &quot;Schwarzschild 1916&quot; from saved papers/)
    assert.match(saved, /fill="currentColor"/)
  })

  it('waits while the saved state loads, and stays disabled where papers cannot be saved', () => {
    const loading = renderToStaticMarkup(
      <PaperCard paper={PAPER} bookmark={{ saved: false, pending: false, loading: true, onToggle: () => {} }} />,
    )
    assert.match(loading, /disabled=""/)
    assert.match(renderToStaticMarkup(<PaperCard paper={PAPER} />), /disabled=""[^>]*>|not available for this thread/)
  })
})

describe('RelatedPapers saving', () => {
  it('saves a database paper by its id', () => {
    const bookmarks = fakeBookmarks({}, [{ paperId: 1 }])
    const html = renderToStaticMarkup(<RelatedPapers papers={[PAPER]} bookmarks={bookmarks} />)
    assert.match(html, /aria-pressed="true"/)
  })

  it('saves an OpenAlex paper by its OpenAlex id', () => {
    const item = {
      openalex_id: 'https://openalex.org/W2101234009',
      title: 'Cold Dark Matter Halos',
      authors: 'J. Navarro',
      year: 1996,
      url: 'https://doi.org/10.1086/177173',
      summary: null,
    }
    const bookmarks = fakeBookmarks({}, [{ openalexId: item.openalex_id }])
    const html = renderToStaticMarkup(
      <RelatedPapers
        papers={[]}
        bookmarks={bookmarks}
        openAlex={{ state: { status: 'ready', data: { query: 'dark matter', source: 'OpenAlex', items: [item] } }, onRetry: () => {} }}
      />,
    )
    assert.match(html, /aria-pressed="true"/)
  })

  it('asks visitors to sign in and come back to the thread', () => {
    const bookmarks = fakeBookmarks({ status: 'signed-out', notice: { kind: 'sign-in', message: 'Sign in to save research papers to your profile.' } })
    const html = renderToStaticMarkup(
      <RelatedPapers papers={[PAPER]} bookmarks={bookmarks} returnPath="/research-threads/black-holes" />,
    )
    assert.match(html, /Sign in to save research papers/)
    assert.match(html, /href="\/login\?next=%2Fresearch-threads%2Fblack-holes"/)
    assert.match(html, /href="\/signup\?next=%2Fresearch-threads%2Fblack-holes"/)
  })

  it('keeps the disabled icon for threads outside the database', () => {
    const html = renderToStaticMarkup(<RelatedPapers papers={[PAPER]} bookmarks={fakeBookmarks({ status: 'unavailable' })} />)
    assert.match(html, /not available for this thread/)
  })
})

describe('paper bookmark requests', () => {
  const realFetch = globalThis.fetch
  let calls: { url: string; init?: RequestInit }[] = []
  afterEach(() => {
    globalThis.fetch = realFetch
    calls = []
  })
  function respond(status: number, body?: unknown) {
    globalThis.fetch = (async (url: string, init?: RequestInit) => {
      calls.push({ url, init })
      return new Response(body === undefined ? null : JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      })
    }) as typeof fetch
  }

  it('sends a database paper by id with its thread', async () => {
    respond(201, { paper_id: 1, saved: true })
    assert.equal(await addPaperBookmark({ paperId: 1 }, 7), 1)
    assert.equal(calls[0].url, '/api/bookmarks/papers')
    assert.equal(calls[0].init?.method, 'POST')
    assert.deepEqual(JSON.parse(String(calls[0].init?.body)), { paper_id: 1, thread_id: 7 })
  })

  it('sends only the OpenAlex id for an OpenAlex paper', async () => {
    respond(201, { paper_id: 4, saved: true })
    assert.equal(await addPaperBookmark({ openalexId: 'https://openalex.org/W1' }, null), 4)
    assert.deepEqual(JSON.parse(String(calls[0].init?.body)), { openalex_id: 'https://openalex.org/W1' })
  })

  it('removes by paper id and lists the saved papers', async () => {
    respond(204)
    await removePaperBookmark(4)
    assert.equal(calls[0].url, '/api/bookmarks/papers/4')
    assert.equal(calls[0].init?.method, 'DELETE')

    respond(200, [{ paper_id: 4, openalex_id: null, title: 'T', authors: null, year: null, url: null, thread: null, saved_at: null }])
    assert.equal((await fetchPaperBookmarks())[0].paper_id, 4)
  })

  it('reports a signed-out request as a 401 error', async () => {
    respond(401, { error: 'Authentication required' })
    await assert.rejects(addPaperBookmark({ paperId: 1 }, null), (error: Error & { status?: number }) => error.status === 401)
  })
})
