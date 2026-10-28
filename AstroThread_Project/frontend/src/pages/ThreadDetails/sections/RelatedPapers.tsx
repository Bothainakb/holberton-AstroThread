import PaperCard from '../../../components/PaperCard/PaperCard'
import PlaceholderPanel from '../../../components/PlaceholderPanel/PlaceholderPanel'
import type { RelatedPaper } from '../../../data/threadDetails'

interface RelatedPapersProps {
  papers?: RelatedPaper[]
  /** Total papers on the thread; a note says when only some are shown. */
  paperCount?: number
  /** Text for the empty state. */
  emptyText?: string
}

function RelatedPapers({
  papers,
  paperCount,
  emptyText = 'Paper summaries for this thread have not been added yet.',
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
      ) : (
        <PlaceholderPanel className="details-section-placeholder" title="Related papers">
          {emptyText}
        </PlaceholderPanel>
      )}
    </section>
  )
}

export default RelatedPapers
