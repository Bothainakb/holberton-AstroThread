import { useEffect, useState } from "react";
import { ResearchLayout } from "../../components/ResearchLayout/ResearchLayout";
import { InfoPanel, InfoPanelSection } from "../../components/InfoPanel/InfoPanel";
import { MiniPaperCard } from "../../components/MiniPaperCard/MiniPaperCard";
import { EmptyState } from "../../components/EmptyState/EmptyState";
import { Button } from "../../components/Button/Button";
import { paperPath, routes, useLocation } from "../../lib/router";
import { formatAllAuthors, formatPublication } from "../../lib/formatPaper";
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

function getBackHref(from: string | null) {
  return from && from.startsWith(routes.search) ? from : routes.search;
}

function buildCitation(paper: PaperDetails) {
  return `${formatAllAuthors(paper.authors)} (${paper.year}). ${paper.title}. ${paper.venue}.`;
}

export function PaperDetailsPage({ paperId }: PaperDetailsPageProps) {
  const { searchParams } = useLocation();
  const from = searchParams.get("from");
  const backHref = getBackHref(from);
  const hasSearchOrigin = backHref !== routes.search;

  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<PaperResult | null>(null);
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");

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

  async function copyCitation(citation: string) {
    try {
      await navigator.clipboard.writeText(citation);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
  }

  const relatedHref = (relatedPaper: PaperSummary) => {
    const path = paperPath(relatedPaper.id);
    return from ? `${path}?${new URLSearchParams({ from }).toString()}` : path;
  };

  const backLink = (
    <a className="paper-details__back" href={backHref}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m15 18-6-6 6-6" />
      </svg>
      {hasSearchOrigin ? "Back to search results" : "Back to search"}
    </a>
  );

  if (isLoading) {
    return (
      <ResearchLayout>
        <div className="paper-details__loading" aria-busy="true">
          <p className="paper-details__status" role="status">
            Loading paper…
          </p>
          <span className="paper-details__skeleton paper-details__skeleton--short" />
          <span className="paper-details__skeleton paper-details__skeleton--title" />
          <span className="paper-details__skeleton" />
          <span className="paper-details__skeleton" />
          <span className="paper-details__skeleton paper-details__skeleton--medium" />
        </div>
      </ResearchLayout>
    );
  }

  if (result?.error) {
    return (
      <ResearchLayout>
        <EmptyState
          headingLevel="h1"
          title="This paper couldn’t be loaded"
          description="Check your connection and try again."
          actions={
            <>
              <Button onClick={() => setAttempt((value) => value + 1)}>Try again</Button>
              <a className="button button--secondary" href={backHref}>
                Back to search
              </a>
            </>
          }
        />
      </ResearchLayout>
    );
  }

  if (!paper) {
    return (
      <ResearchLayout>
        <EmptyState
          headingLevel="h1"
          title="We couldn’t find this paper"
          description="The link may be out of date. Search for the paper by its title, author, or topic."
          actions={
            <a className="button button--primary" href={backHref}>
              Go to search
            </a>
          }
        />
      </ResearchLayout>
    );
  }

  const citation = buildCitation(paper);

  return (
    <ResearchLayout
      sidebarLabel="Paper information"
      sidebar={
        <div className="paper-details__sidebar">
          {backLink}

          <h2 className="paper-details__sidebar-title">Paper information</h2>

          <dl className="paper-details__facts">
            <div>
              <dt>Research type</dt>
              <dd>{PAPER_TYPE_LABELS[paper.paperType]}</dd>
            </div>
            <div>
              <dt>Topic</dt>
              <dd>{paper.topic}</dd>
            </div>
            <div>
              <dt>Authors</dt>
              <dd>{formatAllAuthors(paper.authors)}</dd>
            </div>
            <div>
              <dt>Published</dt>
              <dd>{formatPublication(paper)}</dd>
            </div>
          </dl>

          {paper.keywords.length > 0 && (
            <div className="paper-details__keywords">
              <h3 className="paper-details__label">Keywords</h3>
              <ul className="paper-details__chips">
                {paper.keywords.map((keyword) => (
                  <li key={keyword}>
                    <a
                      className="paper-details__chip"
                      href={searchHref(keyword)}
                      aria-label={`Search for ${keyword}`}
                    >
                      {keyword}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="paper-details__actions">
            <Button variant="secondary" fullWidth onClick={() => copyCitation(citation)}>
              Copy citation
            </Button>
            <p className="paper-details__copy-status" role="status">
              {copyStatus === "copied" && "Citation copied."}
              {copyStatus === "failed" &&
                "Couldn’t copy automatically. Select the citation below instead."}
            </p>
            {copyStatus === "failed" && (
              <p className="paper-details__citation">{citation}</p>
            )}
          </div>
        </div>
      }
      rail={
        <InfoPanel
          title="Connected research"
          description="Papers and searches linked to this paper."
        >
          <InfoPanelSection title="Related research papers">
            {result && result.relatedPapers.length > 0 ? (
              <ul className="info-panel__list">
                {result.relatedPapers.map((relatedPaper) => (
                  <li key={relatedPaper.id}>
                    <MiniPaperCard paper={relatedPaper} href={relatedHref(relatedPaper)} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="info-panel__text">No related papers found yet.</p>
            )}
          </InfoPanelSection>

          <InfoPanelSection title="Explore this topic">
            <p className="info-panel__text">
              Find more research on {paper.topic.toLowerCase()}.
            </p>
            <div className="info-panel__chips">
              <a className="info-panel__chip" href={searchHref(paper.topic)}>
                Search {paper.topic}
              </a>
            </div>
          </InfoPanelSection>
        </InfoPanel>
      }
    >
      <article className="paper-details" aria-labelledby="paper-title">
        <p className="paper-details__eyebrow">
          <span className="paper-details__type">{PAPER_TYPE_LABELS[paper.paperType]}</span>
          <span>{paper.topic}</span>
        </p>

        <h1 id="paper-title" className="paper-details__title">
          {paper.title}
        </h1>

        <p className="paper-details__meta">{formatPublication(paper)}</p>

        <section className="paper-details__section" aria-labelledby="paper-abstract">
          <h2 id="paper-abstract" className="paper-details__heading">
            Abstract
          </h2>
          <p className="paper-details__text">{paper.abstract}</p>
        </section>

        <section className="paper-details__section" aria-labelledby="paper-summary">
          <h2 id="paper-summary" className="paper-details__heading">
            Research summary
          </h2>
          <dl className="paper-details__summary">
            <div className="paper-details__summary-row">
              <dt>Method</dt>
              <dd>{paper.method}</dd>
            </div>
            <div className="paper-details__summary-row">
              <dt>Main finding</dt>
              <dd>{paper.mainFinding}</dd>
            </div>
            <div className="paper-details__summary-row">
              <dt>Why it matters</dt>
              <dd>{paper.whyItMatters}</dd>
            </div>
          </dl>
        </section>
      </article>
    </ResearchLayout>
  );
}