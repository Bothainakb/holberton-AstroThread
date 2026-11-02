// Tests for the Data stage on Thread Details: its chart and key discoveries are
// shown in the stage card (compact cards on the right), not in a page section.
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import StagePanel from '../src/pages/ThreadDetails/sections/StagePanel'

const CONTENT = {
  paragraphs: ['Gravitational-wave detectors now measure the mass of every black hole formed in a merger.'],
  facts: [
    { label: 'DATA SOURCE', title: 'GWTC', text: 'The Gravitational-wave Transient Catalog.' },
    { label: 'UNIT', title: 'Solar masses', text: "Multiples of the Sun's mass." },
  ],
}

const DISCOVERIES = [
  {
    label: 'KEY DISCOVERY · 1916',
    title: 'Schwarzschild solution',
    text: "Karl Schwarzschild finds the first exact solution of Einstein's equations.",
    source: { name: 'arXiv', url: 'https://arxiv.org/abs/physics/9905030' },
  },
  {
    label: 'KEY DISCOVERY · 2019',
    title: 'First image of a black hole',
    text: 'The Event Horizon Telescope images M87.',
    source: { name: 'ESO', url: 'javascript:alert(1)' },
  },
]

function render(props: Partial<Parameters<typeof StagePanel>[0]> = {}) {
  return renderToStaticMarkup(
    <StagePanel stageNumber={4} title="Data" summary="What the measurements show" content={CONTENT} {...props} />,
  )
}

describe('Data stage', () => {
  it('shows the chart under the stage text', () => {
    const html = render({ media: <figure className="test-chart">chart</figure>, extraFacts: DISCOVERIES })
    assert.match(html, />Stage 04</)
    assert.match(html, /details-stage__text[\s\S]*details-stage__media[\s\S]*test-chart/)
  })

  it('lists the stage facts, then each key discovery as a compact card', () => {
    const html = render({ extraFacts: DISCOVERIES })
    assert.equal((html.match(/class="details-fact"/g) ?? []).length, 4)
    const titles = [...html.matchAll(/details-fact__title">([^<]+)/g)].map((m) => m[1])
    assert.deepEqual(titles, ['GWTC', 'Solar masses', 'Schwarzschild solution', 'First image of a black hole'])
    assert.match(html, /KEY DISCOVERY · 1916/)
    assert.match(html, /first exact solution of Einstein&#x27;s equations/)
  })

  it('links a discovery to its https source in the same tab, and never to an unsafe one', () => {
    const html = render({ extraFacts: DISCOVERIES })
    assert.match(html, /href="https:\/\/arxiv\.org\/abs\/physics\/9905030"/)
    assert.match(html, /Source: arXiv/)
    assert.doesNotMatch(html, /javascript:/)
    assert.doesNotMatch(html, /target=/)
  })

  it('leaves other stages unchanged when nothing extra is passed', () => {
    const html = render()
    assert.equal((html.match(/class="details-fact"/g) ?? []).length, 2)
    assert.doesNotMatch(html, /details-stage__media|KEY DISCOVERY/)
    assert.doesNotMatch(html, /Explore Research|#related-papers/)
  })
})
