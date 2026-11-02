import type { ReactNode } from 'react'
import Icon from '../../../components/Icon/Icon'
import PlaceholderPanel from '../../../components/PlaceholderPanel/PlaceholderPanel'
import Tag from '../../../components/Tag/Tag'
import type { StageContent } from '../../../data/threadDetails'
import { isHttpsUrl } from '../../../services/chartData'

/** A compact card in the right column, optionally with a source link. */
export interface StageFactCard {
  label: string
  title: string
  text: string
  source?: { name?: string | null; url?: string | null }
}

interface StagePanelProps {
  stageNumber: number
  title: string
  summary: string
  content?: StageContent
  /** Text when the stage has no content; defaults to the database wording. */
  emptyText?: string
  /** Shown under the stage text, e.g. the Data stage's chart. */
  media?: ReactNode
  /** Cards added after the stage's own facts, e.g. the Data stage's key discoveries. */
  extraFacts?: StageFactCard[]
}

/** Content of the selected stage; only Stage 1 (Origin) has content in Figma. */
function StagePanel({
  stageNumber,
  title,
  summary,
  content,
  emptyText,
  media,
  extraFacts = [],
}: StagePanelProps) {
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
              {media && <div className="details-stage__media">{media}</div>}
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
            {extraFacts.map((fact) => (
              <div key={`${fact.label}-${fact.title}`} className="details-fact">
                <dt className="details-fact__label">{fact.label}</dt>
                <dd className="details-fact__title">{fact.title}</dd>
                {fact.text && <dd className="details-fact__text">{fact.text}</dd>}
                {fact.source && isHttpsUrl(fact.source.url) && (
                  <dd className="details-fact__link">
                    <a
                      className="details-timeline__source"
                      href={fact.source.url}
                      rel="noreferrer"
                      aria-label={`Source for "${fact.title}": ${fact.source.name || 'original source'}`}
                    >
                      Source: {fact.source.name || 'original source'}
                      <Icon name="arrow-right" />
                    </a>
                  </dd>
                )}
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
