import type { RelatedPaper } from '../../data/threadDetails'
import Icon from '../Icon/Icon'
import Tag from '../Tag/Tag'
import './PaperCard.css'

interface PaperCardProps {
  paper: RelatedPaper
}

/** Figma "Research Paper Card": year, title, authors, summary and a read link. */
function PaperCard({ paper }: PaperCardProps) {
  return (
    <article className="paper-card">
      <div className="paper-card__meta">
        <Tag>{paper.year}</Tag>
        {/* Saving papers needs user accounts, which are not connected yet. */}
        <button type="button" className="paper-card__bookmark" aria-label={`Bookmark "${paper.title}"`}>
          <Icon name="bookmark" className="paper-card__bookmark-icon" />
        </button>
      </div>

      <h3 className="paper-card__title">{paper.title}</h3>
      <p className="paper-card__authors">{paper.authors}</p>
      <p className="paper-card__summary">{paper.summary}</p>

      <div className="paper-card__footer">
        {/* Paper links will come from the papers API (OpenAlex) later. */}
        <a className="paper-card__link" href="#">
          Read Paper
          <Icon name="arrow-right" />
        </a>
      </div>
    </article>
  )
}

export default PaperCard
