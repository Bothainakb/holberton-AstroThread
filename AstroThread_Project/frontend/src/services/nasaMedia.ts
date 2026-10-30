// Response of GET /api/threads/:id/nasa-media (backend/app/api/v1/nasa_media.py).
// Kept free of Vite-only code (import.meta.env) so `npm test` can run it in Node.

/** One image from the NASA Image and Video Library. */
export interface ApiNasaImage {
  nasa_id: string
  title: string
  description: string | null
  /** "YYYY-MM-DD" */
  date: string | null
  /** NASA center that published it, e.g. "JPL". */
  center: string | null
  credit: string | null
  image_url: string
  /** The image's page on images.nasa.gov. */
  source_url: string
}

export interface ApiNasaMedia {
  /** The search text the backend sent to NASA. */
  query: string
  source: string
  items: ApiNasaImage[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isOptionalString(value: unknown): value is string | null {
  return value === null || typeof value === 'string'
}

/** An HTTPS link on nasa.gov; anything else is never put in src or href. */
export function isNasaHttpsUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && (url.hostname === 'nasa.gov' || url.hostname.endsWith('.nasa.gov'))
  } catch {
    return false
  }
}

function isApiNasaImage(value: unknown): value is ApiNasaImage {
  return (
    isRecord(value) &&
    typeof value.nasa_id === 'string' &&
    typeof value.title === 'string' &&
    isOptionalString(value.description) &&
    isOptionalString(value.date) &&
    isOptionalString(value.center) &&
    isOptionalString(value.credit) &&
    isNasaHttpsUrl(value.image_url) &&
    isNasaHttpsUrl(value.source_url)
  )
}

/**
 * The NASA media response, or null when its shape is wrong. Single items that
 * are malformed or link outside nasa.gov are dropped rather than shown.
 */
export function parseNasaMedia(value: unknown): ApiNasaMedia | null {
  if (
    !isRecord(value) ||
    typeof value.query !== 'string' ||
    typeof value.source !== 'string' ||
    !Array.isArray(value.items)
  ) {
    return null
  }
  return { query: value.query, source: value.source, items: value.items.filter(isApiNasaImage) }
}
