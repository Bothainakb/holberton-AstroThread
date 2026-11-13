import { useId } from "react";
import "./RecentSearches.css";

interface RecentSearchesProps {
  searches: readonly string[];
  onSelect: (query: string) => void;
  onRemove: (query: string) => void;
  onClear: () => void;
  title?: string;
}

export function RecentSearches({
  searches,
  onSelect,
  onRemove,
  onClear,
  title = "Recent searches",
}: RecentSearchesProps) {
  const titleId = useId();

  if (searches.length === 0) {
    return null;
  }

  return (
    <section className="recent-searches" aria-labelledby={titleId}>
      <div className="recent-searches__header">
        <h2 id={titleId} className="recent-searches__title">
          {title}
        </h2>

        <button type="button" className="recent-searches__clear" onClick={onClear}>
          Clear all
        </button>
      </div>

      <ul className="recent-searches__list">
        {searches.map((query) => (
          <li key={query} className="recent-searches__item">
            <button
              type="button"
              className="recent-searches__query"
              onClick={() => onSelect(query)}
            >
              <svg
                className="recent-searches__icon"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
              <span className="recent-searches__text" dir="auto">
                {query}
              </span>
            </button>

            <button
              type="button"
              className="recent-searches__remove"
              aria-label={`Remove “${query}” from recent searches`}
              onClick={() => onRemove(query)}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}