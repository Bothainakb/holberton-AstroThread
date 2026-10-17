import { useState } from 'react'
import Button from '../../components/Button/Button'
import Tag from '../../components/Tag/Tag'
import ThreadStages from '../../components/ThreadStages/ThreadStages'
import type { IconName } from '../../components/Icon/Icon'
import { stageIcons, threadDetails } from '../../data/threadDetails'
import { researchThreads, threadStages } from '../../data/threads'
import { routes } from '../../router/router'
import EvidenceSection from './sections/EvidenceSection'
import LatestDevelopment from './sections/LatestDevelopment'
import NasaMediaSection from './sections/NasaMediaSection'
import RelatedPapers from './sections/RelatedPapers'
import StageNavigation from './sections/StageNavigation'
import StagePanel from './sections/StagePanel'
import ThreadHero from './sections/ThreadHero'
import { scrollToSection } from './scrollToSection'
import './ThreadDetailsPage.css'

interface ThreadDetailsPageProps {
  threadId: string
}

// Figma prototype: each stage step scrolls to the section that covers it.
const STAGE_SECTION_IDS = [
  'stage-content', // 1 Origin -> the stage panel
  'related-papers', // 2 Research
  'evidence', // 3 Discoveries
  'evidence', // 4 Data
  'latest-developments', // 5 Latest Developments
]

function ThreadDetailsPage({ threadId }: ThreadDetailsPageProps) {
  const [stageNumber, setStageNumber] = useState(1)
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

  // Only Black Holes has detail content in Figma; other threads fall back to
  // their list data and labeled placeholders.
  const detail = threadDetails[thread.id]
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

  // Previous / Next switch the stage panel.
  function goToStage(number: number) {
    setStageNumber(Math.min(Math.max(number, 1), stages.length))
    requestAnimationFrame(() => scrollToSection('stage-content'))
  }

  // Stage steps scroll to their section; Origin also shows the Origin panel.
  function handleStepSelect(number: number) {
    if (number === 1) setStageNumber(1)
    requestAnimationFrame(() => scrollToSection(STAGE_SECTION_IDS[number - 1]))
  }

  return (
    <main className="details-page">
      <ThreadHero
        thread={thread}
        headline={detail?.headline ?? thread.title}
        intro={detail?.intro ?? thread.description}
        categories={detail?.categories ?? [thread.category]}
        onStartJourney={() => {
          // Figma prototype: start the journey at the stage-by-stage overview.
          setStageNumber(1)
          requestAnimationFrame(() => scrollToSection('follow-the-thread'))
        }}
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
              stages={stages.map((item) => ({ title: item.title, description: item.summary }))}
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

      <RelatedPapers papers={detail?.papers} paperCount={thread.paperCount} />
      <EvidenceSection evidence={detail?.evidence} />
      <NasaMediaSection nasa={detail?.nasa} />
      <LatestDevelopment latest={detail?.latest} />

      <StageNavigation
        stageNumber={stageNumber}
        stageTitles={stages.map((item) => item.title)}
        onChange={goToStage}
      />
    </main>
  )
}

export default ThreadDetailsPage
