// Tests for Thread Details routing: which database thread a
// "/research-threads/:id" URL means (threadRoute.ts) and loadThreadDetails
// (useThreadDetails.ts). fetch is replaced, so the backend is not contacted.
import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import { toHomeThread } from '../src/data/home'
import { researchThreads } from '../src/data/threads'
import {
  findThreadForRoute,
  researchThreadFor,
  threadSlug,
} from '../src/pages/ThreadDetails/threadRoute'
import { loadThreadDetails } from '../src/pages/ThreadDetails/useThreadDetails'

// The three rows of research_threads, as GET /api/threads returns them.
const DATABASE_THREADS = [
  { id: 1, title: 'Black Holes', category: 'Astrophysics', description: 'Explore black holes and their mysteries.' },
  { id: 2, title: 'Gravitational Waves', category: 'Physics', description: 'Discover ripples in spacetime.' },
  { id: 3, title: 'Exoplanets', category: 'Astronomy', description: 'Explore planets beyond our solar system.' },
]

function details(id: number) {
  const thread = DATABASE_THREADS.find((item) => item.id === id)!
  return { thread, timeline: [], latest: null, charts: [], papers: [] }
}

const realFetch = globalThis.fetch
let requested: string[] = []

/** GET /api/threads and GET /api/threads/:id backed by DATABASE_THREADS. */
function serveDatabase(options: { listStatus?: number } = {}) {
  requested = []
  globalThis.fetch = async (input: RequestInfo | URL) => {
    const path = String(input)
    requested.push(path)
    const json = (status: number, body: unknown) =>
      new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
    if (path === '/api/threads') {
      return options.listStatus ? json(options.listStatus, { error: 'down' }) : json(200, DATABASE_THREADS)
    }
    const match = path.match(/^\/api\/threads\/(\d+)$/)
    const id = match ? Number(match[1]) : NaN
    return DATABASE_THREADS.some((item) => item.id === id)
      ? json(200, details(id))
      : json(404, { error: 'Research thread not found' })
  }
}

afterEach(() => {
  globalThis.fetch = realFetch
})

describe('findThreadForRoute', () => {
  it('finds every database thread by the slug its Home card links to', () => {
    for (const thread of DATABASE_THREADS) {
      const cardSlug = toHomeThread(thread).id
      assert.equal(findThreadForRoute(DATABASE_THREADS, cardSlug), thread, cardSlug)
    }
  })

  it('finds every database thread by its numeric id', () => {
    for (const thread of DATABASE_THREADS) {
      assert.equal(findThreadForRoute(DATABASE_THREADS, String(thread.id)), thread)
    }
  })

  it('prefers a stored slug over the title', () => {
    const threads = [{ id: 7, slug: 'bh', title: 'Black Holes' }]
    assert.equal(findThreadForRoute(threads, 'bh'), threads[0])
    assert.equal(findThreadForRoute(threads, 'black-holes'), null)
  })

  it('matches slugs exactly (ignoring case) and never the closest thread', () => {
    assert.equal(findThreadForRoute(DATABASE_THREADS, 'Black-Holes')?.id, 1)
    for (const routeId of ['black-hole', 'black', 'holes', 'dark-matter', 'the-expanding-universe', '']) {
      assert.equal(findThreadForRoute(DATABASE_THREADS, routeId), null, routeId)
    }
  })

  it('returns null for ids that are not in the database or not whole numbers', () => {
    for (const routeId of ['0', '4', '999', '1.0', '-1', '1abc']) {
      assert.equal(findThreadForRoute(DATABASE_THREADS, routeId), null, routeId)
    }
  })
})

describe('researchThreadFor', () => {
  it('keeps the design entry for a database thread but shows the database fields', () => {
    const thread = researchThreadFor(
      { ...DATABASE_THREADS[0], description: 'From the database.' },
      researchThreads,
      5,
    )
    assert.equal(thread.id, 'black-holes')
    assert.equal(thread.description, 'From the database.')
    assert.equal(thread.updatedLabel, researchThreads[0].updatedLabel)
  })

  it('builds an entry for a database thread the design does not have', () => {
    const thread = researchThreadFor(
      { id: 9, title: 'Cosmic Rays', category: 'Astrophysics', description: 'Charged particles.' },
      researchThreads,
      5,
    )
    assert.deepEqual(thread, {
      id: 'cosmic-rays',
      title: 'Cosmic Rays',
      category: 'Astrophysics',
      description: 'Charged particles.',
      paperCount: 0,
      completedStages: 0,
      totalStages: 5,
      updatedLabel: '',
    })
    assert.equal(threadSlug({ id: 9, title: 'Cosmic Rays' }), 'cosmic-rays')
  })
})

describe('loadThreadDetails', () => {
  it('loads a thread by card slug and by numeric id from the database', async () => {
    for (const [routeId, id] of [
      ['black-holes', 1],
      ['gravitational-waves', 2],
      ['exoplanets', 3],
      ['1', 1],
      ['2', 2],
      ['3', 3],
    ] as const) {
      serveDatabase()
      const state = await loadThreadDetails(routeId)
      assert.equal(state.status, 'ready', routeId)
      assert.equal(state.status === 'ready' && state.details.thread.id, id, routeId)
      assert.deepEqual(requested, ['/api/threads', `/api/threads/${id}`])
    }
  })

  it('reports unknown slugs and ids as not in the database without loading another thread', async () => {
    for (const routeId of ['dark-matter', 'the-expanding-universe', '999']) {
      serveDatabase()
      assert.deepEqual(await loadThreadDetails(routeId), { status: 'not-in-database' }, routeId)
      assert.deepEqual(requested, ['/api/threads'])
    }
  })

  it('reports a failing server as an error, not as a missing thread', async () => {
    serveDatabase({ listStatus: 500 })
    const state = await loadThreadDetails('1')
    assert.equal(state.status, 'error')
  })
})
