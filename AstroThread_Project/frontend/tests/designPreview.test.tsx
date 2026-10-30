// Tests for the design-preview sections of Thread Details (Dark Matter, shown
// when the database has no record of it yet) and that database-backed threads
// keep their existing wording and content. fetch is replaced; no backend is
// contacted.
import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { researchThreads } from '../src/data/threads'
import EvidenceSection from '../src/pages/ThreadDetails/sections/EvidenceSection'
import LatestDevelopment from '../src/pages/ThreadDetails/sections/LatestDevelopment'
import NasaMediaSection from '../src/pages/ThreadDetails/sections/NasaMediaSection'
import StagePanel from '../src/pages/ThreadDetails/sections/StagePanel'
import ThreadHero from '../src/pages/ThreadDetails/sections/ThreadHero'
import { fetchDesignNasaMedia } from '../src/services/api'

const realFetch = globalThis.fetch
let requested: string[] = []

afterEach(() => {
  globalThis.fetch = realFetch
})

describe('NASA images for design previews', () => {
  it('asks the design-preview route by slug', async () => {
    requested = []
    globalThis.fetch = async (input: RequestInfo | URL) => {
      requested.push(String(input))
      return new Response(JSON.stringify({ query: 'dark matter', source: 'NASA Image and Video Library', items: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const media = await fetchDesignNasaMedia('dark-matter')

    assert.deepEqual(requested, ['/api/design-threads/dark-matter/nasa-media'])
    assert.equal(media.query, 'dark matter')
  })

  it('renders real NASA results in the live section, with the NASA attribution', () => {
    const html = renderToStaticMarkup(
      <NasaMediaSection
        live={{
          status: 'ready',
          media: {
            query: 'neutron star',
            source: 'NASA Image and Video Library',
            items: [
              {
                nasa_id: 'PIA21910',
                title: 'Spitzer Observes Neutron Star Collision',
                description: null,
                date: '2017-10-16',
                center: 'JPL',
                credit: null,
                image_url: 'https://images-assets.nasa.gov/image/PIA21910/PIA21910~thumb.jpg',
                source_url: 'https://images.nasa.gov/details/PIA21910',
              },
            ],
          },
        }}
      />,
    )
    assert.match(html, /Spitzer Observes Neutron Star Collision/)
    assert.match(html, /NASA does not endorse AstroThread/)
    assert.doesNotMatch(html, /placeholders from the design/)
  })
})

describe('Latest Developments', () => {
  it('says plainly that design previews have no source for developments', () => {
    const html = renderToStaticMarkup(
      <LatestDevelopment emptyText="Latest developments are not available for this design preview." />,
    )
    assert.match(html, /Latest developments are not available for this design preview\./)
    assert.doesNotMatch(html, /latest-card/)
  })

  it('keeps the database wording and card for database threads', () => {
    assert.match(renderToStaticMarkup(<LatestDevelopment />), /Recent developments for this thread have not been added yet\./)
    const html = renderToStaticMarkup(
      <LatestDevelopment latest={{ day: '', year: '2019', title: 'First image of a black hole', text: 'EHT' }} />,
    )
    assert.match(html, /class="latest-card"/)
    assert.match(html, /First image of a black hole/)
  })
})

describe('Evidence (measurements and timeline)', () => {
  it('explains why a design preview has no measurements or timeline', () => {
    const html = renderToStaticMarkup(<EvidenceSection emptyText="This design preview has no verified measurements or discovery timeline." />)
    assert.match(html, /no verified measurements or discovery timeline/)
  })

  it('keeps the default wording and the live timeline for database threads', () => {
    assert.match(renderToStaticMarkup(<EvidenceSection />), /Charts and key measurements for this thread have not been added yet\./)
    const html = renderToStaticMarkup(
      <EvidenceSection
        live={{ chart: null, timeline: [{ id: 1, year: 1916, title: 'Schwarzschild solution', description: null }] }}
      />,
    )
    assert.match(html, /class="details-timeline__year">1916/)
    assert.match(html, /Schwarzschild solution/)
  })
})

describe('Stages', () => {
  it('does not claim stage content for a design preview', () => {
    const html = renderToStaticMarkup(
      <StagePanel stageNumber={1} title="Origin" summary="First ideas" emptyText="This design preview has no Origin stage content yet." />,
    )
    assert.match(html, /This design preview has no Origin stage content yet\./)
    assert.doesNotMatch(html, /once the backend is connected/)
  })

  it('keeps the database wording, and stage content where it exists', () => {
    assert.match(renderToStaticMarkup(<StagePanel stageNumber={2} title="Research" summary="Papers" />), /once the backend is connected/)
    const html = renderToStaticMarkup(
      <StagePanel stageNumber={1} title="Origin" summary="First ideas" content={{ paragraphs: ['In 1783 John Michell…'], facts: [] }} />,
    )
    assert.match(html, /In 1783 John Michell/)
  })

  const hero = (stagesNote?: string) =>
    renderToStaticMarkup(
      <ThreadHero
        thread={researchThreads.find((thread) => thread.id === 'dark-matter')!}
        headline="Dark Matter"
        intro="Intro"
        categories={['Cosmology']}
        paperCount={null}
        updatedLabel={null}
        onStartJourney={() => {}}
        stagesNote={stagesNote}
        bookmark={{ state: { status: 'unavailable' }, notice: null, onToggle: () => {} }}
      />,
    )

  it('shows "Stage guide not written yet" instead of a stage count for previews', () => {
    const html = hero('Stage guide not written yet')
    assert.match(html, /Stage guide not written yet/)
    assert.doesNotMatch(html, /research stages|papers</)
  })

  it('keeps "5 research stages" for database threads', () => {
    assert.match(hero(), /5 research stages/)
  })
})
