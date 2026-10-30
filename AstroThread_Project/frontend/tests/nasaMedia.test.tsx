// Tests for NASA media on the Thread Details page: fetchNasaMedia (api.ts),
// parseNasaMedia (nasaMedia.ts) and NasaMediaSection's states.
//
// Run with:  npm test
// Vite bundles this file for Node (so import.meta.env and CSS imports work),
// then Node's built-in test runner runs it. fetch is replaced in every test,
// so neither the backend nor NASA is contacted.
import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import NasaMediaSection from '../src/pages/ThreadDetails/sections/NasaMediaSection'
import { ApiError, EndpointUnavailableError, fetchNasaMedia } from '../src/services/api'
import { parseNasaMedia, type ApiNasaImage, type ApiNasaMedia } from '../src/services/nasaMedia'

const IMAGE: ApiNasaImage = {
  nasa_id: 'PIA22085',
  title: "Black Hole With Jet (Artist's Concept)",
  description: 'A black hole and its jet.',
  date: '2017-11-02',
  center: 'JPL',
  credit: 'NASA/JPL-Caltech',
  image_url: 'https://images-assets.nasa.gov/image/PIA22085/PIA22085~thumb.jpg',
  source_url: 'https://images.nasa.gov/details/PIA22085',
}

const MEDIA: ApiNasaMedia = { query: 'black hole', source: 'NASA Image and Video Library', items: [IMAGE] }

const realFetch = globalThis.fetch
let requested: string[] = []

/** Answers every fetch with this status and body (an object is sent as JSON). */
function respond(status: number, body: unknown) {
  requested = []
  globalThis.fetch = async (input: RequestInfo | URL) => {
    requested.push(String(input))
    const text = typeof body === 'string' ? body : JSON.stringify(body)
    return new Response(text, { status, headers: { 'Content-Type': 'application/json' } })
  }
}

afterEach(() => {
  globalThis.fetch = realFetch
})

describe('fetchNasaMedia', () => {
  it('returns the images for the thread from the backend route', async () => {
    respond(200, MEDIA)

    const media = await fetchNasaMedia(1)

    assert.deepEqual(media, MEDIA)
    assert.deepEqual(requested, ['/api/threads/1/nasa-media'])
  })

  it('returns an empty list when NASA has no images', async () => {
    respond(200, { ...MEDIA, items: [] })

    const media = await fetchNasaMedia(3)

    assert.deepEqual(media.items, [])
  })

  it("uses the server's message when NASA fails (502) or times out (504)", async () => {
    for (const [status, message] of [
      [502, 'NASA images are unavailable right now. Please try again later.'],
      [504, 'NASA did not respond in time. Please try again.'],
    ] as const) {
      respond(status, { error: message })
      await assert.rejects(fetchNasaMedia(1), (error: unknown) => {
        assert.ok(error instanceof ApiError)
        assert.equal(error.status, status)
        assert.equal(error.message, message)
        return true
      })
    }
  })

  it('reports a missing route when the server has no NASA endpoint', async () => {
    respond(404, '<!doctype html><title>404 Not Found</title>')

    await assert.rejects(fetchNasaMedia(1), EndpointUnavailableError)
  })

  it('rejects a response in the wrong format', async () => {
    respond(200, { images: [] })

    await assert.rejects(fetchNasaMedia(1), /unexpected format/)
  })

  it('rejects with a readable error when the server cannot be reached', async () => {
    globalThis.fetch = async () => {
      throw new TypeError('fetch failed')
    }

    await assert.rejects(fetchNasaMedia(1), /Could not reach the AstroThread server/)
  })
})

describe('parseNasaMedia', () => {
  it('drops items that are malformed or link outside nasa.gov', () => {
    const media = parseNasaMedia({
      ...MEDIA,
      items: [
        IMAGE,
        { ...IMAGE, nasa_id: 'evil', image_url: 'https://example.com/x.jpg' },
        { ...IMAGE, nasa_id: 'script', source_url: 'javascript:alert(1)' },
        { ...IMAGE, nasa_id: 'http', image_url: 'http://images-assets.nasa.gov/x.jpg' },
        { title: 'no id' },
      ],
    })

    assert.deepEqual(media?.items.map((item) => item.nasa_id), ['PIA22085'])
  })

  it('returns null for a body that is not NASA media', () => {
    assert.equal(parseNasaMedia(null), null)
    assert.equal(parseNasaMedia({ query: 'x', source: 'y' }), null)
  })
})

describe('NasaMediaSection', () => {
  const render = (props: Parameters<typeof NasaMediaSection>[0]) =>
    renderToStaticMarkup(<NasaMediaSection {...props} />)

  it('shows each NASA image with its title, description and source link', () => {
    const html = render({ live: { status: 'ready', media: MEDIA } })

    assert.match(html, /src="https:\/\/images-assets\.nasa\.gov\/image\/PIA22085\/PIA22085~thumb\.jpg"/)
    assert.match(html, /alt="Black Hole With Jet \(Artist&#x27;s Concept\)"/)
    assert.match(html, /A black hole and its jet\./)
    assert.match(html, /NASA\/JPL-Caltech · Nov 2, 2017/)
    assert.match(html, /href="https:\/\/images\.nasa\.gov\/details\/PIA22085"/)
    assert.match(html, /rel="noopener noreferrer"/)
    assert.match(html, /NASA Image and Video Library/)
    assert.doesNotMatch(html, /planned integration|not connected/i)
  })

  it('shows a loading message', () => {
    assert.match(render({ live: { status: 'loading' } }), /Loading images from NASA/)
  })

  it('says when NASA has no images for the topic', () => {
    const html = render({ live: { status: 'ready', media: { ...MEDIA, items: [] } } })

    assert.match(html, /No NASA images found/)
    assert.match(html, /“black hole”/)
    assert.doesNotMatch(html, /<img/)
  })

  it('shows the error with a Try again button', () => {
    const html = render({
      live: { status: 'error', message: 'NASA did not respond in time. Please try again.' },
      onRetry: () => {},
    })

    assert.match(html, /role="alert"/)
    assert.match(html, /NASA did not respond in time/)
    assert.match(html, /Try again/)
  })

  it('says when the server has no NASA endpoint', () => {
    assert.match(render({ live: { status: 'unavailable' } }), /not connected on this server/)
  })
})
