// Search over the design-only threads (data/threads.ts) that are not in the
// database yet, so a Home search for e.g. "Dark Matter" finds its design
// preview. Kept free of Vite-only code so `npm test` can run it in Node.
import { slugify } from './home'
import { researchThreads, type ResearchThread } from './threads'

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * True when `query` appears in `text` at the start of a word, ignoring case:
 * the same rule as the backend's search (GET /api/threads?q=, PostgreSQL \m).
 * "matter" and "Dark Matter" match "Dark Matter"; "atter" does not.
 */
export function matchesWordStart(text: string, query: string): boolean {
  const trimmed = query.trim()
  if (!trimmed) return false
  return new RegExp(`(?:^|[^\\p{L}\\p{N}_])${escapeRegExp(trimmed)}`, 'iu').test(text)
}

/** True when the query matches a thread's title, category or description. */
export function matchesThread(
  thread: { title: string; category: string; description: string },
  query: string,
): boolean {
  return [thread.title, thread.category, thread.description].some((text) => matchesWordStart(text, query))
}

/**
 * How well a thread matches a Home search, lower is better: the exact title,
 * then a title word, then the category, then the description.
 */
export function searchRank(
  thread: { title: string; category: string; description: string },
  query: string,
): number {
  const trimmed = query.trim().toLowerCase()
  if (thread.title.trim().toLowerCase() === trimmed) return 0
  if (matchesWordStart(thread.title, query)) return 1
  if (matchesWordStart(thread.category, query)) return 2
  if (matchesWordStart(thread.description, query)) return 3
  return 4
}

/** Search results, best match first; equal matches keep their order. */
export function rankSearchResults<T extends { title: string; category: string; description: string }>(
  threads: T[],
  query: string,
): T[] {
  return threads
    .map((thread, index) => ({ thread, index, rank: searchRank(thread, query) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map(({ thread }) => thread)
}

/**
 * Splits `text` into the parts that match the search (same word-start rule
 * as matchesWordStart) and the rest, so a result can highlight its matches.
 */
export function highlightParts(text: string, query: string): { text: string; match: boolean }[] {
  const trimmed = query.trim()
  if (!trimmed) return [{ text, match: false }]
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}_])${escapeRegExp(trimmed)}`, 'giu')
  const parts: { text: string; match: boolean }[] = []
  let last = 0
  for (const found of text.matchAll(pattern)) {
    const start = found.index ?? 0
    if (start > last) parts.push({ text: text.slice(last, start), match: false })
    parts.push({ text: found[0], match: true })
    last = start + found[0].length
  }
  if (last < text.length) parts.push({ text: text.slice(last), match: false })
  return parts
}

/** The URL slug of a database thread: its stored slug, else the slug of its title. */
export function databaseSlug(thread: { id?: number; slug?: string | null; title: string }): string {
  return thread.slug || slugify(thread.title) || String(thread.id ?? '')
}

/**
 * Design threads with no database record. A design thread whose slug belongs
 * to a database thread is never returned, so no thread is listed twice.
 */
export function designOnlyThreads(
  databaseThreads: { id?: number; slug?: string | null; title: string }[],
  designThreads: ResearchThread[] = researchThreads,
): ResearchThread[] {
  const inDatabase = new Set(databaseThreads.map(databaseSlug))
  return designThreads.filter((thread) => !inDatabase.has(thread.id))
}

/** Design-only threads (see designOnlyThreads) that match `query`. */
export function designOnlyMatches(
  query: string,
  databaseThreads: { id?: number; slug?: string | null; title: string }[],
  designThreads: ResearchThread[] = researchThreads,
): ResearchThread[] {
  return designOnlyThreads(databaseThreads, designThreads).filter((thread) => matchesThread(thread, query))
}
