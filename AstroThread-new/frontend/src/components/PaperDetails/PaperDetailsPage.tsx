import { useEffect, useState } from "react";
import { SiteHeader } from "../../components/SiteHeader/SiteHeader";
import { SiteFooter } from "../../components/SiteFooter/SiteFooter";
import { SearchBox } from "../../components/SearchBox/SearchBox";
import { EmptyState } from "../../components/EmptyState/EmptyState";
import { Button } from "../../components/Button/Button";
import { ResearchAssistant } from "../../components/ResearchAssistant/ResearchAssistant";
import { getCurrentSession } from "../../data/demoAuth";
import { navigate, paperPath, routes, useLocation } from "../../lib/router";
import { formatAllAuthors } from "../../lib/formatPaper";
import { PAPER_TYPE_LABELS } from "../../lib/searchResults";
import { getPaper, getRelatedPapers } from "../../services/research/researchService";
import type { PaperDetails, PaperSummary } from "../../types/research";
import "./PaperDetailsPage.css";

interface PaperDetailsPageProps {
  paperId: string;
}

interface PaperResult {
  key: string;
  paper: PaperDetails | null;
  relatedPapers: PaperSummary[];
  error: boolean;
}

type CopyStatus = "idle" | "copied" | "failed";

function searchHref(query: string) {
  return `${routes.search}?${new URLSearchParams({ q: query }).toString()}`;
}

function readSearchOrigin(from: string | null) {
  if (!from || !from.startsWith(routes.search)) {
    return null;
  }

  const query = new URL(from, window.location.origin).searchParams.get("q") ?? "";
  return { href: from, query };
}

function buildCitation(paper: PaperDetails) {
  return `${formatAllAuthors(paper.authors)} (${paper.year}). ${paper.title}. ${paper.venue}.`;
}

function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
      <rect x="8.5" y="8.5" width="11" height="11" rx="2" />
      <path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5" />
    </svg>
  );
}

export function PaperDetailsPage({ paperId }: PaperDetailsPageProps) {
  const { pathname, searchParams } = useLocation();
  const from = searchParams.get("from");
  const searchOrigin = readSearchOrigin(from);

  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<PaperResult | null>(null);
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");
  const [query, setQuery] = useState(searchOrigin?.query ?? "");
  const [session] = useState(getCurrentSession);

  const requestKey = `${attempt}:${paperId}`;
  const isLoading = result?.key !== requestKey;
  const paper = !isLoading ? result?.paper ?? null : null;

  useEffect(() => {
    const controller = new AbortController();

    getPaper(paperId, controller.signal)
      .then(async (loadedPaper) => {
        const relatedPapers = loadedPaper
          ? await getRelatedPapers(loadedPaper, controller.signal)
          : [];

        setResult({ key: requestKey, paper: loadedPaper, relatedPapers, error: false });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setResult({ key: requestKey, paper: null, relatedPapers: [], error: true });
      });

    return () => controller.abort();
  }, [paperId, requestKey]);

  useEffect(() => {
    if (paper) {
      document.title = `${paper.title} | AstroThread`;
    } else if (!isLoading) {
      document.title = "Paper not found | AstroThread";
    }
  }, [paper, isLoading]);

  function runSearch(nextQuery: string) {
    const trimmed = nextQuery.trim();

    if (trimmed) {
      navigate(searchHref(trimmed));
    }
  }

  async function copyCitation(citation: string) {
    try {
      await navigator.clipboard.writeText(citation);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
  }

  function showAssistant() {
    const assistant = document.getElementById("research-assistant");
    assistant?.scrollIntoView({ behavior: "smooth", block: "start" });
    document.getElementById("assistant-input")?.focus({ preventScroll: true });
  }

  const relatedHref = (relatedPaper: PaperSummary) => {
    const path = paperPath(relatedPaper.id);
    return from ? `${path}?${new URLSearchParams({ from }).toString()}` : path;
  };

  const currentPath = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
  const returnParams = new URLSearchParams({ from: currentPath }).toString();
  const backHref = searchOrigin?.href ?? routes.home;

  let content;

  if (isLoading) {
    content = (
      <div className="paper-page__loading" aria-busy="true">
        <p className="visually-hidden" role="status">
          Loading paper…
        </p>
        <span className="paper-page__skeleton paper-page__skeleton--short" />
        <span className="paper-page__skeleton paper-page__skeleton--title" />
        <span className="paper-page__skeleton" />
        <span className="paper-page__skeleton paper-page__skeleton--medium" />
      </div>
    );
  } else if (result?.error) {
    content = (
      <EmptyState
        headingLevel="h1"
        title="This paper couldn’t be loaded"
        description="Check your connection and try again."
        actions={
          <>
            <Button onClick={() => setAttempt((value) => value + 1)}>Try again</Button>
            <a className="button button--secondary" href={backHref}>
              Go back
            </a>
          </>
        }
      />
    );
  } else if (!paper) {
    content = (
      <EmptyState
        headingLevel="h1"
        title="We couldn’t find this paper"
        description="The link may be out of date. Search for the paper by its title, author, or topic."
        actions={
          <a className="button button--primary" href={routes.search}>
            Go to search
          </a>
        }
      />
    );
  } else {
    const citation = buildCitation(paper);
    const typeLabel = PAPER_TYPE_LABELS[paper.paperType];

    content = (
      <div className="paper-page__layout">
        <article className="paper-page__article" aria-labelledby="paper-title">
          <a className="paper-page__back" href={backHref}>
            <BackIcon />
            {searchOrigin?.query ? `Results for “${searchOrigin.query}”` : "Home"}
          </a>

          <p className="paper-page__source">
            {paper.venue}
            {paper.year ? ` · ${paper.year}` : ""}
          </p>

          <h1 id="paper-title" className="paper-page__title">
            {paper.title}
          </h1>

          <p className="paper-page__authors">{formatAllAuthors(paper.authors)}</p>

          <p className="paper-page__meta">
            {paper.year > 0 && <span>Published {paper.year}</span>}
            {paper.venue && <span>{paper.venue}</span>}
            <span className="paper-page__tag">{typeLabel}</span>
          </p>

          <div className="paper-page__actions">
            <Button variant="secondary" icon={<CopyIcon />} onClick={() => copyCitation(citation)}>
              Copy citation
            </Button>
            <Button
              variant="secondary"
              className="paper-page__ask"
              onClick={showAssistant}
            >
              Ask the assistant
            </Button>
          </div>

          <p className="paper-page__copy-status" role="status">
            {copyStatus === "copied" && "Citation copied."}
            {copyStatus === "failed" && "Couldn’t copy automatically. Select the citation below."}
          </p>
          {copyStatus === "failed" && <p className="paper-page__citation">{citation}</p>}

          <section className="paper-page__section">
            <h2 className="paper-page__heading">Summary</h2>
            <p className="paper-page__text">{paper.abstract}</p>
          </section>

          <section className="paper-page__section">
            <h2 className="paper-page__heading">Key findings</h2>
            <p className="paper-page__text">{paper.mainFinding}</p>
          </section>

          <section className="paper-page__section">
            <h2 className="paper-page__heading">Method</h2>
            <p className="paper-page__text">{paper.method}</p>
          </section>

          <section className="paper-page__section">
            <h2 className="paper-page__heading">Why it matters</h2>
            <p className="paper-page__text">{paper.whyItMatters}</p>
          </section>

          <section className="paper-page__section">
            <h2 className="paper-page__heading">Research information</h2>
            <dl className="paper-page__info">
              {paper.venue && (
                <div>
                  <dt>Journal</dt>
                  <dd>{paper.venue}</dd>
                </div>
              )}
              {paper.year > 0 && (
                <div>
                  <dt>Published</dt>
                  <dd>{paper.year}</dd>
                </div>
              )}
              <div>
                <dt>Research type</dt>
                <dd>{typeLabel}</dd>
              </div>
              <div>
                <dt>Topic</dt>
                <dd>
                  <a className="paper-page__link" href={searchHref(paper.topic)}>
                    {paper.topic}
                  </a>
                </dd>
              </div>
            </dl>
          </section>

          {paper.keywords.length > 0 && (
            <section className="paper-page__section">
              <h2 className="paper-page__heading">Keywords</h2>
              <ul className="paper-page__keywords">
                {paper.keywords.map((keyword) => (
                  <li key={keyword}>
                    <a
                      className="paper-page__keyword"
                      href={searchHref(keyword)}
                      aria-label={`Search for ${keyword}`}
                    >
                      {keyword}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="paper-page__section">
            <h2 className="paper-page__heading">Related papers</h2>
            {result && result.relatedPapers.length > 0 ? (
              <ul className="paper-page__related">
                {result.relatedPapers.map((relatedPaper) => (
                  <li key={relatedPaper.id}>
                    <a className="paper-page__link" href={relatedHref(relatedPaper)}>
                      {relatedPaper.title}
                    </a>
                    <span>
                      {formatAllAuthors(relatedPaper.authors)}
                      {relatedPaper.year ? `, ${relatedPaper.year}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="paper-page__text">No related papers found yet.</p>
            )}
          </section>

          <p className="paper-page__note">
            The summary and key findings are written for AstroThread. Read the original paper
            for the full abstract and methods.
          </p>
        </article>

        <ResearchAssistant
          paper={paper}
          isSignedIn={Boolean(session)}
          logInHref={`${routes.signIn}?${returnParams}`}
          signUpHref={`${routes.signUp}?${returnParams}`}
        />
      </div>
    );
  }

  return (
    <div className="paper-page">
      <SiteHeader
        search={
          <SearchBox
            size="compact"
            value={query}
            onValueChange={setQuery}
            onSearch={runSearch}
          />
        }
      />

      <main className="paper-page__main">{content}</main>

      <SiteFooter />
    </div>
  );
}