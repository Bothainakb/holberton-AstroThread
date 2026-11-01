// Tests for research-stage progress: the card's 5-segment bar is drawn from
// the API counts (never fixed values), and the details page saves progress
// with PUT /api/profile/progress. fetch is replaced; no backend is contacted.
import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import ResearchThreadCard from '../src/components/ResearchThreadCard/ResearchThreadCard'
import { saveThreadProgress } from '../src/services/api'

const realFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = realFetch
})

function card(completedStages: number | undefined, totalStages: number | undefined) {
  return renderToStaticMarkup(
    <ResearchThreadCard
      thread={{
        id: 'exoplanets',
        title: 'Exoplanets',
        category: 'Astronomy',
        description: 'Planets orbiting other stars.',
        completedStages,
        totalStages,
      }}
    />,
  )
}

const count = (html: string, pattern: RegExp) => (html.match(pattern) ?? []).length

describe('Research thread card progress', () => {
  it('draws one segment per stage and fills the completed ones', () => {
    const html = card(2, 5)
    assert.equal(count(html, /class="thread-card__stage[ "]/g), 5)
    assert.equal(count(html, /thread-card__stage--complete/g), 2)
    assert.match(html, /2 \/ 5/)
    assert.match(html, /aria-valuenow="2"/)
    assert.match(html, /aria-valuemax="5"/)
  })

  it('shows the same empty 5-segment bar to visitors (0 completed)', () => {
    const html = card(0, 5)
    assert.equal(count(html, /class="thread-card__stage[ "]/g), 5)
    assert.equal(count(html, /thread-card__stage--complete/g), 0)
    assert.match(html, /0 \/ 5/)
  })

  it('fills every segment when all stages are completed', () => {
    const html = card(5, 5)
    assert.equal(count(html, /thread-card__stage--complete/g), 5)
  })

  it('shows no bar for a thread without stages', () => {
    assert.doesNotMatch(card(undefined, undefined), /thread-card__stages/)
  })
})

describe('saveThreadProgress', () => {
  it('sends the opened stage as the current and completed stage', async () => {
    let request: { url: string; init?: RequestInit } | undefined
    globalThis.fetch = (async (url: string, init?: RequestInit) => {
      request = { url, init }
      return new Response(JSON.stringify({}), { status: 200 })
    }) as typeof fetch

    await saveThreadProgress(207, 5, 3)

    assert.equal(request?.url, '/api/profile/progress/207')
    assert.equal(request?.init?.method, 'PUT')
    assert.deepEqual(JSON.parse(String(request?.init?.body)), {
      stage_count: 5,
      current_stage: 3,
      completed_stage: 3,
    })
  })

  it('reports a signed-out user as an error with status 401', async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401 })) as typeof fetch

    await assert.rejects(saveThreadProgress(207, 5, 1), (error: { status?: number }) => error.status === 401)
  })
})
