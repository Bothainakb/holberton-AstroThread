import type { PaperSummary } from "../../types/research";
import { PAPER_TYPE_LABELS } from "../../lib/searchResults";
import { formatPaperMeta } from "../../lib/formatPaper";
import "./PaperResultCard.css";

interface PaperResultCardProps {
  paper: PaperSummary;
  detailsHref?: string;
  onKeywordSelect?: (keyword: string) => void;
}

export function PaperResultCard({
  paper,
  detailsHref,
  onKeywordSelect,
}: PaperResultCardProps) {
  const meta = formatPaperMeta(paper);
  const source = [PAPER_TYPE_LABELS[paper.paperType], paper.topic]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className="paper-card">
      <p className="paper-card__source">{source}</p>

      <h3 className="paper-card__title">
        {detailsHref ? (
          <a className="paper-card__title-link" href={detailsHref}>
            {paper.title}
          </a>
        ) : (
          paper.title
        )}
      </h3>

      <p className="paper-card__meta">{meta}</p>

      {paper.abstract && <p className="paper-card__abstract">{paper.abstract}</p>}

      {paper.keywords.length > 0 && (
        <ul className="paper-card__keywords" aria-label="Keywords">
          {paper.keywords.map((keyword) => (
            <li key={keyword}>
              {onKeywordSelect ? (
                <button
                  type="button"
                  className="paper-card__keyword"
                  aria-label={`Search for ${keyword}`}
                  onClick={() => onKeywordSelect(keyword)}
                >
                  {keyword}
                </button>
              ) : (
                <span className="paper-card__keyword">{keyword}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}