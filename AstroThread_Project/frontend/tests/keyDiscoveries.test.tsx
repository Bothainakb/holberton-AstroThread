// Tests for KEY DISCOVERIES (timeline_events, migration 009) in the evidence
// section: each discovery shows its year, title, text and a source link.
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import EvidenceSection from '../src/pages/ThreadDetails/sections/EvidenceSection'
import type { ApiTimelineEvent } from '../src/services/api'

const DISCOVERIES: ApiTimelineEvent[] = [
  {
    id: 250,
    year: 1992,
    title: 'First planets found beyond the Solar System',
    description: 'Planets around the pulsar PSR B1257+12.',
    source_name: 'Nature (Wolszczan & Frail, 1992)',
    source_url: 'https://www.nature.com/articles/355145a0',
  },
  {
    id: 251,
    year: 1995,
    title: 'First planet around a Sun-like star: 51 Pegasi b',
    description: 'Mayor and Queloz.',
    source_name: 'NobelPrize.org (Nobel Prize in Physics 2019)',
    source_url: 'https://www.nobelprize.org/prizes/physics/2019/press-release/',
  },
  {
    id: 252,
    year: 1999,
    title: 'First transit of an exoplanet: HD 209458 b',
    description: 'The first planetary transit observed.',
    source_name: 'arXiv (Charbonneau et al., 1999)',
    source_url: 'https://arxiv.org/abs/astro-ph/9911436',
  },
]

const render = (timeline: ApiTimelineEvent[]) =>
  renderToStaticMarkup(<EvidenceSection live={{ chart: null, timeline }} />)

describe('Key discoveries', () => {
  it('lists every discovery with its year, title and source link', () => {
    const html = render(DISCOVERIES)
    assert.match(html, /KEY DISCOVERIES/)
    assert.equal((html.match(/class="details-timeline__item"/g) ?? []).length, 3)
    for (const item of DISCOVERIES) {
      assert.ok(html.includes(`>${item.year}<`), String(item.year))
      assert.ok(html.includes(`href="${item.source_url}"`), item.source_url ?? '')
    }
    assert.match(html, /Source: Nature \(Wolszczan &amp; Frail, 1992\)/)
    assert.equal((html.match(/target="_blank" rel="noopener noreferrer"/g) ?? []).length, 3)
    assert.doesNotMatch(html, /No discoveries have been added to this thread yet/)
  })

  it('shows a discovery without a link when it has no https source', () => {
    const html = render([{ ...DISCOVERIES[0], source_url: 'javascript:alert(1)' }, { ...DISCOVERIES[1], source_url: null }])
    assert.equal((html.match(/class="details-timeline__item"/g) ?? []).length, 2)
    assert.doesNotMatch(html, /details-timeline__source/)
  })

  it('says there are no discoveries only when there are none', () => {
    assert.match(render([]), /No discoveries have been added to this thread yet/)
  })
})
