import { formatAuthors } from "../../lib/formatPaper";
import type { PaperSummary } from "../../types/research";

interface ResultsTimelineProps {
  papers: readonly PaperSummary[];
  paperHref: (paper: PaperSummary) => string;
}

export function ResultsTimeline({ papers, paperHref }: ResultsTimelineProps) {
  const sorted = [...papers].sort((a, b) => a.year - b.year);

  return (
    <ol className="results-timeline">
      {sorted.map((paper, index) => {
        const showYear = index === 0 || sorted[index - 1].year !== paper.year;

        return (
          <li key={paper.id} className="results-timeline__item">
            <span className="results-timeline__year" aria-hidden={!showYear}>
              {showYear && paper.year > 0 ? paper.year : ""}
            </span>
            <span className="results-timeline__dot" aria-hidden="true" />
            <div className="results-timeline__body">
              <a className="results-timeline__title" href={paperHref(paper)}>
                {paper.title}
              </a>
              <p className="results-timeline__meta">
                {formatAuthors(paper.authors)}
                {paper.venue ? ` · ${paper.venue}` : ""}
                {paper.year > 0 ? ` · ${paper.year}` : ""}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}