import { PAPER_TYPE_LABELS } from "../../lib/searchResults";
import type { PaperSummary, PaperType } from "../../types/research";

interface ResultsDataProps {
  papers: readonly PaperSummary[];
}

const TYPE_ORDER: readonly PaperType[] = ["observational", "theoretical"];
const TOP_VENUE_LIMIT = 5;

function countDecades(papers: readonly PaperSummary[]) {
  const years = papers.map((paper) => paper.year).filter((year) => year > 0);

  if (years.length === 0) {
    return [];
  }

  const first = Math.floor(Math.min(...years) / 10) * 10;
  const last = Math.floor(Math.max(...years) / 10) * 10;
  const decades: { decade: number; count: number }[] = [];

  for (let decade = first; decade <= last; decade += 10) {
    decades.push({
      decade,
      count: years.filter((year) => year >= decade && year < decade + 10).length,
    });
  }

  return decades;
}

function countVenues(papers: readonly PaperSummary[]) {
  const counts = new Map<string, number>();

  papers.forEach((paper) => {
    if (paper.venue) {
      counts.set(paper.venue, (counts.get(paper.venue) ?? 0) + 1);
    }
  });

  return [...counts.entries()]
    .map(([venue, count]) => ({ venue, count }))
    .sort((a, b) => b.count - a.count || a.venue.localeCompare(b.venue));
}

function percent(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

export function ResultsData({ papers }: ResultsDataProps) {
  const total = papers.length;
  const years = papers.map((paper) => paper.year).filter((year) => year > 0);
  const decades = countDecades(papers);
  const maxDecadeCount = Math.max(1, ...decades.map((item) => item.count));
  const venues = countVenues(papers);
  const types = TYPE_ORDER.map((type) => ({
    type,
    label: PAPER_TYPE_LABELS[type],
    count: papers.filter((paper) => paper.paperType === type).length,
  }));

  return (
    <div className="results-data">
      <dl className="results-data__stats">
        <div className="results-data__stat">
          <dt>Papers</dt>
          <dd>{total}</dd>
        </div>
        <div className="results-data__stat">
          <dt>Years covered</dt>
          <dd>{years.length > 0 ? `${Math.min(...years)}–${Math.max(...years)}` : "—"}</dd>
        </div>
        <div className="results-data__stat">
          <dt>Journals</dt>
          <dd>{venues.length}</dd>
        </div>
      </dl>

      {decades.length > 0 && (
        <section className="results-data__card" aria-labelledby="data-decades-title">
          <h2 id="data-decades-title" className="results-data__title">
            Papers by decade
          </h2>
          <p className="results-data__note">When research on this search was published.</p>

          <ul className="decade-bars">
            {decades.map((item) => (
              <li
                key={item.decade}
                className="decade-bars__row"
                title={`${item.decade}s: ${item.count} ${item.count === 1 ? "paper" : "papers"}`}
              >
                <span className="decade-bars__label">{item.decade}s</span>
                <span className="decade-bars__track">
                  {item.count > 0 && (
                    <span
                      className="decade-bars__fill"
                      style={{ width: `${(item.count / maxDecadeCount) * 100}%` }}
                    />
                  )}
                </span>
                <span className="decade-bars__value">{item.count}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="results-data__card" aria-labelledby="data-types-title">
        <h2 id="data-types-title" className="results-data__title">
          Research type
        </h2>
        <p className="results-data__note">
          Observational papers report measurements. Theoretical papers build models and
          predictions.
        </p>

        <div className="type-split" aria-hidden="true">
          {types
            .filter((item) => item.count > 0)
            .map((item) => (
              <span
                key={item.type}
                className={`type-split__part type-split__part--${item.type}`}
                style={{ flexGrow: item.count }}
                title={`${item.label}: ${item.count} (${percent(item.count, total)}%)`}
              />
            ))}
        </div>

        <ul className="type-split__legend">
          {types.map((item) => (
            <li key={item.type}>
              <span
                className={`type-split__swatch type-split__part--${item.type}`}
                aria-hidden="true"
              />
              <span className="type-split__name">{item.label}</span>
              <span className="type-split__count">
                {item.count} · {percent(item.count, total)}%
              </span>
            </li>
          ))}
        </ul>
      </section>

      {venues.length > 0 && (
        <section className="results-data__card" aria-labelledby="data-venues-title">
          <h2 id="data-venues-title" className="results-data__title">
            Top journals
          </h2>
          <ol className="venue-list">
            {venues.slice(0, TOP_VENUE_LIMIT).map((item) => (
              <li key={item.venue}>
                <span className="venue-list__name">{item.venue}</span>
                <span className="venue-list__count">
                  {item.count} {item.count === 1 ? "paper" : "papers"}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}