import Button from '../../../components/Button/Button'
import PlaceholderPanel from '../../../components/PlaceholderPanel/PlaceholderPanel'
import Tag from '../../../components/Tag/Tag'
import type { StageContent } from '../../../data/threadDetails'

interface StagePanelProps {
  stageNumber: number
  title: string
  summary: string
  content?: StageContent
  /** Text when the stage has no content; defaults to the database wording. */
  emptyText?: string
}

/** Content of the selected stage; only Stage 1 (Origin) has content in Figma. */
function StagePanel({ stageNumber, title, summary, content, emptyText }: StagePanelProps) {
  const label = `Stage ${String(stageNumber).padStart(2, '0')}`

  return (
    <section
      className="details-stage container"
      id="stage-content"
      aria-labelledby="stage-title"
    >
      <div className={`details-stage__card${content ? '' : ' details-stage__card--empty'}`}>
        <div className="details-stage__main">
          <Tag>{label}</Tag>
          <h2 className="details-stage__title" id="stage-title" tabIndex={-1}>
            {title}
          </h2>

          {content ? (
            <>
              <div className="details-stage__text">
                {content.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
              <Button className="details-stage__button" href="#related-papers">
                Explore Research
              </Button>
            </>
          ) : (
            <p className="details-stage__summary">{summary}</p>
          )}
        </div>

        {content ? (
          <dl className="details-stage__facts">
            {content.facts.map((fact) => (
              <div key={fact.label} className="details-fact">
                <dt className="details-fact__label">{fact.label}</dt>
                <dd className="details-fact__title">{fact.title}</dd>
                <dd className="details-fact__text">{fact.text}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <PlaceholderPanel title="Stage content coming soon">
            {emptyText ?? (
              <>
                The detailed {title} stage for this thread has not been written yet. It will come from
                the research database once the backend is connected.
              </>
            )}
          </PlaceholderPanel>
        )}
      </div>
    </section>
  )
}

export default StagePanel
