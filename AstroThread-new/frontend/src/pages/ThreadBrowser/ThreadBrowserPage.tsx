import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ResearchLayout } from "../../components/ResearchLayout/ResearchLayout";
import { ThreadCard } from "../../components/ThreadCard/ThreadCard";
import { FilterPills } from "../../components/FilterPills/FilterPills";
import type { FilterPillOption } from "../../components/FilterPills/FilterPills";
import { SearchBox } from "../../components/SearchBox/SearchBox";
import { SelectField } from "../../components/FormField/FormField";
import { Pagination } from "../../components/Pagination/Pagination";
import { EmptyState } from "../../components/EmptyState/EmptyState";
import { FormAlert } from "../../components/FormAlert/FormAlert";
import { Button } from "../../components/Button/Button";
import { navigate, paperPath, routes, useLocation } from "../../lib/router";
import { formatYearRange } from "../../lib/formatPaper";
import { getThreadPapers, getThreads } from "../../services/research/researchService";
import type { PaperSummary, ThreadSummary } from "../../types/research";
import "./ThreadBrowserPage.css";

type ThreadSort = "featured" | "papers" | "name";

interface ThreadBrowserState {
  query: string;
  topic: string;
  sort: ThreadSort;
  page: number;
}

interface ThreadsResult {
  key: string;
  threads: ThreadSummary[];
  error: boolean;
}

interface PapersResult {
  key: string;
  papers: PaperSummary[];
  error: boolean;
}

const THREADS_PER_PAGE = 4;
const RAIL_PAPER_LIMIT = 4;
const LOADING_CARD_COUNT = 4;

// An empty topic value means "All topics".
const ALL_TOPICS = "";

const SORT_OPTIONS: readonly { value: ThreadSort; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "papers", label: "Most papers" },
  { value: "name", label: "Name A to Z" },
];

function isThreadSort(value: string | null): value is ThreadSort {
  return SORT_OPTIONS.some((option) => option.value === value);
}

function readBrowserState(params: URLSearchParams): ThreadBrowserState {
  const sort = params.get("sort");
  const page = Number.parseInt(params.get("page") ?? "", 10);

  return {
    query: (params.get("q") ?? "").trim(),
    topic: (params.get("topic") ?? "").trim(),
    sort: isThreadSort(sort) ? sort : "featured",
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

function buildThreadsHref(state: ThreadBrowserState): string {
  const params = new URLSearchParams();

  if (state.query) {
    params.set("q", state.query);
  }

  if (state.topic) {
    params.set("topic", state.topic);
  }

  if (state.sort !== "featured") {
    params.set("sort", state.sort);
  }

  if (state.page > 1) {
    params.set("page", String(state.page));
  }

  const search = params.toString();
  return search ? `${routes.threads}?${search}` : routes.threads;
}

function matchesQuery(thread: ThreadSummary, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const text = `${thread.title} ${thread.topic} ${thread.summary}`.toLowerCase();

  return words.every((word) => text.includes(word));
}

function sortThreads(threads: readonly ThreadSummary[], sort: ThreadSort): ThreadSummary[] {
  if (sort === "papers") {
    return [...threads].sort(
      (a, b) => b.paperCount - a.paperCount || a.title.localeCompare(b.title),
    );
  }

  if (sort === "name") {
    return [...threads].sort((a, b) => a.title.localeCompare(b.title));
  }

  // "Featured" keeps the order the threads were loaded in.
  return [...threads];
}

function getTopicOptions(threads: readonly ThreadSummary[]): FilterPillOption[] {
  const topics = [...new Set(threads.map((thread) => thread.topic))].sort((a, b) =>
    a.localeCompare(b),
  );

  return [
    { value: ALL_TOPICS, label: "All" },
    ...topics.map((topic) => ({ value: topic, label: topic })),
  ];
}

export function ThreadBrowserPage() {
  const { searchParams } = useLocation();
  const state = readBrowserState(searchParams);
  const { query, topic, sort, page } = state;

  const [input, setInput] = useState(query);
  const [syncedQuery, setSyncedQuery] = useState(query);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<ThreadsResult | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [papersAttempt, setPapersAttempt] = useState(0);
  const [papersResult, setPapersResult] = useState<PapersResult | null>(null);
  const resultsHeadingRef = useRef<HTMLHeadingElement>(null);
  const previewPanelId = useId();
  const previewTitleId = useId();

  // Keep the search box in step with the URL (for example after Back or Forward).
  if (query !== syncedQuery) {
    setSyncedQuery(query);
    setInput(query);
  }

  const requestKey = String(attempt);
  const isLoading = result?.key !== requestKey;
  const hasError = !isLoading && result?.error === true;

  useEffect(() => {
    document.title = query
      ? `${query} | Thread Browser | AstroThread`
      : "Thread Browser | AstroThread";
  }, [query]);

  useEffect(() => {
    const controller = new AbortController();

    getThreads(controller.signal)
      .then((threads) => {
        setResult({ key: requestKey, threads, error: false });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setResult({ key: requestKey, threads: [], error: true });
      });

    return () => controller.abort();
  }, [requestKey]);

  const allThreads = useMemo(
    () => (!isLoading && result ? result.threads : []),
    [isLoading, result],
  );

  const topicOptions = useMemo(() => getTopicOptions(allThreads), [allThreads]);

  const filteredThreads = useMemo(() => {
    const matching = allThreads.filter(
      (thread) =>
        (topic === ALL_TOPICS || thread.topic === topic) &&
        (!query || matchesQuery(thread, query)),
    );

    return sortThreads(matching, sort);
  }, [allThreads, topic, query, sort]);

  const pageCount = Math.max(1, Math.ceil(filteredThreads.length / THREADS_PER_PAGE));
  const currentPage = Math.min(page, pageCount);
  const pageThreads = filteredThreads.slice(
    (currentPage - 1) * THREADS_PER_PAGE,
    currentPage * THREADS_PER_PAGE,
  );

  // The preview shows the thread the user picked, or the first thread on this page.
  const previewThread =
    pageThreads.find((thread) => thread.id === selectedId) ?? pageThreads[0] ?? null;

  const papersKey = previewThread ? `${papersAttempt}:${previewThread.id}` : "";
  const isPapersLoading = previewThread !== null && papersResult?.key !== papersKey;

  useEffect(() => {
    if (!previewThread) {
      return;
    }

    const controller = new AbortController();

    getThreadPapers(previewThread, controller.signal)
      .then((papers) => {
        setPapersResult({ key: papersKey, papers, error: false });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setPapersResult({ key: papersKey, papers: [], error: true });
      });

    return () => controller.abort();
  }, [previewThread, papersKey]);

  const hasThreads = !isLoading && !hasError && allThreads.length > 0;
  const hasNoThreadsAtAll = !isLoading && !hasError && allThreads.length === 0;
  const hasNoMatches = hasThreads && filteredThreads.length === 0;
  const hasMatches = hasThreads && filteredThreads.length > 0;

  function updateState(next: Partial<ThreadBrowserState>, replace = true) {
    navigate(buildThreadsHref({ ...state, page: 1, ...next }), { replace });
  }

  function runSearch(nextQuery: string) {
    const trimmed = nextQuery.trim();
    setInput(trimmed);
    updateState({ query: trimmed }, false);
  }

  function changePage(nextPage: number) {
    navigate(buildThreadsHref({ ...state, page: nextPage }));
    resultsHeadingRef.current?.focus();
  }

  function changeTopic(selected: string[]) {
    // FilterPills allows several choices; this page keeps one topic at a time.
    const added = selected.find((value) => value !== topic);
    updateState({ topic: added ?? ALL_TOPICS });
  }

  function showAllThreads() {
    setInput("");
    updateState({ query: "", topic: ALL_TOPICS });
  }

  const countLabel = `${filteredThreads.length} ${
    filteredThreads.length === 1 ? "thread" : "threads"
  }`;

  const sidebar = (
    <div className="thread-browser__sidebar">
      <p className="thread-browser__sidebar-title">Thread Browser</p>

      <div className="thread-browser__controls">
        <SelectField
          id="thread-sort"
          label="Sort threads"
          options={SORT_OPTIONS}
          value={sort}
          disabled={!hasThreads}
          onChange={(event) => updateState({ sort: event.target.value as ThreadSort })}
        />

        <FilterPills
          legend="Topic"
          options={topicOptions}
          selected={[topic]}
          disabled={!hasThreads}
          onChange={changeTopic}
        />
      </div>

      <p className="thread-browser__help">
        Each thread follows one scientific idea through its key discoveries and papers.
      </p>
    </div>
  );

  const papers = papersResult?.key === papersKey ? papersResult.papers : [];
  const railPapers = papers.slice(-RAIL_PAPER_LIMIT);
  const railYears = previewThread
    ? formatYearRange(previewThread.firstYear, previewThread.lastYear)
    : "";

  const rail = (
    <section
      id={previewPanelId}
      className="thread-browser__preview"
      aria-labelledby={previewTitleId}
    >
      {previewThread ? (
        <>
          <div className="thread-browser__preview-header">
            <h2 id={previewTitleId} className="thread-browser__preview-title">
              {previewThread.title}
            </h2>
            <p className="thread-browser__preview-meta">
              {previewThread.topic}
              {railYears && ` · ${railYears}`}
            </p>
          </div>

          <p className="thread-browser__preview-text">{previewThread.summary}</p>

          <div className="thread-browser__preview-section">
            <h3 className="thread-browser__preview-label">Papers</h3>

            {isPapersLoading && (
              <p className="thread-browser__preview-text" role="status">
                Loading papers…
              </p>
            )}

            {!isPapersLoading && papersResult?.error && (
              <div className="thread-browser__preview-error">
                <p className="thread-browser__preview-text">
                  The papers for this thread couldn’t be loaded.
                </p>
                <button
                  type="button"
                  className="thread-browser__preview-retry"
                  onClick={() => setPapersAttempt((value) => value + 1)}
                >
                  Try again
                </button>
              </div>
            )}

            {!isPapersLoading && !papersResult?.error && railPapers.length === 0 && (
              <p className="thread-browser__preview-text">
                No papers are linked to this thread yet.
              </p>
            )}

            {!isPapersLoading && !papersResult?.error && railPapers.length > 0 && (
              <>
                <ol className="thread-browser__papers">
                  {railPapers.map((paper) => (
                    <li key={paper.id}>
                      <a className="thread-browser__paper" href={paperPath(paper.id)}>
                        <span className="thread-browser__paper-year">
                          {paper.year || "Year unknown"}
                        </span>
                        <span className="thread-browser__paper-title">{paper.title}</span>
                      </a>
                    </li>
                  ))}
                </ol>

                {papers.length > railPapers.length && (
                  <p className="thread-browser__preview-note">
                    Showing the {railPapers.length} most recent of {papers.length} papers.
                  </p>
                )}
              </>
            )}
          </div>
        </>
      ) : (
        <div className="thread-browser__preview-header">
          <h2 id={previewTitleId} className="thread-browser__preview-title">
            Thread preview
          </h2>
          <p className="thread-browser__preview-text">
            Select a thread to preview it here.
          </p>
        </div>
      )}
    </section>
  );

  return (
    <ResearchLayout sidebar={sidebar} sidebarLabel="Thread options" rail={rail}>
      <section className="thread-browser" aria-labelledby="thread-results-title">
        <SearchBox
          value={input}
          onValueChange={setInput}
          onSearch={runSearch}
          label="Search research threads"
          placeholder="Search any topic or keyword"
        />

        <div className="thread-browser__results-head">
          <span className="thread-browser__topic-badge">{topic || "All topics"}</span>

          <h1
            id="thread-results-title"
            ref={resultsHeadingRef}
            tabIndex={-1}
            className="thread-browser__count"
          >
            <span className="visually-hidden">Thread Browser: </span>
            {isLoading ? "Loading threads…" : hasError ? "Threads unavailable" : countLabel}
          </h1>
        </div>

        {isLoading && (
          <div className="thread-browser__skeletons" aria-busy="true" aria-hidden="true">
            {Array.from({ length: LOADING_CARD_COUNT }, (_, index) => (
              <div key={index} className="thread-browser__skeleton">
                <span className="thread-browser__skeleton-line thread-browser__skeleton-line--short" />
                <span className="thread-browser__skeleton-line thread-browser__skeleton-line--title" />
                <span className="thread-browser__skeleton-line" />
              </div>
            ))}
          </div>
        )}

        {hasError && (
          <div className="thread-browser__state">
            <FormAlert tone="error" title="Threads aren’t available right now">
              We couldn’t load the research threads. Check your connection and try again.
            </FormAlert>
            <Button variant="secondary" onClick={() => setAttempt((value) => value + 1)}>
              Try again
            </Button>
          </div>
        )}

        {hasNoThreadsAtAll && (
          <EmptyState
            title="No threads yet"
            description="Research threads will appear here once they’re published."
          />
        )}

        {hasNoMatches && (
          <EmptyState
            title="No threads match your search"
            description="Check the spelling or show all threads."
            actions={
              <Button variant="secondary" onClick={showAllThreads}>
                Show all threads
              </Button>
            }
          />
        )}

        {hasMatches && (
          <>
            <ol className="thread-browser__list">
              {pageThreads.map((thread) => (
                <li key={thread.id}>
                  <ThreadCard
                    thread={thread}
                    isSelected={thread.id === previewThread?.id}
                    previewPanelId={previewPanelId}
                    onPreview={() => setSelectedId(thread.id)}
                  />
                </li>
              ))}
            </ol>

            <Pagination
              currentPage={currentPage}
              pageCount={pageCount}
              label="Thread pages"
              onPageChange={changePage}
            />
          </>
        )}
      </section>
    </ResearchLayout>
  );
}