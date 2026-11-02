// Tests for Related Research Papers and NASA media on Thread Details: at most
// three of each (the first, most relevant ones), each link opening in the same tab.
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import NasaMediaSection, { MAX_NASA_IMAGES } from '../src/pages/ThreadDetails/sections/NasaMediaSection'
import RelatedPapers, { MAX_PAPERS } from '../src/pages/ThreadDetails/sections/RelatedPapers'

const count = (html: string, pattern: RegExp) => (html.match(pattern) ?? []).length
const hrefs = (html: string, className: string) =>
  [...html.matchAll(new RegExp(`class="${className}" href="([^"]+)"`, 'g'))].map((match) => match[1])

const PAPERS = [1, 2, 3, 4, 5].map((n) => ({
  id: n,
  year: 2000 + n,
  title: `Paper ${n}`,
  authors: 'A. Author',
  url: `https://doi.org/10.1000/paper-${n}`,
}))

const OPENALEX = [1, 2, 3, 4, 5, 6].map((n) => ({
  openalex_id: `https://openalex.org/W${n}`,
  title: `Cited paper ${n}`,
  authors: 'B. Author',
  year: 1990 + n,
  url: `https://doi.org/10.2000/cited-${n}`,
  summary: null,
}))

const IMAGES = [1, 2, 3, 4, 5, 6].map((n) => ({
  nasa_id: `PIA0000${n}`,
  title: `Image ${n}`,
  description: 'A NASA image.',
  date: '2017-11-02',
  center: 'JPL',
  credit: null,
  image_url: `https://images-assets.nasa.gov/image/PIA0000${n}/PIA0000${n}~thumb.jpg`,
  source_url: `https://images.nasa.gov/details/PIA0000${n}`,
}))

describe('Related Research Papers', () => {
  it('shows three papers per thread', () => {
    assert.equal(MAX_PAPERS, 3)
  })

  it('shows only the first three database papers, with their own URLs', () => {
    const html = renderToStaticMarkup(<RelatedPapers papers={PAPERS} />)
    assert.equal(count(html, /<article class="paper-card">/g), 3)
    assert.deepEqual(hrefs(html, 'paper-card__link'), PAPERS.slice(0, 3).map((paper) => paper.url))
    assert.doesNotMatch(html, /Paper 4|Paper 5/)
  })

  it('shows only the three most-cited OpenAlex papers when the thread has none linked', () => {
    const html = renderToStaticMarkup(
      <RelatedPapers
        papers={[]}
        openAlex={{
          state: { status: 'ready', data: { query: 'dark matter', source: 'OpenAlex', items: OPENALEX } },
          onRetry: () => {},
        }}
      />,
    )
    assert.equal(count(html, /<article class="paper-card">/g), 3)
    assert.deepEqual(hrefs(html, 'paper-card__link'), OPENALEX.slice(0, 3).map((paper) => paper.url))
  })

  it('opens every paper link in the same tab', () => {
    const html = renderToStaticMarkup(<RelatedPapers papers={PAPERS} />)
    assert.doesNotMatch(html, /target=/)
  })
})

describe('NASA media', () => {
  const html = renderToStaticMarkup(
    <NasaMediaSection live={{ status: 'ready', media: { query: 'black hole', source: 'NASA Image and Video Library', items: IMAGES } }} />,
  )

  it('shows only the first three images, each linked to its NASA page', () => {
    assert.equal(MAX_NASA_IMAGES, 3)
    assert.equal(count(html, /<article class="nasa-card nasa-card--live">/g), 3)
    assert.deepEqual(hrefs(html, 'nasa-card__link'), IMAGES.slice(0, 3).map((image) => image.source_url))
    assert.doesNotMatch(html, /Image 4|Image 5|Image 6/)
  })

  it('opens every NASA link in the same tab', () => {
    assert.doesNotMatch(html, /target=/)
  })
})
