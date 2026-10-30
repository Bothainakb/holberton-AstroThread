import Icon from '../../../components/Icon/Icon'
import PlaceholderPanel from '../../../components/PlaceholderPanel/PlaceholderPanel'
import Tag from '../../../components/Tag/Tag'
import type { ThreadDetail } from '../../../data/threadDetails'
import type { ApiDevelopment } from '../../../services/api'
import { isHttpsUrl } from '../../../services/chartData'

interface LatestDevelopmentProps {
  latest?: ThreadDetail['latest']
  /** Developments from the database (newest first); replaces `latest` when set. */
  developments?: ApiDevelopment[]
  /** Text for the empty state. */
  emptyText?: string
}

/** "2022-05-12" -> { day: "May 12", year: "2022" } (the date as stored, no time zone shift). */
function dateParts(date: string) {
  const parsed = new Date(`${date}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime())) return { day: '', year: date }
  return {
    day: parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
    year: String(parsed.getUTCFullYear()),
  }
}

interface CardProps {
  day: string
  year: string
  title: string
  text: string
  isNewest: boolean
  source?: { name: string | null; url: string | null }
}

function LatestCard({ day, year, title, text, isNewest, source }: CardProps) {
  const url = source && isHttpsUrl(source.url) ? source.url : null
  const sourceName = source?.name || 'the original source'

  return (
    <article className="latest-card">
      <p className="latest-card__date">
        {day && <span className="latest-card__day">{day}</span>}
        <span className="latest-card__year">{year}</span>
      </p>
      <div className="latest-card__body">
        {isNewest && <Tag>Most recent</Tag>}
        <h3 className="latest-card__title">{title}</h3>
        {text && <p className="latest-card__text">{text}</p>}
        {url ? (
          <a
            className="latest-card__link"
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Read "${title}" on ${sourceName} (opens in a new tab)`}
          >
            Read on {sourceName}
            <Icon name="arrow-right" />
          </a>
        ) : (
          <span className="details-unavailable latest-card__unavailable">
            Full story not available yet
          </span>
        )}
      </div>
    </article>
  )
}

function LatestDevelopment({
  latest,
  developments,
  emptyText = 'Recent developments for this thread have not been added yet.',
}: LatestDevelopmentProps) {
  const fromDatabase = developments !== undefined

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
        <p className="details-heading__subtitle">
          {fromDatabase
            ? 'Recent developments in this thread, newest first, with the source that announced each one.'
            : 'The most recent development in this thread.'}
        </p>
      </div>

      {fromDatabase && developments.length > 0 ? (
        developments.map((item, index) => (
          <LatestCard
            key={item.id}
            {...dateParts(item.date)}
            title={item.title}
            text={item.text}
            isNewest={index === 0}
            source={{ name: item.source_name, url: item.source_url }}
          />
        ))
      ) : !fromDatabase && latest ? (
        <LatestCard
          day={latest.day}
          year={latest.year}
          title={latest.title}
          text={latest.text}
          isNewest
        />
      ) : (
        <PlaceholderPanel className="details-section-placeholder" title="Latest developments">
          {emptyText}
        </PlaceholderPanel>
      )}
    </section>
  )
}

export default LatestDevelopment
