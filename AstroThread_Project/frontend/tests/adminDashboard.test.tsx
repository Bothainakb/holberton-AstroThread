// Tests for the Admin Dashboard: its API calls, date format, return path and
// table. fetch is replaced, so the backend is not contacted.
import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { formatAdminDate } from '../src/pages/AdminDashboard/adminShared'
import ThreadsPanel from '../src/pages/AdminDashboard/ThreadsPanel'
import { routes, safeReturnPath } from '../src/router/router'
import {
  createAdminEvent,
  deleteAdminThread,
  fetchAdminThreads,
  updateAdminThread,
  type AdminThread,
} from '../src/services/adminApi'
import { ApiError } from '../src/services/api'

const realFetch = globalThis.fetch
let requests: { url: string; method: string; body: unknown }[] = []

function respond(status: number, body: unknown = null) {
  requests = []
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    requests.push({
      url: String(input),
      method: init?.method ?? 'GET',
      body: init?.body ? JSON.parse(init.body as string) : null,
    })
    return new Response(status === 204 ? null : JSON.stringify(body), { status })
  }
}

afterEach(() => {
  globalThis.fetch = realFetch
})

const THREAD: AdminThread = {
  id: 4,
  slug: 'dark-matter',
  title: 'Dark Matter',
  category: 'Cosmology',
  description: 'Invisible matter.',
  is_featured: true,
  created_at: '2026-09-01T10:00:00',
  updated_at: '2026-10-01T10:00:00',
  timeline_event_count: 2,
  stage_count: 5,
  paper_count: 3,
}

describe('admin API', () => {
  const fields = { title: 'Dark Matter', category: 'Cosmology', description: 'x', is_featured: false }

  it('uses the owner routes', async () => {
    respond(200, [THREAD])
    assert.deepEqual(await fetchAdminThreads(), [THREAD])
    assert.equal(requests[0].url, '/api/owner/research-threads')

    respond(200, THREAD)
    await updateAdminThread(4, fields)
    assert.deepEqual(requests, [{ url: '/api/owner/research-threads/4', method: 'PATCH', body: fields }])

    respond(204)
    await deleteAdminThread(4)
    assert.deepEqual(requests, [{ url: '/api/owner/research-threads/4', method: 'DELETE', body: null }])
  })

  it('adds events under their thread', async () => {
    const event = { year: 1933, title: 'Zwicky', description: null, source_name: null, source_url: null }
    respond(201, { id: 1, thread_id: 4, ...event })
    await createAdminEvent(4, event)
    assert.equal(requests[0].url, '/api/owner/research-threads/4/timeline-events')
  })

  it('shows the message the server sends', async () => {
    respond(409, { error: 'A research thread with this title already exists' })
    await assert.rejects(updateAdminThread(4, fields), (error: ApiError) => {
      assert.equal(error.status, 409)
      assert.match(error.message, /already exists/)
      return true
    })
  })
})

describe('admin dashboard', () => {
  it('formats dates like the design', () => {
    assert.equal(formatAdminDate('2026-10-07T12:00:00'), '7 Oct 2026')
    assert.equal(formatAdminDate(null), '—')
  })

  it('returns to the dashboard after signing in', () => {
    assert.equal(safeReturnPath(routes.adminDashboard), '/admin')
  })

  it('lists threads with their actions', () => {
    const html = renderToStaticMarkup(
      <ThreadsPanel threads={[THREAD]} editor={null} onEditorChange={() => {}} onChanged={() => {}} />,
    )
    assert.match(html, /Dark Matter/)
    assert.match(html, /<td>Yes<\/td>/)
    assert.match(html, /1 Oct 2026/)
    assert.match(html, /aria-label="Delete Dark Matter"/)
    assert.match(html, /1 research thread ·/)
  })
})
