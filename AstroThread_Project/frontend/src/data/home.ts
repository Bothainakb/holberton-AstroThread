// Static content for the Home page, copied from the Figma frame "01-home".
// Research threads come from the API (see HomePage); the rest is still static.
import type { ResearchThreadCardData } from '../components/ResearchThreadCard/ResearchThreadCard'
import type { ApiThread } from '../services/api'

export interface TimelineEvent {
  year: number
  label: string
}

export interface ChartPoint {
  year: number
  value: number
}

export const popularTopics = [
  'Black Holes',
  'Exoplanets',
  'Dark Matter',
]

/** Number of thread cards in the Home page grid (one row of three). */
export const HOME_THREAD_LIMIT = 3

/**
 * The only threads the Home page shows, in display order. Other threads stay
 * in the database and on the Research Threads page.
 */
export const HOME_THREAD_TITLES = ['Black Holes', 'Exoplanets', 'Dark Matter']

/** Keeps the Home page threads, ordered as in HOME_THREAD_TITLES. */
export function selectHomeThreads<T extends { title: string }>(threads: T[]) {
  const order = HOME_THREAD_TITLES.map((title) => title.toLowerCase())
  const rank = (thread: T) => order.indexOf(thread.title.trim().toLowerCase())
  return threads.filter((thread) => rank(thread) !== -1).sort((a, b) => rank(a) - rank(b))
}

/** "Black Holes" -> "black-holes", the id used by the Thread Details routes. */
export function slugify(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Builds a Home page card from an API thread. Paper count, stages and the
 * updated label are not in the database yet, so the card hides them.
 */
export function toHomeThread(thread: ApiThread): ResearchThreadCardData {
  return {
    id: thread.slug ?? (slugify(thread.title) || String(thread.id)),
    title: thread.title,
    category: thread.category,
    description: thread.description,
  }
}

export const blackHoleTimeline: TimelineEvent[] = [
  { year: 2015, label: 'First Observation' },
  { year: 2018, label: 'New Discovery' },
  { year: 2021, label: 'Major Discovery' },
  { year: 2025, label: 'Latest Research' },
]

/**
 * Illustrative data shown in the "Black Hole Mass" chart. Values are the
 * relative heights of the points in Figma (0 = bottom of the plot, 1 = top).
 */
export const blackHoleMassData: ChartPoint[] = [
  { year: 2015, value: 0.196 },
  { year: 2018, value: 0.397 },
  { year: 2021, value: 0.548 },
  { year: 2023, value: 0.799 },
  { year: 2025, value: 1 },
]
