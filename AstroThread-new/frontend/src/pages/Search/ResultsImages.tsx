import { useEffect, useState } from "react";
import { FormAlert } from "../../components/FormAlert/FormAlert";
import { Button } from "../../components/Button/Button";
import { PopularTopics } from "../../components/PopularTopics/PopularTopics";
import { imageSource, searchImages } from "../../services/images/imageService";
import type { SpaceImage } from "../../types/research";
import "./ResultsImages.css";

interface ResultsImagesProps {
  query: string;
  onSearch: (query: string) => void;
  onBackToAll: () => void;
}

interface ImageResult {
  key: string;
  images: SpaceImage[];
  error: boolean;
}

const LOADING_TILE_COUNT = 6;
const PLACEHOLDER_VARIANTS = 3;

function formatImageMeta(image: SpaceImage): string {
  const year = image.date.slice(0, 4);
  return [image.credit, /^\d{4}$/.test(year) ? year : ""].filter(Boolean).join(" · ");
}

export function ResultsImages({ query, onSearch, onBackToAll }: ResultsImagesProps) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<ImageResult | null>(null);
  const [brokenIds, setBrokenIds] = useState<ReadonlySet<string>>(new Set());

  const requestKey = `${attempt}:${query}`;
  const isLoading = Boolean(query) && result?.key !== requestKey;

  useEffect(() => {
    if (!query) {
      return;
    }

    const controller = new AbortController();

    searchImages(query, controller.signal)
      .then((response) => {
        setResult({ key: requestKey, images: response.images, error: false });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setResult({ key: requestKey, images: [], error: true });
      });

    return () => controller.abort();
  }, [query, requestKey]);

  function markBroken(id: string) {
    setBrokenIds((current) => new Set(current).add(id));
  }

  if (isLoading) {
    return (
      <div className="search-page__state" aria-busy="true">
        <h1 className="visually-hidden">Image results</h1>
        <p className="search-page__summary" role="status">
          Searching images for “{query}”…
        </p>
        <ul className="results-images" aria-hidden="true">
          {Array.from({ length: LOADING_TILE_COUNT }, (_, index) => (
            <li key={index} className="results-images__skeleton" />
          ))}
        </ul>
      </div>
    );
  }

  if (result?.error) {
    return (
      <div className="search-page__state">
        <h1 className="visually-hidden">Image results</h1>
        <FormAlert tone="error" title="Image search isn’t available right now">
          We couldn’t reach the image service. Check your connection and try again.
        </FormAlert>
        <Button variant="secondary" onClick={() => setAttempt((value) => value + 1)}>
          Try again
        </Button>
      </div>
    );
  }

  const images = result?.images ?? [];

  if (images.length === 0) {
    return (
      <div className="search-page__empty">
        <h1 className="search-page__empty-title">No images found for “{query}”</h1>
        <p className="search-page__lead">
          Try a broader keyword, or see the papers found for this search.
        </p>
        <Button variant="secondary" onClick={onBackToAll}>
          Back to all results
        </Button>
        <PopularTopics title="Try" onTopicSelect={(topic) => onSearch(topic.query)} />
      </div>
    );
  }

  return (
    <div className="search-page__state">
      <h1 className="search-page__summary">
        <strong>{images.length}</strong> {images.length === 1 ? "image" : "images"} for “{query}”
      </h1>

      {imageSource === "sample" && (
        <p className="search-page__source-note">
          Sample images. Image search isn’t connected yet, so previews are placeholders.
        </p>
      )}

      <ul className="results-images">
        {images.map((image, index) => {
          const showPhoto = Boolean(image.thumbnailUrl) && !brokenIds.has(image.id);
          const meta = formatImageMeta(image);
          const variant = (index % PLACEHOLDER_VARIANTS) + 1;

          return (
            <li key={image.id}>
              <a
                className="results-images__card"
                href={image.pageUrl || undefined}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="results-images__media">
                  {showPhoto ? (
                    <img
                      className="results-images__photo"
                      src={image.thumbnailUrl}
                      alt={image.title}
                      loading="lazy"
                      decoding="async"
                      onError={() => markBroken(image.id)}
                    />
                  ) : (
                    <span
                      className={`results-images__placeholder results-images__placeholder--${variant}`}
                      aria-hidden="true"
                    />
                  )}
                </span>

                <span className="results-images__body">
                  <span className="results-images__title">{image.title}</span>
                  {meta && <span className="results-images__meta">{meta}</span>}
                  <span className="results-images__source">
                    NASA Image Library
                    <span className="visually-hidden"> (opens in a new tab)</span>
                  </span>
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}