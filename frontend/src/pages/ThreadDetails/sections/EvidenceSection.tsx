import DataChart, { type ChartGeometry } from '../../../components/DataChart/DataChart'
import PlaceholderPanel from '../../../components/PlaceholderPanel/PlaceholderPanel'
import Tag from '../../../components/Tag/Tag'
import type { ThreadDetail } from '../../../data/threadDetails'

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

interface EvidenceSectionProps {
  evidence?: ThreadDetail['evidence']
}

function EvidenceSection({ evidence }: EvidenceSectionProps) {
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

        {evidence ? (
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
            Charts and key measurements for this thread have not been added yet.
          </PlaceholderPanel>
        )}
      </div>
    </section>
  )
}

export default EvidenceSection
