import type { RelatedPaper } from '../../data/threadDetails'
import Icon from '../Icon/Icon'
import Tag from '../Tag/Tag'
import './PaperCard.css'

interface PaperCardProps {
  paper: RelatedPaper
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
function PaperCard({ paper }: PaperCardProps) {
  const link = httpUrl(paper.url)

  return (
    <article className="paper-card">
      <div className="paper-card__meta">
        <div className="paper-card__tags">
          {paper.year !== null && <Tag>{paper.year}</Tag>}
          {paper.illustrative && <Tag className="paper-card__illustrative">Illustrative data</Tag>}
        </div>
        {/* No bookmark endpoint exists yet, so saving is disabled rather than faked. */}
        <button
          type="button"
          className="paper-card__bookmark"
          aria-label={`Bookmark "${paper.title}" (not available yet)`}
          title="Saving papers is not available yet"
          disabled
        >
          <Icon name="bookmark" className="paper-card__bookmark-icon" />
        </button>
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
          <a
            className="paper-card__link"
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Read "${paper.title}" (opens in a new tab)`}
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
