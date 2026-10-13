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
  onStartJourney: () => void
}

function ThreadHero({ thread, headline, intro, categories, onStartJourney }: ThreadHeroProps) {
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
            <li>
              <span className="details-hero__meta-icon">
                <Icon name="papers" />
              </span>
              {thread.paperCount} papers
            </li>
            <li>
              <span className="details-hero__meta-icon">
                <Icon name="stages" />
              </span>
              {thread.totalStages} research stages
            </li>
            <li className="details-hero__meta-updated">{thread.updatedLabel}</li>
          </ul>
        </div>

        <div className="details-hero__actions">
          <button type="button" className="button button--primary" onClick={onStartJourney}>
            Start Research Journey
          </button>
          {/* Bookmarking needs user accounts, which are not connected yet. */}
          <button type="button" className="details-icon-button" aria-label="Bookmark thread">
            <Icon name="bookmark" />
          </button>
        </div>
      </div>

      <div className="details-hero__links">
        {/* The AI Assistant page is not built yet. */}
        <Button variant="secondary" href="#">
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
