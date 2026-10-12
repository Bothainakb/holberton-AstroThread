// Static content for the Home page, copied from the Figma frame "01-home".
// These will be replaced with API data once the backend is connected.
import { researchThreads as allThreads } from './threads'

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
  'Gravitational Waves',
  'Quantum Physics',
]

/** The three threads featured on the Home page, in Figma order. */
const featuredThreadIds = ['black-holes', 'exoplanets', 'dark-matter']

export const researchThreads = featuredThreadIds.map((id) => {
  const thread = allThreads.find((item) => item.id === id)
  if (!thread) throw new Error(`Unknown featured thread: ${id}`)
  return thread
})

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
