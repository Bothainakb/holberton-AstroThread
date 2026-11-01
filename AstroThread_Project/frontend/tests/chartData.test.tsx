// Tests for sourced charts: parseMeasuredChart and the tick helpers
// (services/chartData.ts) and what MeasuredChart renders.
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import MeasuredChart from '../src/components/MeasuredChart/MeasuredChart'
import { niceTicks, parseMeasuredChart, yearTicks } from '../src/services/chartData'

const SOURCE = {
  name: 'GWOSC, Gravitational-wave Transient Catalog',
  url: 'https://gwosc.org/eventapi/html/GWTC/',
  retrieved: '2026-10-29',
  detail: '391 events in total.',
}

const RUNS = {
  title: 'Confident gravitational-wave detections per observing run',
  chart_type: 'bar',
  note: 'Events in the cumulative GWTC list.',
  dataset: {
    x: { label: 'Observing run', unit: null, kind: 'category' },
    y: { label: 'Number of detections', unit: null },
    points: [
      { label: 'O1', sublabel: '2015', y: 3 },
      { label: 'O4b', sublabel: '2024–25', y: 161 },
    ],
    source: SOURCE,
  },
}

const MASSES = {
  title: 'Mass of the black hole formed in each observed merger',
  chart_type: 'scatter',
  note: null,
  dataset: {
    x: { label: 'Detection date', unit: null, kind: 'year' },
    y: { label: 'Final black-hole mass', unit: 'solar masses, M☉' },
    points: [
      { x: 2015.702, y: 61.5, label: 'GW150914' },
      { x: 2023.9, y: 222, label: 'GW231123_135430' },
    ],
    source: SOURCE,
  },
}

describe('parseMeasuredChart', () => {
  it('reads a sourced category chart and a sourced year chart', () => {
    const runs = parseMeasuredChart(RUNS)
    assert.equal(runs?.type, 'bar')
    assert.equal(runs?.x.kind, 'category')
    assert.deepEqual(runs?.points[1], { label: 'O4b', sublabel: '2024–25', y: 161 })
    assert.equal(runs?.source.url, SOURCE.url)

    const masses = parseMeasuredChart(MASSES)
    assert.equal(masses?.y.unit, 'solar masses, M☉')
    assert.deepEqual(masses?.points[0], { x: 2015.702, label: 'GW150914', y: 61.5 })
  })

  it('rejects the illustrative row and any dataset without a usable source', () => {
    const illustrative = {
      title: 'Illustrative observations over time',
      chart_type: 'line',
      note: 'Illustrative sample values only; not measured astronomical data.',
      dataset: { points: [{ year: 2015, value: 10 }, { year: 2017, value: 18 }] },
    }
    assert.equal(parseMeasuredChart(illustrative), null)
    const { source: _source, ...withoutSource } = RUNS.dataset
    void _source
    assert.equal(parseMeasuredChart({ ...RUNS, dataset: withoutSource }), null)
    assert.equal(
      parseMeasuredChart({ ...RUNS, dataset: { ...RUNS.dataset, source: { ...SOURCE, url: 'javascript:alert(1)' } } }),
      null,
    )
    assert.equal(
      parseMeasuredChart({ ...RUNS, dataset: { ...RUNS.dataset, source: { ...SOURCE, url: 'http://gwosc.org/' } } }),
      null,
    )
  })

  it('rejects unknown chart types and malformed points instead of dropping them', () => {
    assert.equal(parseMeasuredChart({ ...RUNS, chart_type: 'pie' }), null)
    assert.equal(parseMeasuredChart({ ...RUNS, dataset: { ...RUNS.dataset, points: [] } }), null)
    assert.equal(
      parseMeasuredChart({ ...RUNS, dataset: { ...RUNS.dataset, points: [{ label: 'O1', y: '3' }] } }),
      null,
    )
    assert.equal(
      parseMeasuredChart({ ...MASSES, dataset: { ...MASSES.dataset, points: [{ y: 61.5 }] } }),
      null,
    )
  })
})

describe('tick helpers', () => {
  it('gives round y ticks from 0 that cover the largest value', () => {
    assert.deepEqual(niceTicks(161), [0, 50, 100, 150, 200])
    assert.deepEqual(niceTicks(1504), [0, 500, 1000, 1500, 2000])
    assert.deepEqual(niceTicks(222), [0, 50, 100, 150, 200, 250])
    assert.deepEqual(niceTicks(0), [0, 1])
  })

  it('gives whole-year x ticks inside the range', () => {
    assert.deepEqual(yearTicks(1991.5, 2025.5), [1995, 2000, 2005, 2010, 2015, 2020, 2025])
    assert.deepEqual(yearTicks(2015.45, 2025.3), [2016, 2018, 2020, 2022, 2024])
  })
})

describe('MeasuredChart', () => {
  it('shows the title, labelled axes, values and a linked source', () => {
    const html = renderToStaticMarkup(<MeasuredChart chart={parseMeasuredChart(RUNS)!} />)

    assert.match(html, /Confident gravitational-wave detections per observing run/)
    assert.match(html, />Number of detections</)
    assert.match(html, />Observing run</)
    assert.match(html, />O1</)
    assert.match(html, />2024–25</)
    assert.match(html, />161</)
    assert.match(html, /href="https:\/\/gwosc\.org\/eventapi\/html\/GWTC\/"/)
    assert.match(html, /retrieved 2026-10-29/)
    assert.match(html, /<table class="visually-hidden">/)
  })

  it('puts the unit in the axis title and each point in the data table', () => {
    const html = renderToStaticMarkup(<MeasuredChart chart={parseMeasuredChart(MASSES)!} />)

    assert.match(html, /Final black-hole mass \(solar masses, M☉\)/)
    assert.match(html, /<td>GW150914, 2015\.70<\/td><td>61\.5<\/td>/)
    assert.match(html, /GW231123_135430, 2023\.90: 222 solar masses, M☉/)
    assert.equal((html.match(/class="measured-chart__dot"/g) ?? []).length, 2)
  })
})
