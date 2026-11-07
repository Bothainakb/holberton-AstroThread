import { useEffect, useState } from "react";
import { SiteHeader } from "../../components/SiteHeader/SiteHeader";
import { SearchBox } from "../../components/SearchBox/SearchBox";
import { SiteFooter } from "../../components/SiteFooter/SiteFooter";
import { ApiError, searchPapers } from "../../services/api";
import type { Paper, SearchResult } from "../../services/api";
import "./SearchPage.css";

const MIN_QUERY_LENGTH = 2;

type SearchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; result: SearchResult }
  | { status: "error"; message: string };

function queryFromAddress(): string {
  return (new URLSearchParams(window.location.search).get("q") ?? "").trim();
}

export function SearchPage() {
  const [query, setQuery] = useState(queryFromAddress); 
  const [activeQuery, setActiveQuery] = useState(queryFromAddress); 
  const [attempt, setAttempt] = useState(0); 
  const [state, setState] = useState<SearchState>({ status: "idle" });

  useEffect(() => {
    function handlePopState() {
      const addressQuery = queryFromAddress();
      setQuery(addressQuery);
      setActiveQuery(addressQuery);
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (activeQuery.length < MIN_QUERY_LENGTH) {
      setState({ status: "idle" });
      return;
    }

    const controller = new AbortController();
    setState({ status: "loading" });

    searchPapers(activeQuery, controller.signal)
      .then((result) => setState({ status: "ready", result }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          status: "error",
          message:
            error instanceof ApiError
              ? error.message
              : "Something went wrong. Please try again.",
        });
      });

    return () => controller.abort();
  }, [activeQuery, attempt]);

  function runSearch(searchQuery: string) {
    const trimmedQuery = searchQuery.trim();

    if (trimmedQuery === activeQuery) {
      setAttempt((count) => count + 1);
      return;
    }

    const address = trimmedQuery
      ? `/search?${new URLSearchParams({ q: trimmedQuery })}`
      : "/search";
    window.history.pushState(null, "", address);
    setActiveQuery(trimmedQuery);
  }

  return (
    <div className="search-page">
      <SiteHeader />

      <main className="search-page__main">
        <div className="search-page__content">
          <h1 className="search-page__title">
            {activeQuery ? `Results for “${activeQuery}”` : "Search research papers"}
          </h1>

          <div className="search-page__search">
            <SearchBox value={query} onValueChange={setQuery} onSearch={runSearch} />
          </div>

          <section className="search-page__results" aria-live="polite">
            <SearchResults
              state={state}
              query={activeQuery}
              onRetry={() => setAttempt((count) => count + 1)}
            />
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

interface SearchResultsProps {
  state: SearchState;
  query: string;
  onRetry: () => void;
}

function SearchResults({ state, query, onRetry }: SearchResultsProps) {
  if (state.status === "idle") {
    return (
      <p className="search-page__message">
        Type at least {MIN_QUERY_LENGTH} characters to search astronomy and
        physics research papers.
      </p>
    );
  }

  if (state.status === "loading") {
    return (
      <p className="search-page__message" role="status">
        Searching research papers… The first search for a new topic can take a
        few seconds.
      </p>
    );
  }

  if (state.status === "error") {
    return (
      <div className="search-page__notice" role="alert">
        <h2 className="search-page__notice-title">Search did not work</h2>
        <p className="search-page__notice-text">{state.message}</p>
        <button className="search-page__retry" type="button" onClick={onRetry}>
          Try again
        </button>
      </div>
    );
  }

  const { topic, papers } = state.result;

  if (papers.length === 0) {
    return (
      <div className="search-page__notice">
        <h2 className="search-page__notice-title">No papers found</h2>
        <p className="search-page__notice-text">
          Nothing matched “{query}”. Try a broader topic, like “black holes” or
          “dark matter”.
        </p>
      </div>
    );
  }

  return (
    <>
      <p className="search-page__count">
        {papers.length} {papers.length === 1 ? "paper" : "papers"}
        {topic ? ` about ${topic.title}` : ""}
      </p>

      <ol className="search-page__list">
        {papers.map((paper, index) => (
          <li key={`${index}-${paper.title}`}>
            <PaperResult paper={paper} />
          </li>
        ))}
      </ol>

      <p className="search-page__source">Source: OpenAlex</p>
    </>
  );
}

function PaperResult({ paper }: { paper: Paper }) {
  const link = paper.url?.startsWith("https://") ? paper.url : null;
  const details = [
    paper.authors,
    paper.year ? String(paper.year) : null,
    paper.cited_by_count != null
      ? `${paper.cited_by_count.toLocaleString()} citations`
      : null,
  ].filter(Boolean);

  return (
    <article className="paper-result">
      <h2 className="paper-result__title">
        {link ? (
          <a href={link} target="_blank" rel="noopener noreferrer">
            {paper.title}
          </a>
        ) : (
          paper.title
        )}
      </h2>

      {details.length > 0 && (
        <p className="paper-result__details">{details.join(" · ")}</p>
      )}

      {paper.abstract && (
        <p className="paper-result__abstract">{paper.abstract}</p>
      )}
    </article>
  );
}
