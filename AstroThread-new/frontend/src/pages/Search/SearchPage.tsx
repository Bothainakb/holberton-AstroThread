import { useEffect, useMemo, useRef, useState } from "react";
import { SiteHeader } from "../../components/SiteHeader/SiteHeader";
import { SiteFooter } from "../../components/SiteFooter/SiteFooter";
import { SearchBox } from "../../components/SearchBox/SearchBox";
import { PopularTopics } from "../../components/PopularTopics/PopularTopics";
import { PaperResultCard } from "../../components/PaperResultCard/PaperResultCard";
import { Pagination } from "../../components/Pagination/Pagination";
import { FormAlert } from "../../components/FormAlert/FormAlert";
import { Button } from "../../components/Button/Button";
import { navigate, paperPath, routes, useLocation } from "../../lib/router";
import { addRecentSearch } from "../../lib/recentSearches";
import {
  EMPTY_FILTERS,
  applyFilters,
  buildSearchParams,
  getRelatedKeywords,
  paginate,
  readSearchState,
  sortPapers,
} from "../../lib/searchResults";
import type { SearchQueryState } from "../../lib/searchResults";
import { searchPapers, searchSource } from "../../services/search/searchService";
import type { SearchSource } from "../../services/search/searchService";
import type { PaperSummary } from "../../types/research";
import { SearchFilters } from "./SearchFilters";
import { ResultTabs, parseResultTab } from "./ResultTabs";
import type { ResultTab } from "./ResultTabs";
import { ResultsTimeline } from "./ResultsTimeline";
import "./SearchPage.css";

interface SearchResult {
  key: string;
  papers: PaperSummary[];
  source: SearchSource;
  error: boolean;
}

const LOADING_CARD_COUNT = 3;

const COMING_SOON: Record<"images" | "data", { title: string; text: string }> = {
  images: {
    title: "Images are coming soon",
    text: "Space images and scientific illustrations for this search will appear here once image search is connected.",
  },
  data: {
    title: "Data is coming soon",
    text: "Charts and datasets for this topic will appear here in a later version.",
  },
};

function buildSearchHref(state: SearchQueryState, tab: ResultTab = "all") {
  const params = buildSearchParams(state);

  if (tab !== "all") {
    params.set("tab", tab);
  }

  const query = params.toString();
  return query ? `${routes.search}?${query}` : routes.search;
}

function readPageState(searchParams: URLSearchParams): SearchQueryState {
  const state = readSearchState(searchParams);

  return {
    ...state,
    filters: { ...state.filters, topics: [], author: "" },
  };
}

export function SearchPage() {
  const { searchParams } = useLocation();
  const state = readPageState(searchParams);
  const { query, filters, sort, page } = state;
  const activeTab = parseResultTab(searchParams.get("tab"));

  const [input, setInput] = useState(query);
  const [syncedQuery, setSyncedQuery] = useState(query);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<SearchResult | null>(null);
  const resultsHeadingRef = useRef<HTMLHeadingElement>(null);

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
    if (query) {
      addRecentSearch(query);
    }
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

  const hasError = Boolean(query) && !isLoading && result?.error === true;
  const hasResults = Boolean(query) && !isLoading && !hasError && basePapers.length > 0;
  const hasNoResults = Boolean(query) && !isLoading && !hasError && basePapers.length === 0;
  const filtersMatchNothing = hasResults && filteredPapers.length === 0;

  function updateState(next: Partial<SearchQueryState>, replace = true) {
    navigate(buildSearchHref({ ...state, page: 1, ...next }, activeTab), { replace });
  }

  function changeTab(tab: ResultTab) {
    navigate(buildSearchHref({ ...state, page: 1 }, tab));
  }

  function runSearch(nextQuery: string) {
    const trimmed = nextQuery.trim();
    setInput(trimmed);

    if (trimmed === query && result?.error) {
      setAttempt((value) => value + 1);
    }

    navigate(
      buildSearchHref(
        { query: trimmed, filters: EMPTY_FILTERS, sort: "relevance", page: 1 },
        activeTab,
      ),
    );
  }

  function changePage(nextPage: number) {
    navigate(buildSearchHref({ ...state, page: nextPage }, activeTab));
    resultsHeadingRef.current?.focus();
  }

  const relatedKeywords = hasResults ? getRelatedKeywords(basePapers, query) : [];
  const detailsQuery = new URLSearchParams({
    from: buildSearchHref(state, activeTab),
  }).toString();
  const paperHref = (paper: PaperSummary) => `${paperPath(paper.id)}?${detailsQuery}`;

  return (
    <div className="search-page">
      <SiteHeader
        search={
          <SearchBox
            size="compact"
            value={input}
            onValueChange={setInput}
            onSearch={runSearch}
          />
        }
      />

      <ResultTabs active={activeTab} onChange={changeTab} />

      <main className="search-page__main">
        <div className="search-page__content">
          {!query && (
            <div className="search-page__intro">
              <h1 className="search-page__title">What do you want to explore?</h1>
              <p className="search-page__lead">
                Search for any astronomy or physics topic, keyword, or paper title.
              </p>
              <PopularTopics
                title="Try"
                onTopicSelect={(topic) => runSearch(topic.query)}
              />
            </div>
          )}

          {query && (activeTab === "images" || activeTab === "data") && (
            <div className="search-page__empty">
              <h1 className="search-page__empty-title">{COMING_SOON[activeTab].title}</h1>
              <p className="search-page__lead">{COMING_SOON[activeTab].text}</p>
              <Button variant="secondary" onClick={() => changeTab("all")}>
                Back to all results
              </Button>
            </div>
          )}

          {(activeTab === "all" || activeTab === "timeline") && (
            <>
              {isLoading && (
                <div className="search-page__state" aria-busy="true">
                  <h1 className="visually-hidden">Search results</h1>
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
                  <h1 className="visually-hidden">Search results</h1>
                  <FormAlert tone="error" title="Search isn’t available right now">
                    We couldn’t reach the search service. Check your connection and try again.
                  </FormAlert>
                  <Button variant="secondary" onClick={() => setAttempt((value) => value + 1)}>
                    Try again
                  </Button>
                </div>
              )}

              {hasNoResults && (
                <div className="search-page__empty">
                  <h1 className="search-page__empty-title">No results found for “{query}”</h1>
                  <p className="search-page__lead">
                    Check the spelling, try a broader keyword, or start with one of these topics.
                  </p>
                  <PopularTopics
                    title="Try"
                    onTopicSelect={(topic) => runSearch(topic.query)}
                  />
                </div>
              )}
            </>
          )}

          {hasResults && activeTab === "timeline" && (
            <div className="search-page__state">
              <h1 ref={resultsHeadingRef} tabIndex={-1} className="search-page__summary">
                <strong>{basePapers.length}</strong>{" "}
                {basePapers.length === 1 ? "paper" : "papers"} for “{query}”, oldest first
              </h1>

              {searchSource === "sample" && (
                <p className="search-page__source-note">
                  Sample results. The search API isn’t connected yet.
                </p>
              )}

              <ResultsTimeline papers={basePapers} paperHref={paperHref} />
            </div>
          )}

          {hasResults && activeTab === "all" && (
            <div className="search-page__state">
              <SearchFilters
                filters={filters}
                sort={sort}
                onFiltersChange={(nextFilters) => updateState({ filters: nextFilters })}
                onSortChange={(nextSort) => updateState({ sort: nextSort })}
              />

              <h1
                ref={resultsHeadingRef}
                tabIndex={-1}
                className="search-page__summary"
              >
                <strong>{filteredPapers.length}</strong>{" "}
                {filteredPapers.length === 1 ? "paper" : "papers"} for “{query}”
              </h1>

              {searchSource === "sample" && (
                <p className="search-page__source-note">
                  Sample results. The search API isn’t connected yet.
                </p>
              )}

              {relatedKeywords.length > 0 && (
                <section className="search-page__related" aria-labelledby="search-related-title">
                  <h2 id="search-related-title" className="search-page__related-title">
                    Related topics
                  </h2>
                  <ul className="search-page__related-list">
                    {relatedKeywords.map((keyword) => (
                      <li key={keyword.value}>
                        <button
                          type="button"
                          className="search-page__related-chip"
                          onClick={() => runSearch(keyword.value)}
                        >
                          {keyword.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {filtersMatchNothing ? (
                <div className="search-page__empty">
                  <h2 className="search-page__empty-title">No papers match these filters</h2>
                  <p className="search-page__lead">
                    Change the year or type to see the {basePapers.length}{" "}
                    {basePapers.length === 1 ? "paper" : "papers"} found for “{query}”.
                  </p>
                  <Button
                    variant="secondary"
                    onClick={() => updateState({ filters: EMPTY_FILTERS })}
                  >
                    Show all papers
                  </Button>
                </div>
              ) : (
                <>
                  <ol className="search-page__list">
                    {pagePapers.map((paper) => (
                      <li key={paper.id}>
                        <PaperResultCard
                          paper={paper}
                          detailsHref={paperHref(paper)}
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
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}