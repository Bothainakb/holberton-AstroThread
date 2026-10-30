import Button from '../../../components/Button/Button'
import Icon from '../../../components/Icon/Icon'
import Tag from '../../../components/Tag/Tag'
import type { ResearchThread } from '../../../data/threads'
import Link from '../../../router/Link'
import { routes, threadDetailsPath, withReturnPath } from '../../../router/router'
import type { BookmarkNotice, BookmarkState } from '../useThreadBookmark'

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
  /** Replaces "N research stages" when the thread has no stage content (design previews). */
  stagesNote?: string
  bookmark: { state: BookmarkState; notice: BookmarkNotice | null; onToggle: () => void }
}

/** The bookmark icon (same shape as icons/thread/bookmark.svg), filled once saved. */
function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="12" height="18" viewBox="-1 -1 12 18" aria-hidden="true">
      <path
        d="M0 0H10V16L5 12.4L0 16Z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function BookmarkButton({ state, onToggle }: { state: BookmarkState; onToggle: () => void }) {
  const saved = state.status === 'ready' && state.saved
  const label =
    state.status === 'unavailable'
      ? 'Save thread (not available for threads outside the AstroThread database)'
      : state.status === 'ready'
        ? saved
          ? 'Remove from saved threads'
          : 'Save thread'
        : state.status === 'signed-out'
          ? 'Save thread (sign in required)'
          : state.status === 'error'
            ? 'Saved status could not be loaded; try again'
            : 'Save thread (loading)'

  return (
    <button
      type="button"
      className={['details-icon-button', saved && 'details-icon-button--saved'].filter(Boolean).join(' ')}
      aria-label={label}
      title={label}
      aria-pressed={state.status === 'ready' ? saved : undefined}
      aria-busy={state.status === 'loading' || (state.status === 'ready' && state.pending)}
      disabled={state.status === 'unavailable' || state.status === 'loading'}
      onClick={onToggle}
    >
      <BookmarkIcon filled={saved} />
    </button>
  )
}

function ThreadHero({
  thread,
  headline,
  intro,
  categories,
  paperCount,
  updatedLabel,
  onStartJourney,
  stagesNote,
  bookmark,
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
              {stagesNote ?? `${thread.totalStages} research stages`}
            </li>
            {updatedLabel && <li className="details-hero__meta-updated">{updatedLabel}</li>}
          </ul>
        </div>

        <div className="details-hero__actions">
          <button type="button" className="button button--primary" onClick={onStartJourney}>
            Start Research Journey
          </button>
          <BookmarkButton state={bookmark.state} onToggle={bookmark.onToggle} />
        </div>
      </div>

      {/* Polite for confirmations, assertive for the sign-in prompt and errors. */}
      <div
        className="details-bookmark-notice"
        role={bookmark.notice && bookmark.notice.kind !== 'done' ? 'alert' : 'status'}
      >
        {bookmark.notice && (
          <p
            className={`details-bookmark-notice__text details-bookmark-notice__text--${bookmark.notice.kind}`}
          >
            {bookmark.notice.message}
            {bookmark.notice.kind === 'sign-in' && (
              <>
                {' '}
                <Link href={withReturnPath(routes.login, threadDetailsPath(thread.id))}>Sign in</Link> or{' '}
                <Link href={withReturnPath(routes.signUp, threadDetailsPath(thread.id))}>
                  create an account
                </Link>
                .
              </>
            )}
          </p>
        )}
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
