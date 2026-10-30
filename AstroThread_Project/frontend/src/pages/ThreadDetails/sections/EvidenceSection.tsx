import DataChart, { type ChartGeometry } from '../../../components/DataChart/DataChart'
import Icon from '../../../components/Icon/Icon'
import MeasuredChart from '../../../components/MeasuredChart/MeasuredChart'
import PlaceholderPanel from '../../../components/PlaceholderPanel/PlaceholderPanel'
import Tag from '../../../components/Tag/Tag'
import type { ChartPoint } from '../../../data/home'
import type { ThreadDetail } from '../../../data/threadDetails'
import type { ApiTimelineEvent } from '../../../services/api'
import { isHttpsUrl, type MeasuredChartData } from '../../../services/chartData'

// Plot geometry of "Observations over time" in Figma pixels.
const EVIDENCE_CHART: ChartGeometry = {
  width: 612.7,
  height: 187.4,
  top: 6.3,
  bottom: 187.4,
  inset: 27,
  pointRadius: 6.3,
  gridLines: [8.1, 53.2, 98.2, 143.3],
}

/** Data from GET /api/threads/:id; replaces the design sample when set. */
export interface LiveEvidence {
  /**
   * A sourced chart (migration 006), else an older chart without a source
   * (drawn as before, with its own note), else null when the database has none.
   */
  chart:
    | { kind: 'measured'; data: MeasuredChartData }
    | { kind: 'illustrative'; title: string; note: string | null; points: ChartPoint[] }
    | null
  timeline: ApiTimelineEvent[]
}

interface EvidenceSectionProps {
  evidence?: ThreadDetail['evidence']
  live?: LiveEvidence
  /** Text for the empty state (no evidence and no live data). */
  emptyText?: string
}

function LiveEvidenceGrid({ live }: { live: LiveEvidence }) {
  return (
    <div className="details-evidence__grid">
      {live.chart?.kind === 'measured' ? (
        <MeasuredChart className="data-chart--evidence" chart={live.chart.data} />
      ) : live.chart ? (
        <DataChart
          className="data-chart--evidence"
          title={live.chart.title}
          note={live.chart.note ?? undefined}
          data={live.chart.points}
          geometry={EVIDENCE_CHART}
        />
      ) : (
        <PlaceholderPanel title="No verified measurements yet">
          There is no verified dataset for this thread in the AstroThread database yet, so no
          chart is shown.
        </PlaceholderPanel>
      )}

      <div className="details-evidence__side">
        <div className="details-discovery">
          <p className="details-discovery__label">KEY DISCOVERIES</p>
          {live.timeline.length > 0 ? (
            <ol className="details-timeline">
              {live.timeline.map((event) => (
                <li className="details-timeline__item" key={event.id}>
                  <span className="details-timeline__year">{event.year}</span>
                  <div>
                    <h3 className="details-timeline__title">{event.title}</h3>
                    {event.description && (
                      <p className="details-timeline__text">{event.description}</p>
                    )}
                    {isHttpsUrl(event.source_url) && (
                      <a
                        className="details-timeline__source"
                        href={event.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Source for "${event.title}": ${event.source_name || 'original source'} (opens in a new tab)`}
                      >
                        Source: {event.source_name || 'original source'}
                        <Icon name="arrow-right" />
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="details-discovery__text">
              No discoveries have been added to this thread yet.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function EvidenceSection({
  evidence,
  live,
  emptyText = 'Charts and key measurements for this thread have not been added yet.',
}: EvidenceSectionProps) {
  return (
    <section
      className="details-band details-evidence"
      id="evidence"
      aria-labelledby="evidence-title"
    >
      <div className="container">
        <div className="details-heading">
          <Tag>Data &amp; discoveries</Tag>
          <h2
            className="details-heading__title details-heading__title--tagged"
            id="evidence-title"
            tabIndex={-1}
          >
            From research to evidence
          </h2>
          <p className="details-heading__subtitle">
            How the findings in this thread connect to real observations.
          </p>
        </div>

        {live ? (
          <LiveEvidenceGrid live={live} />
        ) : evidence ? (
          <div className="details-evidence__grid">
            <DataChart
              className="data-chart--evidence"
              title={evidence.chartTitle}
              note={evidence.chartNote}
              data={evidence.chart}
              geometry={EVIDENCE_CHART}
            />

            <div className="details-evidence__side">
              <p className="details-status">
                <span className="details-status__dot" aria-hidden="true" />
                <span className="details-status__label">{evidence.status.label}</span>
                <span className="details-status__source">{evidence.status.source}</span>
              </p>

              <div className="details-discovery">
                <p className="details-discovery__label">KEY DISCOVERY</p>
                <h3 className="details-discovery__title">{evidence.keyDiscovery.title}</h3>
                <p className="details-discovery__text">{evidence.keyDiscovery.text}</p>
              </div>

              <dl className="details-stats">
                {evidence.stats.map((stat) => (
                  <div key={stat.label} className="details-stat">
                    <dt className="details-stat__value">{stat.value}</dt>
                    <dd className="details-stat__label">{stat.label}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        ) : (
          <PlaceholderPanel className="details-section-placeholder" title="Data and observations">
            {emptyText}
          </PlaceholderPanel>
        )}
      </div>
    </section>
  )
}

export default EvidenceSection
