
import { useState } from 'react'
import Button from '../../components/Button/Button'
import Tag from '../../components/Tag/Tag'
import ThreadStages from '../../components/ThreadStages/ThreadStages'
import type { IconName } from '../../components/Icon/Icon'
import type { ChartPoint } from '../../data/home'
import { stageIcons, threadDetails, type RelatedPaper } from '../../data/threadDetails'
import { researchThreads, threadStages, type ResearchThread } from '../../data/threads'
import { routes } from '../../router/router'
import type { ApiThreadDetails } from '../../services/api'
import EvidenceSection, { type LiveEvidence } from './sections/EvidenceSection'
import LatestDevelopment from './sections/LatestDevelopment'
import NasaMediaSection from './sections/NasaMediaSection'
import RelatedPapers from './sections/RelatedPapers'
import StageNavigation from './sections/StageNavigation'
import StagePanel from './sections/StagePanel'
import ThreadHero from './sections/ThreadHero'
import { scrollToSection } from './scrollToSection'
import { useNasaMedia } from './useNasaMedia'
import { useThreadDetails, type ThreadDetailsState } from './useThreadDetails'
import './ThreadDetailsPage.css'

interface ThreadDetailsPageProps {
  threadId: string
}

const STAGE_SECTION_IDS = [
  'stage-content',
  'related-papers',
  'evidence',
  'evidence',
  'latest-developments',
]

function isChartPoint(value: unknown): value is ChartPoint {
  if (typeof value !== 'object' || value === null) return false
  const point = value as Record<string, unknown>
  return typeof point.year === 'number' && typeof point.value === 'number'
}

function liveChart(details: ApiThreadDetails): LiveEvidence['chart'] {
  for (const chart of details.charts) {
    const dataset = chart.dataset as { points?: unknown } | null
    const points = dataset?.points

    if (Array.isArray(points) && points.length > 1 && points.every(isChartPoint)) {
      const values = points.map((point) => point.value)
      const min = Math.min(...values)
      const max = Math.max(...values)
      const range = max - min

      const normalizedPoints: ChartPoint[] = points.map((point) => ({
        year: point.year,
        value: range === 0 ? 0.5 : 0.15 + ((point.value - min) / range) * 0.7,
      }))

      return {
        title: chart.title,
        note: chart.note,
        points: normalizedPoints,
      }
    }
  }

  return null
}

function livePapers(details: ApiThreadDetails): RelatedPaper[] {
  return details.papers.map((paper) => ({
    id: paper.id,
    year: paper.year,
    title: paper.title,
    authors: paper.authors ?? 'Unknown authors',
    url: paper.url ?? undefined,
    illustrative: paper.illustrative,
  }))
}

interface DetailsStatusProps {
  state: ThreadDetailsState
  hasSample: boolean
  onRetry: () => void
}

function DetailsStatus({ state, hasSample, onRetry }: DetailsStatusProps) {
  const fallback = hasSample
    ? 'The sections below show sample content from the design, not data from the database.'
    : 'The sections below show what is still to be added.'

  if (state.status === 'loading') {
    return (
      <p className="details-sample-note container" role="status">
        Loading thread details…
      </p>
    )
  }

  if (state.status === 'ready') {
    return (
      <p className="details-sample-note container" role="note">
        Thread information, timeline and papers come from the AstroThread database, and
        images from the NASA Image and Video Library. The stage-by-stage guide comes from the
        design.
      </p>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="details-status-banner container" role="alert">
        <p>
          Thread details could not be loaded: {state.message} {fallback}
        </p>
        <button type="button" className="button button--secondary" onClick={onRetry}>
          Try again
        </button>
      </div>
    )
  }

  const reason =
    state.status === 'unavailable'
      ? 'Thread details are not connected on this server yet.'
      : 'This thread is not in the AstroThread database yet.'

  return (
    <p className="details-sample-note container" role="note">
      {reason} {fallback}
    </p>
  )
}

function ThreadDetailsContent({ thread }: { thread: ResearchThread }) {
  const [stageNumber, setStageNumber] = useState(1)
  const { state, retry } = useThreadDetails(thread.title)
  const live = state.status === 'ready' ? state.details : null
  const nasa = useNasaMedia(live ? live.thread.id : null)

  const detail = threadDetails[thread.id]
  const sample = live || state.status === 'loading' ? undefined : detail
  const stages = detail
    ? detail.stages
    : threadStages.map((stage, index) => ({
        title: stage.title,
        summary: stage.description,
        icon: stageIcons[index],
        content: undefined,
      }))
  const stage = stages[stageNumber - 1]
  const icons = stages.map((item) => `stage-${item.icon}` as IconName)

  function goToStage(number: number) {
    setStageNumber(Math.min(Math.max(number, 1), stages.length))
    requestAnimationFrame(() => scrollToSection('stage-content'))
  }

  function handleStepSelect(number: number) {
    if (number === 1) setStageNumber(1)
    requestAnimationFrame(() => scrollToSection(STAGE_SECTION_IDS[number - 1]))
  }

  const hero = live
    ? {
        intro: live.thread.description,
        categories: [live.thread.category],
        paperCount: live.papers.length,
        updatedLabel: null,
      }
    : state.status === 'loading'
      ? {
          intro: thread.description,
          categories: [thread.category],
          paperCount: null,
          updatedLabel: null,
        }
      : {
          intro: detail?.intro ?? thread.description,
          categories: detail?.categories ?? [thread.category],
          paperCount: thread.paperCount,
          updatedLabel: thread.updatedLabel,
        }

  return (
    <main className="details-page" aria-busy={state.status === 'loading'}>
      <ThreadHero
        thread={thread}
        headline={detail?.headline ?? thread.title}
        intro={hero.intro}
        categories={hero.categories}
        paperCount={hero.paperCount}
        updatedLabel={hero.updatedLabel}
        onStartJourney={() => {
          setStageNumber(1)
          requestAnimationFrame(() => scrollToSection('follow-the-thread'))
        }}
      />

      <DetailsStatus state={state} hasSample={Boolean(detail)} onRetry={retry} />

      <section
        className="details-band details-journey"
        id="follow-the-thread"
        aria-labelledby="journey-title"
      >
        <div className="container">
          <div className="details-journey__header">
            <div className="details-heading">
              <Tag>Research journey</Tag>
              <h2
                className="details-heading__title details-heading__title--tagged"
                id="journey-title"
                tabIndex={-1}
              >
                Follow the thread, stage by stage
              </h2>
            </div>
            <p className="details-journey__count">
              Stage {stageNumber} of {stages.length}
            </p>
          </div>

          <div className="details-journey__stages">
            <ThreadStages
              className="thread-stages--details"
              stages={stages.map((item) => ({
                title: item.title,
                description: item.summary,
              }))}
              currentStage={stageNumber}
              icons={icons}
              onSelect={handleStepSelect}
            />
          </div>
        </div>
      </section>

      <StagePanel
        stageNumber={stageNumber}
        title={stage.title}
        summary={stage.summary}
        content={stage.content}
      />

      {live ? (
        <>
          <RelatedPapers
            papers={livePapers(live)}
            emptyText="No papers have been linked to this thread in the database yet."
          />

          <EvidenceSection live={{ chart: liveChart(live), timeline: live.timeline }} />

          <NasaMediaSection live={nasa.state} onRetry={nasa.retry} />

          <LatestDevelopment
            latest={
              live.latest
                ? {
                    day: '',
                    year: String(live.latest.year),
                    title: live.latest.title,
                    text: live.latest.description ?? '',
                  }
                : undefined
            }
          />
        </>
      ) : (
        state.status !== 'loading' && (
          <>
            <RelatedPapers papers={sample?.papers} paperCount={thread.paperCount} />
            <EvidenceSection evidence={sample?.evidence} />
            <NasaMediaSection nasa={sample?.nasa} />
            <LatestDevelopment latest={sample?.latest} />
          </>
        )
      )}

      <StageNavigation
        stageNumber={stageNumber}
        stageTitles={stages.map((item) => item.title)}
        onChange={goToStage}
      />
    </main>
  )
}

function ThreadDetailsPage({ threadId }: ThreadDetailsPageProps) {
  const thread = researchThreads.find((item) => item.id === threadId)

  if (!thread) {
    return (
      <main className="details-page">
        <section className="details-missing container" aria-labelledby="missing-title">
          <h1 className="details-missing__title" id="missing-title">
            Thread not found
          </h1>
          <p className="details-missing__text">This research thread does not exist.</p>
          <Button href={routes.researchThreads}>Back to Research Threads</Button>
        </section>
      </main>
    )
  }

  return <ThreadDetailsContent thread={thread} />
}

export default ThreadDetailsPage
