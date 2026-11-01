import Icon from '../../../components/Icon/Icon'
import PlaceholderPanel from '../../../components/PlaceholderPanel/PlaceholderPanel'
import Tag from '../../../components/Tag/Tag'
import type { ThreadDetail } from '../../../data/threadDetails'
import type { ApiNasaImage } from '../../../services/nasaMedia'
import type { NasaMediaState } from '../useNasaMedia'

interface NasaMediaSectionProps {
  nasa?: ThreadDetail['nasa']
  live?: NasaMediaState
  onRetry?: () => void
}

function formatDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime())) return date

  return parsed.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

function NasaImageCard({ image }: { image: ApiNasaImage }) {
  const meta = [image.credit ?? image.center, image.date && formatDate(image.date)]
    .filter(Boolean)
    .join(' · ')

  return (
    <article className="nasa-card nasa-card--live">
      <img
        className="nasa-card__photo"
        src={image.image_url}
        alt={image.title}
        loading="lazy"
        decoding="async"
      />
      <div className="nasa-card__caption">
        <h3 className="nasa-card__title">{image.title}</h3>
        {meta && <p className="nasa-card__meta">{meta}</p>}
        {image.description && <p className="nasa-card__text">{image.description}</p>}
        <a
          className="nasa-card__link"
          href={image.source_url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`View "${image.title}" on NASA's image library (opens in a new tab)`}
        >
          View on NASA
          <Icon name="arrow-right" />
        </a>
      </div>
    </article>
  )
}

function LiveNasaMedia({
  state,
  onRetry,
}: {
  state: NasaMediaState
  onRetry?: () => void
}) {
  if (state.status === 'loading') {
    return (
      <p className="details-section-note" role="status">
        Loading images from NASA…
      </p>
    )
  }

  if (state.status === 'unavailable') {
    return (
      <PlaceholderPanel className="details-section-placeholder" title="NASA images and data">
        NASA media is not connected on this server yet.
      </PlaceholderPanel>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="details-status-banner" role="alert">
        <p>NASA images could not be loaded: {state.message}</p>
        {onRetry && (
          <button type="button" className="button button--secondary" onClick={onRetry}>
            Try again
          </button>
        )}
      </div>
    )
  }

  if (state.media.items.length === 0) {
    return (
      <PlaceholderPanel className="details-section-placeholder" title="No NASA images found">
        The NASA Image and Video Library has no images matching &ldquo;{state.media.query}&rdquo;
        yet.
      </PlaceholderPanel>
    )
  }

  return (
    <>
      <div className="details-nasa__grid details-nasa__grid--live">
        {state.media.items.map((image) => (
          <NasaImageCard key={image.nasa_id} image={image} />
        ))}
      </div>
      <p className="details-section-note">
        Images and captions: {state.media.source} (images.nasa.gov), search &ldquo;
        {state.media.query}&rdquo;. NASA does not endorse AstroThread.
      </p>
    </>
  )
}

function NasaMediaSection({ nasa, live, onRetry }: NasaMediaSectionProps) {
  return (
    <section className="details-nasa container" id="nasa-media" aria-labelledby="nasa-title">
      <div className="details-heading">
        <Tag>NASA media</Tag>
        <h2 className="details-nasa__title" id="nasa-title">
          Images and data from NASA
        </h2>
        <p className="details-nasa__subtitle">
          {live
            ? "Astronomy images about this thread's topic from the NASA Image and Video Library."
            : "NASA images load once this thread's details come from the AstroThread database. Until then, these are placeholders from the design."}
        </p>
      </div>

      {live ? (
        <LiveNasaMedia state={live} onRetry={onRetry} />
      ) : nasa ? (
        <div className="details-nasa__grid">
          <article className="nasa-data">
            <p className="nasa-data__label">NASA DATA</p>
            <h3 className="nasa-data__title">{nasa.data.title}</h3>
            {nasa.data.rows.map((row) => (
              <p key={row} className="nasa-data__row">
                {row}
              </p>
            ))}
          </article>
        </div>
      ) : (
        <PlaceholderPanel className="details-section-placeholder" title="NASA images and data">
          NASA images appear here once this thread&apos;s details load from the AstroThread database.
        </PlaceholderPanel>
      )}
    </section>
  )
}

export default NasaMediaSection