import type { ThreadSummary } from "../../types/research";
import { formatYearRange } from "../../lib/formatPaper";
import "./ThreadCard.css";

interface ThreadCardProps {
  thread: ThreadSummary;
  isSelected?: boolean;
  previewPanelId?: string;
  onPreview?: () => void;
  detailsHref?: string;
}

export function ThreadCard({
  thread,
  isSelected = false,
  previewPanelId,
  onPreview,
  detailsHref,
}: ThreadCardProps) {
  const years = formatYearRange(thread.firstYear, thread.lastYear);

  return (
    <article className={`thread-card${isSelected ? " thread-card--selected" : ""}`}>
      <div className="thread-card__top">
        <span className="thread-card__topic">{thread.topic}</span>
        {years && <span className="thread-card__years">{years}</span>}
      </div>

      <h3 className="thread-card__title">
        {detailsHref ? (
          <a className="thread-card__title-link" href={detailsHref}>
            {thread.title}
          </a>
        ) : (
          thread.title
        )}
      </h3>

      <p className="thread-card__summary">{thread.summary}</p>

      <div className="thread-card__footer">
        <span className="thread-card__count">
          {thread.paperCount} {thread.paperCount === 1 ? "paper" : "papers"}
        </span>

        <div className="thread-card__actions">
          {onPreview && (
            <button
              type="button"
              className="thread-card__preview"
              aria-pressed={isSelected}
              aria-controls={previewPanelId}
              onClick={onPreview}
            >
              Preview
            </button>
          )}

          {detailsHref && (
            <a className="thread-card__open" href={detailsHref}>
              Open thread
            </a>
          )}
        </div>
      </div>
    </article>
  );
}