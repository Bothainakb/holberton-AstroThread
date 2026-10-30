// Tests for the OpenAlex fallback in "Related Research Papers": fetchOpenAlexPapers
// (api.ts), parseOpenAlexPapers (openAlexPapers.ts) and RelatedPapers' states.
// fetch is replaced in every test, so neither the backend nor OpenAlex is contacted.
import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import RelatedPapers from '../src/pages/ThreadDetails/sections/RelatedPapers'
import { DESIGN_PAPER_PREVIEWS } from '../src/pages/ThreadDetails/useOpenAlexPapers'
import {
  ApiError,
  EndpointUnavailableError,
  fetchDesignOpenAlexPapers,
  fetchOpenAlexPapers,
} from '../src/services/api'
import {
  parseOpenAlexPapers,
  quotedPhrases,
  type ApiOpenAlexPaper,
  type ApiOpenAlexPapers,
} from '../src/services/openAlexPapers'

const PAPER: ApiOpenAlexPaper = {
  openalex_id: 'https://openalex.org/W2963524593',
  title: 'Observation of Gravitational Waves from a Binary Black Hole Merger',
  authors: 'B. P. Abbott, R. Abbott, T. D. Abbott et al.',
  year: 2016,
  url: 'https://doi.org/10.1103/physrevlett.116.061102',
}

const PAPERS: ApiOpenAlexPapers = { query: 'gravitational wave', source: 'OpenAlex', items: [PAPER] }

const realFetch = globalThis.fetch
let requested: string[] = []

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

describe('fetchOpenAlexPapers', () => {
  it('returns the papers for the thread from the backend route', async () => {
    respond(200, PAPERS)

    assert.deepEqual(await fetchOpenAlexPapers(2), PAPERS)
    assert.deepEqual(requested, ['/api/threads/2/openalex-papers'])
  })

  it("uses the server's message when OpenAlex fails (502) or times out (504)", async () => {
    for (const [status, message] of [
      [502, 'Papers from OpenAlex are unavailable right now. Please try again later.'],
      [504, 'OpenAlex did not respond in time. Please try again.'],
    ] as const) {
      respond(status, { error: message })
      await assert.rejects(fetchOpenAlexPapers(2), (error: unknown) => {
        assert.ok(error instanceof ApiError)
        assert.equal(error.status, status)
        assert.equal(error.message, message)
        return true
      })
    }
  })

  it('reports a missing route when the server has no OpenAlex endpoint', async () => {
    respond(404, '<!doctype html><title>404 Not Found</title>')

    await assert.rejects(fetchOpenAlexPapers(2), EndpointUnavailableError)
  })

  it('rejects a response in the wrong format', async () => {
    respond(200, { papers: [] })

    await assert.rejects(fetchOpenAlexPapers(2), /unexpected format/)
  })
})

describe('parseOpenAlexPapers', () => {
  it('drops items that are malformed or link outside doi.org and openalex.org', () => {
    const papers = parseOpenAlexPapers({
      ...PAPERS,
      items: [
        PAPER,
        { ...PAPER, openalex_id: 'W2', url: 'https://example.com/paper' },
        { ...PAPER, openalex_id: 'W3', url: 'javascript:alert(1)' },
        { ...PAPER, openalex_id: 'W4', url: 'http://doi.org/10.1/x' },
        { ...PAPER, openalex_id: 'W5', title: '  ' },
        { ...PAPER, openalex_id: 'W6', year: '2016' },
        { title: 'no id' },
      ],
    })

    assert.deepEqual(papers?.items.map((item) => item.openalex_id), [PAPER.openalex_id])
  })

  it('returns null for a body that is not an OpenAlex response', () => {
    assert.equal(parseOpenAlexPapers(null), null)
    assert.equal(parseOpenAlexPapers({ query: 'x', source: 'y' }), null)
  })
})

describe('RelatedPapers with the OpenAlex fallback', () => {
  const EMPTY = 'No papers have been linked to this thread in the database yet.'
  const render = (props: Parameters<typeof RelatedPapers>[0]) =>
    renderToStaticMarkup(<RelatedPapers emptyText={EMPTY} {...props} />)
  const retry = () => {}

  it('labels OpenAlex papers as search results and links each one', () => {
    const html = render({ papers: [], openAlex: { state: { status: 'ready', data: PAPERS }, onRetry: retry } })

    assert.match(html, /No papers are linked to this thread in the AstroThread database yet\./)
    assert.match(html, /most-cited OpenAlex articles with “gravitational wave”/)
    assert.match(html, /search results, not a curated list/)
    assert.match(html, /Observation of Gravitational Waves from a Binary Black Hole Merger/)
    assert.match(html, /B\. P\. Abbott, R\. Abbott, T\. D\. Abbott et al\./)
    assert.match(html, /href="https:\/\/doi\.org\/10\.1103\/physrevlett\.116\.061102"/)
    assert.doesNotMatch(html, /Illustrative data/)
  })

  it('shows a loading message while OpenAlex is searched', () => {
    const html = render({ papers: [], openAlex: { state: { status: 'loading' }, onRetry: retry } })

    assert.match(html, /Searching OpenAlex for related papers/)
  })

  it('says when OpenAlex has no matching articles either', () => {
    const html = render({
      papers: [],
      openAlex: { state: { status: 'ready', data: { ...PAPERS, items: [] } }, onRetry: retry },
    })

    assert.match(html, new RegExp(EMPTY.replace(/\./g, '\\.')))
    assert.match(html, /OpenAlex has no articles with “gravitational wave” in the title either/)
    assert.doesNotMatch(html, /paper-card/)
  })

  it('shows the error with a Try again button', () => {
    const html = render({
      papers: [],
      openAlex: {
        state: { status: 'error', message: 'OpenAlex did not respond in time. Please try again.' },
        onRetry: retry,
      },
    })

    assert.match(html, /role="alert"/)
    assert.match(html, /OpenAlex did not respond in time/)
    assert.match(html, /Try again/)
  })

  it('shows the plain empty state when the server has no OpenAlex endpoint', () => {
    const html = render({ papers: [], openAlex: { state: { status: 'unavailable' }, onRetry: retry } })

    assert.match(html, new RegExp(EMPTY.replace(/\./g, '\\.')))
    assert.doesNotMatch(html, /OpenAlex/)
  })

  it('shows database papers and ignores OpenAlex when the thread has papers', () => {
    const html = render({
      papers: [{ id: 1, year: 1916, title: 'Database paper', authors: 'K. Schwarzschild' }],
      openAlex: { state: { status: 'ready', data: PAPERS }, onRetry: retry },
    })

    assert.match(html, /Database paper/)
    assert.doesNotMatch(html, /OpenAlex|Gravitational Waves from/)
  })
})

describe('design previews (Neutron Stars, The Expanding Universe)', () => {
  const NEUTRON = {
    ...PAPER,
    openalex_id: 'https://openalex.org/W2',
    title: 'A two-solar-mass neutron star measured using Shapiro delay',
    summary: 'Neutron stars are composed of the densest form of matter known to exist in our Universe.',
  }

  it('asks the design-preview route by slug', async () => {
    respond(200, { query: 'neutron star', source: 'OpenAlex', items: [NEUTRON] })

    const papers = await fetchDesignOpenAlexPapers('neutron-stars')

    assert.deepEqual(requested, ['/api/design-threads/neutron-stars/openalex-papers'])
    assert.equal(papers.items[0].summary, NEUTRON.summary)
  })

  it('encodes the slug in the path', async () => {
    respond(200, { query: 'x', source: 'OpenAlex', items: [] })
    await fetchDesignOpenAlexPapers('expanding universe/../x')
    assert.deepEqual(requested, ['/api/design-threads/expanding%20universe%2F..%2Fx/openalex-papers'])
  })

  it('reports a slug the backend does not allow as a 404 ApiError', async () => {
    respond(404, { error: 'Research thread not found' })

    await assert.rejects(fetchDesignOpenAlexPapers('black-holes'), (error: unknown) => {
      assert.ok(error instanceof ApiError && !(error instanceof EndpointUnavailableError))
      assert.equal(error.status, 404)
      return true
    })
  })

  it('accepts a missing or null summary and drops items with a malformed one', () => {
    const papers = parseOpenAlexPapers({
      query: 'neutron star',
      source: 'OpenAlex',
      items: [NEUTRON, { ...PAPER, summary: null }, { ...PAPER, openalex_id: 'W9', summary: 42 }],
    })
    assert.deepEqual(papers?.items.map((item) => item.openalex_id), [NEUTRON.openalex_id, PAPER.openalex_id])
  })

  it("shows each paper's OpenAlex summary on its card", () => {
    const html = renderToStaticMarkup(
      <RelatedPapers
        papers={[]}
        emptyText="No papers are linked to this design preview yet."
        openAlex={{
          state: { status: 'ready', data: { query: 'neutron star', source: 'OpenAlex', items: [NEUTRON, PAPER] } },
          onRetry: () => {},
        }}
      />,
    )

    assert.match(html, /most-cited OpenAlex articles with “neutron star” in the title/)
    assert.match(html, /class="paper-card__summary">Neutron stars are composed of the densest form/)
    assert.equal((html.match(/class="paper-card__summary"/g) ?? []).length, 1)
    assert.doesNotMatch(html, /Full list of/)
  })
})

describe('Dark Matter preview', () => {
  const HALOS = {
    openalex_id: 'https://openalex.org/W1',
    title: 'The Structure of Cold Dark Matter Halos',
    authors: 'Julio F. Navarro, Carlos S. Frenk, Simon D. M. White',
    year: 1996,
    url: 'https://doi.org/10.1086/177173',
    summary: 'We use N-body simulations to investigate the structure of dark halos.',
  }
  const NO_ABSTRACT = { ...HALOS, openalex_id: 'https://openalex.org/W2', title: 'Particle dark matter', summary: null }

  it('is one of the design previews that use OpenAlex', () => {
    assert.deepEqual([...DESIGN_PAPER_PREVIEWS], ['dark-matter'])
  })

  it('asks the design-preview route for dark-matter', async () => {
    respond(200, { query: 'dark matter', source: 'OpenAlex', items: [HALOS] })

    await fetchDesignOpenAlexPapers('dark-matter')

    assert.deepEqual(requested, ['/api/design-threads/dark-matter/openalex-papers'])
  })

  it('shows abstracts, says when one is missing, and labels the papers as search results', () => {
    const html = renderToStaticMarkup(
      <RelatedPapers
        papers={[]}
        emptyText="No papers are linked to this design preview yet."
        openAlex={{
          state: { status: 'ready', data: { query: 'dark matter', source: 'OpenAlex', items: [HALOS, NO_ABSTRACT] } },
          onRetry: () => {},
        }}
      />,
    )

    assert.match(html, /No papers are linked to this thread in the AstroThread database yet/)
    assert.match(html, /most-cited OpenAlex articles with “dark matter” in the title: search results, not a curated list/)
    assert.match(html, /class="paper-card__summary">We use N-body simulations/)
    assert.match(html, /class="paper-card__summary paper-card__summary--missing">OpenAlex has no abstract for this paper\.</)
    assert.doesNotMatch(html, /Full list of|87 papers/)
  })
})

describe('searches with several title phrases (The Expanding Universe)', () => {
  const PHRASES = ['accelerating universe', 'high-redshift supernovae', 'Hubble constant', 'expansion of the universe']
  const RIESS = {
    openalex_id: 'https://openalex.org/W1',
    title: 'Observational Evidence from Supernovae for an Accelerating Universe and a Cosmological Constant',
    authors: 'Adam G. Riess, Alexei V. Filippenko, Peter Challis et al.',
    year: 1998,
    url: 'https://doi.org/10.1086/300499',
    summary: 'We present spectral and photometric observations of 10 Type Ia supernovae.',
  }

  it('lists the phrases in curly quotes', () => {
    assert.equal(quotedPhrases(['dark matter']), '“dark matter”')
    assert.equal(quotedPhrases(['a', 'b', 'c']), '“a”, “b” or “c”')
  })

  it('keeps phrases and the observational flag when the server sends them', () => {
    const papers = parseOpenAlexPapers({
      query: 'expanding universe', phrases: PHRASES, observational: true, source: 'OpenAlex', items: [RIESS],
    })
    assert.deepEqual(papers?.phrases, PHRASES)
    assert.equal(papers?.observational, true)
  })

  it('ignores malformed phrases and flags (older servers send neither)', () => {
    const papers = parseOpenAlexPapers({
      query: 'neutron star', phrases: ['ok', 3], observational: 'yes', source: 'OpenAlex', items: [],
    })
    assert.equal(papers?.phrases, undefined)
    assert.equal(papers?.observational, undefined)
  })

  it('names every phrase and the observational rule in the note', () => {
    const html = renderToStaticMarkup(
      <RelatedPapers
        papers={[]}
        emptyText="No papers are linked to this design preview yet."
        openAlex={{
          state: {
            status: 'ready',
            data: { query: 'expanding universe', phrases: PHRASES, observational: true, source: 'OpenAlex', items: [RIESS] },
          },
          onRetry: () => {},
        }}
      />,
    )
    assert.match(
      html,
      /most-cited OpenAlex articles with “accelerating universe”, “high-redshift supernovae”, “Hubble constant” or “expansion of the universe” in the title that report observations or measurements: search results, not a curated list\./,
    )
    assert.match(html, /We present spectral and photometric observations of 10 Type Ia supernovae\./)
  })

  it('keeps the single-phrase wording for other threads', () => {
    const html = renderToStaticMarkup(
      <RelatedPapers
        papers={[]}
        openAlex={{
          state: { status: 'ready', data: { query: 'neutron star', phrases: ['neutron star'], source: 'OpenAlex', items: [RIESS] } },
          onRetry: () => {},
        }}
      />,
    )
    assert.match(html, /articles with “neutron star” in the title: search results, not a curated list/)
    assert.doesNotMatch(html, /report observations/)
  })
})
