
import { useEffect, useState } from 'react'
import Button from '../../components/Button/Button'
import Tag from '../../components/Tag/Tag'
import ThreadStages from '../../components/ThreadStages/ThreadStages'
import type { IconName } from '../../components/Icon/Icon'
import type { ChartPoint } from '../../data/home'
import { useAuth } from '../../auth/auth'
import {
  stageIcons,
  threadDetails,
  type DetailStage,
  type RelatedPaper,
  type StageIcon,
} from '../../data/threadDetails'
import { researchThreads, threadStages, type ResearchThread } from '../../data/threads'
import { replacePath, routes, threadDetailsPath } from '../../router/router'
import { saveThreadProgress, type ApiThreadDetails, type ApiThreadStage } from '../../services/api'
import { parseMeasuredChart } from '../../services/chartData'
import EvidenceSection, { type LiveEvidence } from './sections/EvidenceSection'
import LatestDevelopment from './sections/LatestDevelopment'
import NasaMediaSection from './sections/NasaMediaSection'
import RelatedPapers from './sections/RelatedPapers'
import StageNavigation from './sections/StageNavigation'
import StagePanel from './sections/StagePanel'
import ThreadHero from './sections/ThreadHero'
import { scrollToSection } from './scrollToSection'
import { researchThreadFor, threadSlug } from './threadRoute'
import { useDesignNasaMedia, useNasaMedia } from './useNasaMedia'
import { DESIGN_PAPER_PREVIEWS, useDesignOpenAlexPapers, useOpenAlexPapers } from './useOpenAlexPapers'
import { useThreadBookmark } from './useThreadBookmark'
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

/**
 * The thread's chart: the first one with a source, else an older unsourced
 * chart scaled into the 0-1 range DataChart expects (shown with its own note).
 */
function liveChart(details: ApiThreadDetails): LiveEvidence['chart'] {
  for (const chart of details.charts) {
    const measured = parseMeasuredChart(chart)
    if (measured) return { kind: 'measured', data: measured }
  }

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
        kind: 'illustrative',
        title: chart.title,
        note: chart.note,
        points: normalizedPoints,
      }
    }
  }

  return null
}

/** Database stages in the shape the stage guide shows. */
function liveStages(stages: ApiThreadStage[]): DetailStage[] {
  return stages.map((stage, index) => ({
    title: stage.title,
    summary: stage.summary,
    icon: stageIcons.includes(stage.icon as StageIcon)
      ? (stage.icon as StageIcon)
      : stageIcons[index % stageIcons.length],
    content:
      stage.paragraphs.length > 0 || stage.facts.length > 0
        ? { paragraphs: stage.paragraphs, facts: stage.facts }
        : undefined,
  }))
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
  /** The design has sample content for this thread (only Black Holes). */
  hasSample: boolean
  /** A design preview whose related papers come from an OpenAlex search. */
  openAlexPapers?: boolean
  onRetry: () => void
}

function DetailsStatus({ state, hasSample, openAlexPapers = false, onRetry }: DetailsStatusProps) {
  const fallback = hasSample
    ? 'The sections below show sample content from the design, not data from the database.'
    : openAlexPapers
      ? 'This is a design preview: related papers come from an OpenAlex search and images from the NASA Image and Video Library. It has no stage guide, timeline, measurements or latest developments yet.'
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
        Thread information, research stages, timeline and papers come from the AstroThread database (threads
        with no linked papers show an OpenAlex search instead), and images from the NASA Image
        and Video Library.
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

interface ThreadDetailsContentProps {
  thread: ResearchThread
  state: ThreadDetailsState
  retry: () => void
}

function ThreadDetailsContent({ thread, state, retry }: ThreadDetailsContentProps) {
  const [stageNumber, setStageNumber] = useState(1)
  const live = state.status === 'ready' ? state.details : null
  const nasa = useNasaMedia(live ? live.thread.id : null)
  // Only threads with no papers in the database search OpenAlex.
  const openAlex = useOpenAlexPapers(live && live.papers.length === 0 ? live.thread.id : null)
  // Only database threads can be saved.
  const bookmark = useThreadBookmark(live ? live.thread.id : null)
  // Design previews with no database record: real papers from OpenAlex (by
  // slug) instead of the design's paper count, for the slugs the backend allows.
  const designPapersSlug =
    state.status === 'not-in-database' && DESIGN_PAPER_PREVIEWS.has(thread.id) ? thread.id : null
  const designPapers = useDesignOpenAlexPapers(designPapersSlug)
  const designNasa = useDesignNasaMedia(designPapersSlug)

  const auth = useAuth()

  const detail = threadDetails[thread.id]
  const sample = live || state.status === 'loading' ? undefined : detail
  // Stages come from the database (thread_stages) when it has them.
  const stages = live?.stages?.length
    ? liveStages(live.stages)
    : detail
      ? detail.stages
      : threadStages.map((stage, index) => ({
          title: stage.title,
          summary: stage.description,
          icon: stageIcons[index],
          content: undefined,
        }))
  const stage = stages[stageNumber - 1]
  const icons = stages.map((item) => `stage-${item.icon}` as IconName)

  /** Saves the signed-in user's progress when they open a database stage. */
  function recordStage(number: number) {
    if (!live?.stages?.length || auth.status !== 'signed-in') return
    // Progress is a convenience: a failed save never interrupts reading.
    saveThreadProgress(live.thread.id, live.stages.length, number).catch(() => {})
  }

  function goToStage(number: number) {
    const next = Math.min(Math.max(number, 1), stages.length)
    setStageNumber(next)
    recordStage(next)
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
          // A design preview with OpenAlex papers shows no design count or date:
          // neither is real data.
          paperCount: designPapersSlug ? null : thread.paperCount,
          updatedLabel: designPapersSlug ? null : thread.updatedLabel,
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
        bookmark={{ state: bookmark.state, notice: bookmark.notice, onToggle: bookmark.toggle }}
        stagesNote={designPapersSlug ? 'Stage guide not written yet' : undefined}
        onStartJourney={() => {
          setStageNumber(1)
          recordStage(1)
          requestAnimationFrame(() => scrollToSection('follow-the-thread'))
        }}
      />

      <DetailsStatus
        state={state}
        hasSample={Boolean(detail)}
        openAlexPapers={designPapersSlug !== null}
        onRetry={retry}
      />

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
        emptyText={
          designPapersSlug
            ? `This design preview has no ${stage.title} stage content yet. The five stages are the common outline of every thread; their written guide comes from the AstroThread database.`
            : undefined
        }
      />

      {live ? (
        <>
          <RelatedPapers
            papers={livePapers(live)}
            emptyText="No papers have been linked to this thread in the database yet."
            openAlex={{ state: openAlex.state, onRetry: openAlex.retry }}
          />

          <EvidenceSection live={{ chart: liveChart(live), timeline: live.timeline }} />

          <NasaMediaSection live={nasa.state} onRetry={nasa.retry} />

          <LatestDevelopment
            developments={live.developments}
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
            {designPapersSlug ? (
              <>
                <RelatedPapers
                  papers={[]}
                  emptyText="No papers are linked to this design preview yet."
                  openAlex={{ state: designPapers.state, onRetry: designPapers.retry }}
                />
                <EvidenceSection emptyText="This design preview has no verified measurements or discovery timeline: those come from the AstroThread database, which has no record of this thread yet." />
                <NasaMediaSection live={designNasa.state} onRetry={designNasa.retry} />
                <LatestDevelopment emptyText="Latest developments are not available for this design preview: AstroThread has no reliable source for recent developments of threads outside its database, so none are shown." />
              </>
            ) : (
              <>
                <RelatedPapers papers={sample?.papers} paperCount={thread.paperCount} />
                <EvidenceSection evidence={sample?.evidence} />
                <NasaMediaSection nasa={sample?.nasa} />
                <LatestDevelopment latest={sample?.latest} />
              </>
            )}
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

interface MissingThreadProps {
  title: string
  text: string
  onRetry?: () => void
}

function MissingThread({ title, text, onRetry }: MissingThreadProps) {
  return (
    <main className="details-page">
      <section className="details-missing container" aria-labelledby="missing-title">
        <h1 className="details-missing__title" id="missing-title">
          {title}
        </h1>
        <p className="details-missing__text" role={onRetry ? 'alert' : undefined}>
          {text}
        </p>
        {onRetry && (
          <button type="button" className="button button--secondary" onClick={onRetry}>
            Try again
          </button>
        )}
        <Button href={routes.researchThreads}>Back to Research Threads</Button>
      </section>
    </main>
  )
}

/**
 * "/research-threads/:threadId": the slug or database id is looked up in the
 * database threads. Threads that exist only in the design list (no database
 * record yet) keep showing their design content with a note.
 */
function ThreadDetailsPage({ threadId }: ThreadDetailsPageProps) {
  const { state, retry } = useThreadDetails(threadId)
  const live = state.status === 'ready' ? state.details.thread : null
  const canonical = live ? threadSlug(live) : null

  // A database id ("/research-threads/1") becomes the thread's slug address.
  useEffect(() => {
    if (canonical && canonical !== threadId) replacePath(threadDetailsPath(canonical))
  }, [canonical, threadId])

  const thread = live
    ? researchThreadFor(live, researchThreads, threadStages.length)
    : researchThreads.find((item) => item.id === threadId)

  if (thread) return <ThreadDetailsContent thread={thread} state={state} retry={retry} />

  if (state.status === 'loading') {
    return (
      <main className="details-page" aria-busy="true">
        <p className="details-sample-note container" role="status">
          Loading thread details…
        </p>
      </main>
    )
  }
  if (state.status === 'error') {
    return (
      <MissingThread
        title="Thread could not be loaded"
        text={`Thread details could not be loaded: ${state.message}`}
        onRetry={retry}
      />
    )
  }
  if (state.status === 'unavailable') {
    return (
      <MissingThread
        title="Thread could not be loaded"
        text="Thread details are not connected on this server yet."
      />
    )
  }
  return <MissingThread title="Thread not found" text="This research thread does not exist." />
}

export default ThreadDetailsPage
