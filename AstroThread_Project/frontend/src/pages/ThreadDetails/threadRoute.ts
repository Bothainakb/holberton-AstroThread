// Which database thread a "/research-threads/:id" URL means. Kept free of
// Vite-only code (import.meta.env) so `npm test` can run it in Node.
import { slugify } from '../../data/home'
import type { ResearchThread } from '../../data/threads'

/** The fields of a database thread that routing needs. */
export interface RoutableThread {
  id: number
  slug?: string | null
  title: string
}

/**
 * The URL slug of a database thread: its stored slug, else the slug of its
 * title. Home and Research Threads cards build their links the same way
 * (toHomeThread in data/home.ts).
 */
export function threadSlug(thread: RoutableThread): string {
  return thread.slug || slugify(thread.title) || String(thread.id)
}

/**
 * The database thread for a URL id: a number is a database id, anything else
 * must equal a thread's slug exactly. Unknown ids and slugs give null rather
 * than the closest thread.
 */
export function findThreadForRoute<T extends RoutableThread>(threads: T[], routeId: string): T | null {
  const id = routeId.trim()
  if (/^\d+$/.test(id)) {
    return threads.find((thread) => thread.id === Number(id)) ?? null
  }
  const slug = id.toLowerCase()
  return threads.find((thread) => threadSlug(thread) === slug) ?? null
}

/**
 * The page's thread for a database record: the design entry with the same
 * slug (for its stage guide and sample content) with the database fields on
 * top, or a plain entry built from the record when the design has none.
 */
export function researchThreadFor(
  thread: RoutableThread & { category: string; description: string },
  designThreads: ResearchThread[],
  totalStages: number,
): ResearchThread {
  const slug = threadSlug(thread)
  const design = designThreads.find((item) => item.id === slug)
  const fromDatabase = { title: thread.title, category: thread.category, description: thread.description }
  return design
    ? { ...design, ...fromDatabase }
    : { id: slug, ...fromDatabase, paperCount: 0, completedStages: 0, totalStages, updatedLabel: '' }
}
