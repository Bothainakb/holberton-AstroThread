// Tests for the Latest Developments section with database developments
// (latest_developments, migration 008): one card per development in the
// order the API sends (newest first), each linking to its source.
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import LatestDevelopment from '../src/pages/ThreadDetails/sections/LatestDevelopment'
import type { ApiDevelopment } from '../src/services/api'

const DEVELOPMENTS: ApiDevelopment[] = [
  {
    id: 6,
    date: '2025-09-10',
    title: "Hawking's black hole area theorem confirmed",
    text: 'GW250114 verifies the area theorem.',
    source_name: 'LIGO Lab, Caltech',
    source_url: 'https://www.ligo.caltech.edu/news/ligo20250910',
  },
  {
    id: 3,
    date: '2022-05-12',
    title: 'First image of the black hole at the heart of our galaxy',
    text: 'Sagittarius A*.',
    source_name: 'ESO (Event Horizon Telescope release)',
    source_url: 'https://www.eso.org/public/news/eso2208-eht-mw/',
  },
  {
    id: 1,
    date: '2019-04-10',
    title: 'First image of a black hole',
    text: 'M87*.',
    source_name: 'ESO (Event Horizon Telescope release)',
    source_url: 'https://www.eso.org/public/news/eso1907/',
  },
]

const count = (html: string, pattern: RegExp) => (html.match(pattern) ?? []).length

describe('Latest Developments from the database', () => {
  it('shows one card per development, newest first, with its date', () => {
    const html = renderToStaticMarkup(<LatestDevelopment developments={DEVELOPMENTS} />)
    assert.equal(count(html, /<article class="latest-card">/g), 3)
    const titles = [...html.matchAll(/latest-card__title">([^<]+)/g)].map((match) => match[1])
    assert.deepEqual(titles, DEVELOPMENTS.map((item) => item.title.replace("'", '&#x27;')))
    assert.match(html, /latest-card__day">Sep 10<\/span><span class="latest-card__year">2025/)
    assert.match(html, /latest-card__day">Apr 10<\/span><span class="latest-card__year">2019/)
    // Only the newest card is tagged.
    assert.equal(count(html, /Most recent/g), 1)
  })

  it('links every card to its source and no longer says the story is unavailable', () => {
    const html = renderToStaticMarkup(<LatestDevelopment developments={DEVELOPMENTS} />)
    for (const item of DEVELOPMENTS) {
      assert.ok(html.includes(`href="${item.source_url}"`), item.source_url ?? '')
    }
    assert.equal(count(html, /target="_blank" rel="noopener noreferrer"/g), 3)
    assert.match(html, /Read on LIGO Lab, Caltech/)
    assert.doesNotMatch(html, /Full story not available yet/)
  })

  it('never links to a non-https source', () => {
    const unsafe = [{ ...DEVELOPMENTS[0], source_url: 'javascript:alert(1)' }]
    const html = renderToStaticMarkup(<LatestDevelopment developments={unsafe} />)
    assert.doesNotMatch(html, /href=/)
    assert.match(html, /Full story not available yet/)
  })

  it('shows the empty state when the database has no developments', () => {
    const html = renderToStaticMarkup(<LatestDevelopment developments={[]} />)
    assert.match(html, /Recent developments for this thread have not been added yet\./)
    assert.doesNotMatch(html, /latest-card"/)
  })
})
