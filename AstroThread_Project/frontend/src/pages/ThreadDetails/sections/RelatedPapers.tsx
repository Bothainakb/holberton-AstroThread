import PaperCard, { type PaperCardBookmark } from '../../../components/PaperCard/PaperCard'
import PlaceholderPanel from '../../../components/PlaceholderPanel/PlaceholderPanel'
import type { RelatedPaper } from '../../../data/threadDetails'
import Link from '../../../router/Link'
import { routes, withReturnPath } from '../../../router/router'
import type { PaperRef } from '../../../services/api'
import { quotedPhrases } from '../../../services/openAlexPapers'
import { MAX_PAPERS } from '../../../services/paperCounts'
import type { OpenAlexPapersState } from '../useOpenAlexPapers'
import type { PaperBookmarks } from '../usePaperBookmarks'

interface RelatedPapersProps {
  papers?: RelatedPaper[]
  /** Total papers on the thread; a note says when only some are shown. */
  paperCount?: number
  /** Text for the empty state. */
  emptyText?: string
  /** OpenAlex search results, used only while `papers` is empty. */
  openAlex?: { state: OpenAlexPapersState; onRetry: () => void }
  /** Saving papers (database threads only); the page to return to after signing in. */
  bookmarks?: PaperBookmarks
  returnPath?: string
}

/** The bookmark button of one card, or undefined when papers cannot be saved here. */
function cardBookmark(bookmarks: PaperBookmarks | undefined, paper: PaperRef | null): PaperCardBookmark | undefined {
  if (!bookmarks || bookmarks.status === 'unavailable' || paper === null) return undefined
  return {
    saved: bookmarks.isSaved(paper),
    pending: bookmarks.isPending(paper),
    loading: bookmarks.status === 'loading',
    onToggle: () => bookmarks.toggle(paper),
  }
}

/** Sign-in prompt, errors and confirmations for saving papers. */
function BookmarkNoticeLine({ bookmarks, returnPath }: { bookmarks?: PaperBookmarks; returnPath?: string }) {
  const notice = bookmarks?.notice
  return (
    <div className="details-bookmark-notice" role={notice && notice.kind !== 'done' ? 'alert' : 'status'}>
      {notice && (
        <p className={`details-bookmark-notice__text details-bookmark-notice__text--${notice.kind}`}>
          {notice.message}
          {notice.kind === 'sign-in' && (
            <>
              {' '}
              <Link href={withReturnPath(routes.login, returnPath)}>Sign in</Link> or{' '}
              <Link href={withReturnPath(routes.signUp, returnPath)}>create an account</Link>.
            </>
          )}
        </p>
      )}
    </div>
  )
}

const NO_LINKED_PAPERS = 'No papers are linked to this thread in the AstroThread database yet.'

/** Papers shown per thread: the first ones of each list, which come most relevant first. */
export { MAX_PAPERS }

/** The OpenAlex fallback; always says the papers are search results. */
function OpenAlexFallback({
  state,
  onRetry,
  emptyText,
  bookmarks,
}: {
  state: OpenAlexPapersState
  onRetry: () => void
  emptyText: string
  bookmarks?: PaperBookmarks
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

  const { query, phrases, observational, source } = state.data
  // OpenAlex results come most-cited first; only the top ones are shown.
  const items = state.data.items.slice(0, MAX_PAPERS)
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
            bookmark={cardBookmark(bookmarks, { openalexId: item.openalex_id })}
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
  bookmarks,
  returnPath,
}: RelatedPapersProps) {
  const shownPapers = papers?.slice(0, MAX_PAPERS)
  const shown = shownPapers?.length ?? 0

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

      <BookmarkNoticeLine bookmarks={bookmarks} returnPath={returnPath} />

      {shownPapers && shownPapers.length > 0 ? (
        <div className="details-papers__grid">
          {shownPapers.map((paper) => (
            // Titles can repeat; database ids cannot (sample papers have no id).
            <PaperCard
              key={paper.id ?? `${paper.title}-${paper.year}`}
              paper={paper}
              bookmark={cardBookmark(bookmarks, paper.id !== undefined ? { paperId: paper.id } : null)}
            />
          ))}
        </div>
      ) : openAlex ? (
        <OpenAlexFallback
          state={openAlex.state}
          onRetry={openAlex.onRetry}
          emptyText={emptyText}
          bookmarks={bookmarks}
        />
      ) : (
        <PlaceholderPanel className="details-section-placeholder" title="Related papers">
          {emptyText}
        </PlaceholderPanel>
      )}
    </section>
  )
}

export default RelatedPapers
