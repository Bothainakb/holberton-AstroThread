import PlaceholderPanel from '../../../components/PlaceholderPanel/PlaceholderPanel'
import Tag from '../../../components/Tag/Tag'
import type { ThreadDetail } from '../../../data/threadDetails'

interface LatestDevelopmentProps {
  latest?: ThreadDetail['latest']
}

function LatestDevelopment({ latest }: LatestDevelopmentProps) {
  return (
    <section
      className="details-latest container"
      id="latest-developments"
      aria-labelledby="latest-title"
    >
      <div className="details-heading">
        <h2 className="details-heading__title" id="latest-title" tabIndex={-1}>
          Latest Developments
        </h2>
        <p className="details-heading__subtitle">The most recent development in this thread.</p>
      </div>

      {latest ? (
        <article className="latest-card">
          <p className="latest-card__date">
            {latest.day && <span className="latest-card__day">{latest.day}</span>}
            <span className="latest-card__year">{latest.year}</span>
          </p>
          <div className="latest-card__body">
            <Tag>Most recent</Tag>
            <h3 className="latest-card__title">{latest.title}</h3>
            {latest.text && <p className="latest-card__text">{latest.text}</p>}
            {/* No article page or source link exists for developments yet. */}
            <span className="details-unavailable latest-card__unavailable">
              Full story not available yet
            </span>
          </div>
        </article>
      ) : (
        <PlaceholderPanel className="details-section-placeholder" title="Latest developments">
          Recent developments for this thread have not been added yet.
        </PlaceholderPanel>
      )}
    </section>
  )
}

export default LatestDevelopment
