import Button from '../../../components/Button/Button'
import Icon from '../../../components/Icon/Icon'
import Tag from '../../../components/Tag/Tag'
import type { ResearchThread } from '../../../data/threads'
import Link from '../../../router/Link'
import { routes } from '../../../router/router'

interface ThreadHeroProps {
  thread: ResearchThread
  headline: string
  intro: string
  categories: string[]
  /** Papers shown for the thread; null hides the count. */
  paperCount: number | null
  /** "Updated 2 days ago" from the design data; null when it is not known. */
  updatedLabel: string | null
  onStartJourney: () => void
}

function ThreadHero({
  thread,
  headline,
  intro,
  categories,
  paperCount,
  updatedLabel,
  onStartJourney,
}: ThreadHeroProps) {
  return (
    <section className="details-hero container" aria-labelledby="details-title">
      <nav className="details-breadcrumb" aria-label="Breadcrumb">
        <Link
          className="details-breadcrumb__back"
          href={routes.researchThreads}
          aria-label="Back to Research Threads"
        >
          <Icon name="arrow-left" />
        </Link>
        <Link className="details-breadcrumb__link" href={routes.researchThreads}>
          Research Threads
        </Link>
        <Icon name="chevron-right" className="details-breadcrumb__separator" />
        <span className="details-breadcrumb__current" aria-current="page">
          {thread.title}
        </span>
      </nav>

      <div className="details-hero__row">
        <div className="details-hero__content">
          <div className="details-hero__tags">
            {categories.map((category) => (
              <Tag key={category}>{category}</Tag>
            ))}
          </div>
          <h1 className="details-hero__title" id="details-title">
            {headline}
          </h1>
          <p className="details-hero__intro">{intro}</p>

          <ul className="details-hero__meta">
            {paperCount !== null && (
              <li>
                <span className="details-hero__meta-icon">
                  <Icon name="papers" />
                </span>
                {paperCount} {paperCount === 1 ? 'paper' : 'papers'}
              </li>
            )}
            <li>
              <span className="details-hero__meta-icon">
                <Icon name="stages" />
              </span>
              {thread.totalStages} research stages
            </li>
            {updatedLabel && <li className="details-hero__meta-updated">{updatedLabel}</li>}
          </ul>
        </div>

        <div className="details-hero__actions">
          <button type="button" className="button button--primary" onClick={onStartJourney}>
            Start Research Journey
          </button>
          {/* No bookmark endpoint exists yet, so saving is disabled rather than faked. */}
          <button
            type="button"
            className="details-icon-button"
            aria-label="Bookmark thread (not available yet)"
            title="Saving threads is not available yet"
            disabled
          >
            <Icon name="bookmark" />
          </button>
        </div>
      </div>

      <div className="details-hero__links">
        <Button variant="secondary" href={routes.aiAssistant}>
          Ask the AI Assistant
        </Button>
        <Button variant="secondary" href="#nasa-media">
          NASA Media
        </Button>
      </div>
    </section>
  )
}

export default ThreadHero
