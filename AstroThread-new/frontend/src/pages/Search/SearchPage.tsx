import { useEffect, useId, useMemo, useRef, useState } from "react";
import { SiteHeader } from "../../components/SiteHeader/SiteHeader";
import { SiteFooter } from "../../components/SiteFooter/SiteFooter";
import { SearchBox } from "../../components/SearchBox/SearchBox";
import { PopularTopics } from "../../components/PopularTopics/PopularTopics";
import { PaperResultCard } from "../../components/PaperResultCard/PaperResultCard";
import { Pagination } from "../../components/Pagination/Pagination";
import { FormAlert } from "../../components/FormAlert/FormAlert";
import { Button } from "../../components/Button/Button";
import { SelectField } from "../../components/FormField/FormField";
import { navigate, paperPath, routes, useLocation } from "../../lib/router";
import {
  EMPTY_FILTERS,
  PAPER_TYPE_LABELS,
  SORT_OPTIONS,
  YEAR_RANGES,
  applyFilters,
  buildSearchParams,
  countActiveFilters,
  getAuthorFacets,
  getPaperTypeFacets,
  getRelatedKeywords,
  getTopicFacets,
  paginate,
  readSearchState,
  sortPapers,
} from "../../lib/searchResults";
import type { SearchFilters as Filters, SearchQueryState, SortOption } from "../../lib/searchResults";
import { searchPapers, searchSource } from "../../services/search/searchService";
import type { SearchSource } from "../../services/search/searchService";
import type { PaperSummary } from "../../types/research";
import { SearchFilters } from "./SearchFilters";
import "./SearchPage.css";

interface SearchResult {
  key: string;
  papers: PaperSummary[];
  source: SearchSource;
  error: boolean;
}

interface ActiveFilterChip {
  key: string;
  label: string;
  remove: (filters: Filters) => Filters;
}

const LOADING_CARD_COUNT = 3;

function buildSearchHref(state: SearchQueryState) {
  const params = buildSearchParams(state).toString();
  return params ? `${routes.search}?${params}` : routes.search;
}

function getActiveFilterChips(filters: Filters): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = filters.topics.map((topic) => ({
    key: `topic-${topic}`,
    label: topic,
    remove: (current) => ({
      ...current,
      topics: current.topics.filter((item) => item !== topic),
    }),
  }));

  if (filters.yearRange !== "any") {
    chips.push({
      key: "year",
      label: YEAR_RANGES.find((range) => range.value === filters.yearRange)?.label ?? "",
      remove: (current) => ({ ...current, yearRange: "any" }),
    });
  }

  filters.paperTypes.forEach((type) =>
    chips.push({
      key: `type-${type}`,
      label: PAPER_TYPE_LABELS[type],
      remove: (current) => ({
        ...current,
        paperTypes: current.paperTypes.filter((item) => item !== type),
      }),
    }),
  );

  if (filters.author) {
    chips.push({
      key: "author",
      label: filters.author,
      remove: (current) => ({ ...current, author: "" }),
    });
  }

  return chips;
}

export function SearchPage() {
  const { searchParams } = useLocation();
  const state = readSearchState(searchParams);
  const { query, filters, sort, page } = state;

  const [input, setInput] = useState(query);
  const [syncedQuery, setSyncedQuery] = useState(query);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(
    () => countActiveFilters(filters) > 0,
  );
  const resultsHeadingRef = useRef<HTMLHeadingElement>(null);
  const filtersId = useId();

  if (query !== syncedQuery) {
    setSyncedQuery(query);
    setInput(query);
  }

  const requestKey = `${attempt}:${query}`;
  const isLoading = Boolean(query) && result?.key !== requestKey;

  useEffect(() => {
    document.title = query ? `${query} | Search | AstroThread` : "Search | AstroThread";
  }, [query]);

  useEffect(() => {
    if (!query) {
      return;
    }

    const controller = new AbortController();

    searchPapers(query, controller.signal)
      .then((response) => {
        setResult({ key: requestKey, papers: response.papers, source: response.source, error: false });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setResult({ key: requestKey, papers: [], source: searchSource, error: true });
      });

    return () => controller.abort();
  }, [query, requestKey]);

  const basePapers = useMemo(
    () => (!isLoading && result ? result.papers : []),
    [isLoading, result],
  );
  const filteredPapers = useMemo(
    () => sortPapers(applyFilters(basePapers, filters), sort),
    [basePapers, filters, sort],
  );
  const { items: pagePapers, currentPage, pageCount } = paginate(filteredPapers, page);
  const activeFilterCount = countActiveFilters(filters);
  const activeChips = getActiveFilterChips(filters);

  const hasError = Boolean(query) && !isLoading && result?.error === true;
  const hasResults = Boolean(query) && !isLoading && !hasError && basePapers.length > 0;
  const hasNoResults = Boolean(query) && !isLoading && !hasError && basePapers.length === 0;
  const filtersMatchNothing = hasResults && filteredPapers.length === 0;

  function updateState(next: Partial<SearchQueryState>, replace = true) {
    navigate(buildSearchHref({ ...state, page: 1, ...next }), { replace });
  }

  function runSearch(nextQuery: string) {
    const trimmed = nextQuery.trim();
    setInput(trimmed);

    if (trimmed === query && result?.error) {
      setAttempt((value) => value + 1);
    }

    navigate(
      buildSearchHref({ query: trimmed, filters: EMPTY_FILTERS, sort: "relevance", page: 1 }),
    );
  }

  function changePage(nextPage: number) {
    navigate(buildSearchHref({ ...state, page: nextPage }));
    resultsHeadingRef.current?.focus();
  }

  const relatedKeywords = hasResults ? getRelatedKeywords(basePapers, query) : [];
  const detailsQuery = new URLSearchParams({ from: buildSearchHref(state) }).toString();

  return (
    <div className="search-page">
      <SiteHeader showMainNav />

      <main className="search-page__main">
        <div className="search-page__layout">
          <aside className="search-page__filters" aria-label="Search filters">
            <button
              type="button"
              className="search-page__filters-toggle"
              aria-expanded={filtersOpen}
              aria-controls={filtersId}
              onClick={() => setFiltersOpen((open) => !open)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
                <circle cx="16" cy="7" r="2" />
                <circle cx="8" cy="17" r="2" />
              </svg>
              Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
              <svg className="search-page__filters-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            {filtersOpen && (
              <SearchFilters
                id={filtersId}
                filters={filters}
                topicOptions={getTopicFacets(basePapers)}
                paperTypeOptions={getPaperTypeFacets(basePapers)}
                authorOptions={getAuthorFacets(basePapers)}
                disabled={!hasResults}
                onChange={(nextFilters) => updateState({ filters: nextFilters })}
                onClear={() => updateState({ filters: EMPTY_FILTERS })}
              />
            )}
          </aside>

          <section className="search-page__results" aria-labelledby="search-results-title">
            <SearchBox value={input} onValueChange={setInput} onSearch={runSearch} />

            {!query && (
              <div className="search-page__intro">
                <h1 id="search-results-title" className="search-page__title">
                  What do you want to explore?
                </h1>
                <p className="search-page__lead">
                  Search for any astronomy or physics topic, keyword, or paper title.
                </p>
                <PopularTopics
                  title="Try"
                  onTopicSelect={(topic) => runSearch(topic.query)}
                />
              </div>
            )}

            {isLoading && (
              <div className="search-page__state" aria-busy="true">
                <h1 id="search-results-title" className="visually-hidden">
                  Search results
                </h1>
                <p className="search-page__summary" role="status">
                  Searching for “{query}”…
                </p>
                <div className="search-page__skeletons" aria-hidden="true">
                  {Array.from({ length: LOADING_CARD_COUNT }, (_, index) => (
                    <div key={index} className="search-page__skeleton">
                      <span className="search-page__skeleton-line search-page__skeleton-line--short" />
                      <span className="search-page__skeleton-line search-page__skeleton-line--title" />
                      <span className="search-page__skeleton-line" />
                      <span className="search-page__skeleton-line search-page__skeleton-line--medium" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {hasError && (
              <div className="search-page__state">
                <h1 id="search-results-title" className="visually-hidden">
                  Search results
                </h1>
                <FormAlert tone="error" title="Search isn’t available right now">
                  We couldn’t reach the search service. Check your connection and try again.
                </FormAlert>
                <Button variant="secondary" onClick={() => setAttempt((value) => value + 1)}>
                  Try again
                </Button>
              </div>
            )}

            {hasNoResults && (
              <div className="search-page__state search-page__empty">
                <h1 id="search-results-title" className="search-page__empty-title">
                  No results found for “{query}”
                </h1>
                <p className="search-page__lead">
                  Check the spelling, try a broader keyword, or start with one of these topics.
                </p>
                <PopularTopics
                  title="Try"
                  onTopicSelect={(topic) => runSearch(topic.query)}
                />
              </div>
            )}

            {hasResults && (
              <div className="search-page__state">
                <div className="search-page__results-head">
                  <h1
                    id="search-results-title"
                    ref={resultsHeadingRef}
                    tabIndex={-1}
                    className="search-page__summary search-page__summary--strong"
                  >
                    {filteredPapers.length} {filteredPapers.length === 1 ? "paper" : "papers"} for “{query}”
                  </h1>

                  <div className="search-page__sort">
                    <SelectField
                      id="search-sort"
                      label="Sort by"
                      options={SORT_OPTIONS}
                      value={sort}
                      disabled={filtersMatchNothing}
                      onChange={(event) =>
                        updateState({ sort: event.target.value as SortOption })
                      }
                    />
                  </div>
                </div>

                {searchSource === "sample" && (
                  <p className="search-page__source-note">
                    Sample results. The search API isn’t connected yet.
                  </p>
                )}

                {activeChips.length > 0 && (
                  <div className="search-page__active">
                    <span className="search-page__active-label">Filtered by</span>
                    <ul className="search-page__chips">
                      {activeChips.map((chip) => (
                        <li key={chip.key}>
                          <button
                            type="button"
                            className="search-page__chip"
                            aria-label={`Remove filter: ${chip.label}`}
                            onClick={() => updateState({ filters: chip.remove(filters) })}
                          >
                            {chip.label}
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                              <path d="M6 6l12 12M18 6 6 18" />
                            </svg>
                          </button>
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      className="search-page__clear"
                      onClick={() => updateState({ filters: EMPTY_FILTERS })}
                    >
                      Clear all
                    </button>
                  </div>
                )}

                {filtersMatchNothing ? (
                  <div className="search-page__empty">
                    <h2 className="search-page__empty-title">No papers match these filters</h2>
                    <p className="search-page__lead">
                      Remove a filter or clear them all to see the {basePapers.length}{" "}
                      {basePapers.length === 1 ? "paper" : "papers"} found for “{query}”.
                    </p>
                    <Button
                      variant="secondary"
                      onClick={() => updateState({ filters: EMPTY_FILTERS })}
                    >
                      Clear all filters
                    </Button>
                  </div>
                ) : (
                  <>
                    <ol className="search-page__list">
                      {pagePapers.map((paper) => (
                        <li key={paper.id}>
                          <PaperResultCard
                            paper={paper}
                            detailsHref={`${paperPath(paper.id)}?${detailsQuery}`}
                            onKeywordSelect={runSearch}
                          />
                        </li>
                      ))}
                    </ol>

                    <Pagination
                      currentPage={currentPage}
                      pageCount={pageCount}
                      label="Search result pages"
                      onPageChange={changePage}
                    />
                  </>
                )}
              </div>
            )}
          </section>

          <aside className="search-page__rail" aria-labelledby="search-rail-title">
            {hasResults && relatedKeywords.length > 0 ? (
              <>
                <h2 id="search-rail-title" className="search-page__rail-title">
                  Related topics
                </h2>
                <p className="search-page__rail-text">
                  Keywords found in these results. Select one to search it.
                </p>
                <ul className="search-page__rail-list">
                  {relatedKeywords.map((keyword) => (
                    <li key={keyword.value}>
                      <button
                        type="button"
                        className="search-page__rail-chip"
                        onClick={() => runSearch(keyword.value)}
                      >
                        {keyword.label}
                        <span className="search-page__rail-count">{keyword.count}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <>
                <h2 id="search-rail-title" className="search-page__rail-title">
                  Search tips
                </h2>
                <ul className="search-page__tips">
                  <li>Use a topic, such as “black holes”.</li>
                  <li>Search a paper title or an author name.</li>
                  <li>After searching, use Filters to narrow the results.</li>
                </ul>
              </>
            )}
          </aside>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}