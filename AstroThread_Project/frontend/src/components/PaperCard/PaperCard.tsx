import type { RelatedPaper } from '../../data/threadDetails'
import BookmarkIcon from '../BookmarkIcon/BookmarkIcon'
import Icon from '../Icon/Icon'
import Tag from '../Tag/Tag'
import './PaperCard.css'

/** Saving the paper to the user's bookmarks; without it the icon is shown disabled. */
export interface PaperCardBookmark {
  saved: boolean
  /** A save or removal is on its way to the server. */
  pending: boolean
  /** Whether it is saved is still loading. */
  loading?: boolean
  onToggle: () => void
}

interface PaperCardProps {
  paper: RelatedPaper
  bookmark?: PaperCardBookmark
}

/** The link as an absolute http(s) URL, or null for anything else (e.g. "javascript:"). */
function httpUrl(value: string | undefined): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null
  } catch {
    return null
  }
}

/** Figma "Research Paper Card": year, title, authors, summary and a read link. */
function PaperCard({ paper, bookmark }: PaperCardProps) {
  const link = httpUrl(paper.url)

  return (
    <article className="paper-card">
      <div className="paper-card__meta">
        <div className="paper-card__tags">
          {paper.year !== null && <Tag>{paper.year}</Tag>}
        </div>
        {bookmark ? (
          <button
            type="button"
            className={['paper-card__bookmark', bookmark.saved && 'paper-card__bookmark--saved'].filter(Boolean).join(' ')}
            aria-label={bookmark.saved ? `Remove "${paper.title}" from saved papers` : `Save "${paper.title}"`}
            title={bookmark.saved ? 'Remove from saved papers' : 'Save paper'}
            aria-pressed={bookmark.loading ? undefined : bookmark.saved}
            aria-busy={bookmark.pending || bookmark.loading}
            disabled={bookmark.loading}
            onClick={bookmark.onToggle}
          >
            <BookmarkIcon filled={bookmark.saved} />
          </button>
        ) : (
          // Papers outside the AstroThread database (design previews) cannot be saved.
          <button
            type="button"
            className="paper-card__bookmark"
            aria-label={`Bookmark "${paper.title}" (not available for this thread)`}
            title="Saving papers is not available for this thread"
            disabled
          >
            <Icon name="bookmark" className="paper-card__bookmark-icon" />
          </button>
        )}
      </div>

      <h3 className="paper-card__title">{paper.title}</h3>
      <p className="paper-card__authors">{paper.authors}</p>
      {paper.summary ? (
        <p className="paper-card__summary">{paper.summary}</p>
      ) : (
        paper.missingSummary && (
          <p className="paper-card__summary paper-card__summary--missing">{paper.missingSummary}</p>
        )
      )}

      <div className="paper-card__footer">
        {link ? (
          // Opens in the same tab; the browser's Back button returns to the thread.
          <a
            className="paper-card__link"
            href={link}
            rel="noreferrer"
            aria-label={`Read "${paper.title}"`}
          >
            Read Paper
            <Icon name="arrow-right" />
          </a>
        ) : (
          <span className="paper-card__unavailable">Paper link not available yet</span>
        )}
      </div>
    </article>
  )
}

export default PaperCard
