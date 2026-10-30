import PaperCard from '../../../components/PaperCard/PaperCard'
import PlaceholderPanel from '../../../components/PlaceholderPanel/PlaceholderPanel'
import type { RelatedPaper } from '../../../data/threadDetails'
import { quotedPhrases } from '../../../services/openAlexPapers'
import type { OpenAlexPapersState } from '../useOpenAlexPapers'

interface RelatedPapersProps {
  papers?: RelatedPaper[]
  /** Total papers on the thread; a note says when only some are shown. */
  paperCount?: number
  /** Text for the empty state. */
  emptyText?: string
  /** OpenAlex search results, used only while `papers` is empty. */
  openAlex?: { state: OpenAlexPapersState; onRetry: () => void }
}

const NO_LINKED_PAPERS = 'No papers are linked to this thread in the AstroThread database yet.'

/** The OpenAlex fallback; always says the papers are search results. */
function OpenAlexFallback({
  state,
  onRetry,
  emptyText,
}: {
  state: OpenAlexPapersState
  onRetry: () => void
  emptyText: string
}) {
  if (state.status === 'loading') {
    return (
      <p className="details-section-note" role="status">
        {NO_LINKED_PAPERS} Searching OpenAlex for related papers…
      </p>
    )
  }
  if (state.status === 'error') {
    return (
      <div className="details-status-banner" role="alert">
        <p>
          {NO_LINKED_PAPERS} Papers from OpenAlex could not be loaded: {state.message}
        </p>
        <button type="button" className="button button--secondary" onClick={onRetry}>
          Try again
        </button>
      </div>
    )
  }
  if (state.status === 'unavailable' || state.data.items.length === 0) {
    return (
      <PlaceholderPanel className="details-section-placeholder" title="Related papers">
        {emptyText}
        {state.status === 'ready' &&
          ` OpenAlex has no articles with ${quotedPhrases(state.data.phrases ?? [state.data.query])} in the title either.`}
      </PlaceholderPanel>
    )
  }

  const { query, phrases, observational, source, items } = state.data
  return (
    <>
      <p className="details-section-note">
        {NO_LINKED_PAPERS} These are the most-cited {source} articles with{' '}
        {quotedPhrases(phrases ?? [query])} in the title
        {observational ? ' that report observations or measurements' : ''}: search results, not a
        curated list.
      </p>
      <div className="details-papers__grid">
        {items.map((item) => (
          <PaperCard
            key={item.openalex_id}
            paper={{
              year: item.year,
              title: item.title,
              authors: item.authors ?? 'Unknown authors',
              url: item.url,
              summary: item.summary ?? undefined,
              missingSummary: 'OpenAlex has no abstract for this paper.',
            }}
          />
        ))}
      </div>
    </>
  )
}

function RelatedPapers({
  papers,
  paperCount,
  emptyText = 'Paper summaries for this thread have not been added yet.',
  openAlex,
}: RelatedPapersProps) {
  const shown = papers?.length ?? 0
  const hasIllustrative = papers?.some((paper) => paper.illustrative) ?? false

  return (
    <section className="details-papers container" id="related-papers" aria-labelledby="papers-title">
      <div className="details-heading details-heading--with-action">
        <div>
          <h2 className="details-heading__title" id="papers-title" tabIndex={-1}>
            Related Research Papers
          </h2>
          <p className="details-heading__subtitle">Key papers behind this stage of the thread.</p>
        </div>
        {/* There is no full paper list page yet. */}
        {paperCount !== undefined && paperCount > shown && (
          <span className="details-unavailable">
            Full list of {paperCount} papers not available yet
          </span>
        )}
      </div>

      {hasIllustrative && (
        <p className="details-section-note">
          Papers marked Illustrative data are a hand-picked sample stored in the AstroThread
          database, not a complete or curated list.
        </p>
      )}

      {papers && papers.length > 0 ? (
        <div className="details-papers__grid">
          {papers.map((paper) => (
            // Titles can repeat; database ids cannot (sample papers have no id).
            <PaperCard key={paper.id ?? `${paper.title}-${paper.year}`} paper={paper} />
          ))}
        </div>
      ) : openAlex ? (
        <OpenAlexFallback state={openAlex.state} onRetry={openAlex.onRetry} emptyText={emptyText} />
      ) : (
        <PlaceholderPanel className="details-section-placeholder" title="Related papers">
          {emptyText}
        </PlaceholderPanel>
      )}
    </section>
  )
}

export default RelatedPapers
