import PlaceholderPanel from '../../../components/PlaceholderPanel/PlaceholderPanel'
import Tag from '../../../components/Tag/Tag'
import type { ThreadDetail } from '../../../data/threadDetails'

interface NasaMediaSectionProps {
  nasa?: ThreadDetail['nasa']
}

/**
 * "Images and data from NASA". The NASA API is not connected yet, so the
 * cards are the placeholders drawn in Figma, not real NASA images or data.
 */
function NasaMediaSection({ nasa }: NasaMediaSectionProps) {
  return (
    <section className="details-nasa container" id="nasa-media" aria-labelledby="nasa-title">
      <div className="details-heading">
        <Tag>NASA media</Tag>
        <h2 className="details-nasa__title" id="nasa-title">
          Images and data from NASA
        </h2>
        <p className="details-nasa__subtitle">
          Astronomy images and data linked to this thread&apos;s topic. Source: NASA API (planned
          integration).
        </p>
      </div>

      {nasa ? (
        <div className="details-nasa__grid">
          {nasa.media.map((item) => (
            <article key={item.title} className="nasa-card">
              <div className="nasa-card__image" role="img" aria-label="NASA image placeholder">
                NASA IMAGE
              </div>
              <div className="nasa-card__caption">
                <h3 className="nasa-card__title">{item.title}</h3>
                <p className="nasa-card__text">{item.description}</p>
              </div>
            </article>
          ))}

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
          Media for this thread will appear here once the NASA API is connected.
        </PlaceholderPanel>
      )}
    </section>
  )
}

export default NasaMediaSection
