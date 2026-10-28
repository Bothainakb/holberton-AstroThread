iimport { useEffect, useState } from 'react'
import PlaceholderPanel from '../../../components/PlaceholderPanel/PlaceholderPanel'
import Tag from '../../../components/Tag/Tag'
import type { ThreadDetail } from '../../../data/threadDetails'
import { fetchNasaImages, type NasaImage } from '../../../services/api'

interface NasaMediaSectionProps {
  /** Thread slug, e.g. "black-holes"; used to load NASA images. */
  threadId: string
  /** Mock "NASA DATA" panel; only Black Holes has one for now. */
  nasa?: ThreadDetail['nasa']
}

type ImagesState =
  | { status: 'loading' }
  | { status: 'ready'; images: NasaImage[] }
  | { status: 'error'; message: string }

/** "Images and data from NASA": real images from the NASA Image and Video Library. */
function NasaMediaSection({ threadId, nasa }: NasaMediaSectionProps) {
  const [state, setState] = useState<ImagesState>({ status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()

    fetchNasaImages(threadId, controller.signal)
      .then((images) => setState({ status: 'ready', images }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setState({
          status: 'error',
          message: error instanceof Error ? error.message : 'NASA images are unavailable right now.',
        })
      })

    return () => controller.abort()
  }, [threadId])

  const images = state.status === 'ready' ? state.images.slice(0, 3) : []

  return (
    <section className="details-nasa container" id="nasa-media" aria-labelledby="nasa-title">
      <div className="details-heading">
        <Tag>NASA media</Tag>
        <h2 className="details-nasa__title" id="nasa-title">
          Images and data from NASA
        </h2>
        <p className="details-nasa__subtitle">
          Astronomy images linked to this thread&apos;s topic. Source: NASA Image and Video Library.
        </p>
      </div>

      {state.status === 'loading' ? (
        <p className="details-nasa__status" role="status">
          Loading NASA images...
        </p>
      ) : state.status === 'error' || images.length === 0 ? (
        <PlaceholderPanel className="details-section-placeholder" title="NASA images">
          {state.status === 'error' ? state.message : 'No NASA images were found for this topic.'}
        </PlaceholderPanel>
      ) : (
        <div className="details-nasa__grid">
          {images.map((item, index) => (
            <article key={`${item.title}-${index}`} className="nasa-card">
              {item.imageUrl ? (
                <img
                  className="nasa-card__image nasa-card__image--photo"
                  src={item.imageUrl}
                  alt={item.title}
                  loading="lazy"
                />
              ) : (
                <div className="nasa-card__image" role="img" aria-label="No image available">
                  NO IMAGE
                </div>
              )}
              <div className="nasa-card__caption">
                <h3 className="nasa-card__title">{item.title}</h3>
                <p className="nasa-card__text">{item.description}</p>
              </div>
            </article>
          ))}

          {nasa && (
            <article className="nasa-data">
              <p className="nasa-data__label">NASA DATA</p>
              <h3 className="nasa-data__title">{nasa.data.title}</h3>
              {nasa.data.rows.map((row) => (
                <p key={row} className="nasa-data__row">
                  {row}
                </p>
              ))}
            </article>
          )}
        </div>
      )}
    </section>
  )
}

export default NasaMediaSection
