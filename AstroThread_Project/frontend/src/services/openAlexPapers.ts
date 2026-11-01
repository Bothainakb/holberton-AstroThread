// Response of GET /api/threads/:id/openalex-papers (backend/app/api/v1/openalex_papers.py).
// Kept free of Vite-only code (import.meta.env) so `npm test` can run it in Node.

/** One research article found on OpenAlex (not stored in the database). */
export interface ApiOpenAlexPaper {
  /** "https://openalex.org/W..." */
  openalex_id: string
  title: string
  authors: string | null
  year: number | null
  /** The DOI link, or the paper's OpenAlex page. */
  url: string
  /** The start of the paper's abstract from OpenAlex; null when OpenAlex has none. */
  summary?: string | null
}

export interface ApiOpenAlexPapers {
  /** The phrase the paper titles had to contain. */
  query: string
  /** Every title phrase searched (several for some threads); missing from older servers. */
  phrases?: string[]
  /** The titles also had to say the paper reports observations or measurements. */
  observational?: boolean
  source: string
  items: ApiOpenAlexPaper[]
}

const LINK_HOSTS = new Set(['doi.org', 'openalex.org'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** An HTTPS link to doi.org or openalex.org; anything else is never put in href. */
export function isPaperLinkUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && LINK_HOSTS.has(url.hostname)
  } catch {
    return false
  }
}

function isApiOpenAlexPaper(value: unknown): value is ApiOpenAlexPaper {
  return (
    isRecord(value) &&
    typeof value.openalex_id === 'string' &&
    typeof value.title === 'string' &&
    value.title.trim() !== '' &&
    (value.authors === null || typeof value.authors === 'string') &&
    (value.year === null || Number.isInteger(value.year)) &&
    isPaperLinkUrl(value.url) &&
    (value.summary === undefined || value.summary === null || typeof value.summary === 'string')
  )
}

/**
 * The OpenAlex papers response, or null when its shape is wrong. Single items
 * that are malformed or link elsewhere are dropped rather than shown.
 */
export function parseOpenAlexPapers(value: unknown): ApiOpenAlexPapers | null {
  if (
    !isRecord(value) ||
    typeof value.query !== 'string' ||
    typeof value.source !== 'string' ||
    !Array.isArray(value.items)
  ) {
    return null
  }
  const phrases =
    Array.isArray(value.phrases) && value.phrases.length > 0 && value.phrases.every((phrase) => typeof phrase === 'string')
      ? (value.phrases as string[])
      : undefined
  return {
    query: value.query,
    ...(phrases ? { phrases } : {}),
    ...(value.observational === true ? { observational: true } : {}),
    source: value.source,
    items: value.items.filter(isApiOpenAlexPaper),
  }
}

/** The title phrases OpenAlex was searched for, in curly quotes: “a”, “b” or “c”. */
export function quotedPhrases(phrases: string[]): string {
  const quoted = phrases.map((phrase) => `\u201c${phrase}\u201d`)
  return quoted.length > 1 ? `${quoted.slice(0, -1).join(', ')} or ${quoted[quoted.length - 1]}` : quoted[0]
}
