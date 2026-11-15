import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, MouseEvent } from "react";
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

function placeholderClass(index: number) {
  return `results-images__placeholder results-images__placeholder--${(index % PLACEHOLDER_VARIANTS) + 1}`;
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

function ArrowIcon({ direction }: { direction: "previous" | "next" }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={direction === "previous" ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </svg>
  );
}

interface ImagePreviewProps {
  images: readonly SpaceImage[];
  index: number | null;
  brokenIds: ReadonlySet<string>;
  onBroken: (id: string) => void;
  onChange: (index: number) => void;
  onClose: () => void;
}

function ImagePreview({ images, index, brokenIds, onBroken, onChange, onClose }: ImagePreviewProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const isOpen = index !== null;

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  const image = index !== null ? images[index] : undefined;
  const hasPrevious = index !== null && index > 0;
  const hasNext = index !== null && index < images.length - 1;

  function handleKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
    if (index === null) {
      return;
    }

    if (event.key === "ArrowLeft" && hasPrevious) {
      event.preventDefault();
      onChange(index - 1);
    }

    if (event.key === "ArrowRight" && hasNext) {
      event.preventDefault();
      onChange(index + 1);
    }
  }

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  const src = image ? image.imageUrl || image.thumbnailUrl : "";
  const showPhoto = Boolean(image && src && !brokenIds.has(image.id));
  const meta = image ? formatImageMeta(image) : "";

  return (
    <dialog
      ref={dialogRef}
      className="image-preview"
      aria-labelledby="image-preview-title"
      onClose={onClose}
      onKeyDown={handleKeyDown}
      onClick={handleBackdropClick}
    >
      {image && index !== null && (
        <div className="image-preview__panel">
          <div className="image-preview__top">
            <span className="image-preview__count">
              {index + 1} of {images.length}
            </span>
            <button
              type="button"
              className="image-preview__icon-button"
              aria-label="Close preview"
              onClick={onClose}
            >
              <CloseIcon />
            </button>
          </div>

          <div className="image-preview__stage">
            <button
              type="button"
              className="image-preview__icon-button image-preview__nav image-preview__nav--previous"
              aria-label="Previous image"
              disabled={!hasPrevious}
              onClick={() => onChange(index - 1)}
            >
              <ArrowIcon direction="previous" />
            </button>

            <div className="image-preview__media">
              {showPhoto ? (
                <img
                  key={image.id}
                  className="image-preview__photo"
                  src={src}
                  alt={image.title}
                  onError={() => onBroken(image.id)}
                />
              ) : (
                <span className={`${placeholderClass(index)} image-preview__placeholder`} aria-hidden="true" />
              )}
            </div>

            <button
              type="button"
              className="image-preview__icon-button image-preview__nav image-preview__nav--next"
              aria-label="Next image"
              disabled={!hasNext}
              onClick={() => onChange(index + 1)}
            >
              <ArrowIcon direction="next" />
            </button>
          </div>

          <div className="image-preview__info">
            <h2 id="image-preview-title" className="image-preview__title">
              {image.title}
            </h2>
            {meta && <p className="image-preview__meta">{meta}</p>}
            {image.description && <p className="image-preview__description">{image.description}</p>}
            {image.pageUrl && (
              <a
                className="image-preview__source"
                href={image.pageUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                View on NASA
                <ExternalIcon />
                <span className="visually-hidden"> (opens in a new tab)</span>
              </a>
            )}
          </div>
        </div>
      )}
    </dialog>
  );
}

export function ResultsImages({ query, onSearch, onBackToAll }: ResultsImagesProps) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<ImageResult | null>(null);
  const [brokenIds, setBrokenIds] = useState<ReadonlySet<string>>(new Set());
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const tileRefs = useRef<(HTMLButtonElement | null)[]>([]);

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

  function closePreview() {
    if (previewIndex === null) {
      return;
    }

    const tile = tileRefs.current[previewIndex];
    setPreviewIndex(null);
    tile?.focus();
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

          return (
            <li key={image.id}>
              <button
                ref={(element) => {
                  tileRefs.current[index] = element;
                }}
                type="button"
                className="results-images__card"
                aria-haspopup="dialog"
                onClick={() => setPreviewIndex(index)}
              >
                <span className="results-images__media">
                  {showPhoto ? (
                    <img
                      className="results-images__photo"
                      src={image.thumbnailUrl}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      onError={() => markBroken(image.id)}
                    />
                  ) : (
                    <span className={placeholderClass(index)} aria-hidden="true" />
                  )}
                </span>

                <span className="results-images__body">
                  <span className="results-images__title">{image.title}</span>
                  {meta && <span className="results-images__meta">{meta}</span>}
                  <span className="results-images__source">NASA Image Library</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <ImagePreview
        images={images}
        index={previewIndex}
        brokenIds={brokenIds}
        onBroken={markBroken}
        onChange={setPreviewIndex}
        onClose={closePreview}
      />
    </div>
  );
}