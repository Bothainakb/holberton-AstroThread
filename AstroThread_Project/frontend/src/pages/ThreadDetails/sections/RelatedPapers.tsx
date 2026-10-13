import Button from '../../../components/Button/Button'
import PaperCard from '../../../components/PaperCard/PaperCard'
import PlaceholderPanel from '../../../components/PlaceholderPanel/PlaceholderPanel'
import type { RelatedPaper } from '../../../data/threadDetails'

interface RelatedPapersProps {
  papers?: RelatedPaper[]
  paperCount: number
}

function RelatedPapers({ papers, paperCount }: RelatedPapersProps) {
  return (
    <section className="details-papers container" id="related-papers" aria-labelledby="papers-title">
      <div className="details-heading details-heading--with-action">
        <div>
          <h2 className="details-heading__title" id="papers-title" tabIndex={-1}>
            Related Papers
          </h2>
          <p className="details-heading__subtitle">Key papers behind this stage of the thread.</p>
        </div>
        {/* The full paper list will come from the papers API. */}
        <Button variant="secondary" href="#">
          View all {paperCount} papers
        </Button>
      </div>

      {papers ? (
        <div className="details-papers__grid">
          {papers.map((paper) => (
            <PaperCard key={paper.title} paper={paper} />
          ))}
        </div>
      ) : (
        <PlaceholderPanel className="details-section-placeholder" title="Related papers">
          Paper summaries for this thread have not been added yet.
        </PlaceholderPanel>
      )}
    </section>
  )
}

export default RelatedPapers
