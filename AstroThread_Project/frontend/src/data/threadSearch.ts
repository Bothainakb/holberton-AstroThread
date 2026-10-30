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
