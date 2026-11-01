// Research thread content, copied from the Figma frames "01-home" and
// "02-research-threads". It will be replaced with API data once the backend
// is connected.

export interface ResearchThread {
  id: string
  title: string
  category: string
  paperCount: number
  description: string
  completedStages: number
  totalStages: number
  updatedLabel: string
}

export interface ThreadStage {
  title: string
  description: string
}

/** Threads in "most recent" order, as shown on the Research Threads page. */
export const researchThreads: ResearchThread[] = [
  {
    id: 'black-holes',
    title: 'Black Holes',
    category: 'Astrophysics',
    paperCount: 128,
    description:
      'Regions where gravity is so strong that nothing, not even light, can escape. Trace them from theory to the first image.',
    completedStages: 5,
    totalStages: 5,
    updatedLabel: 'Updated 2 days ago',
  },
  {
    id: 'exoplanets',
    title: 'Exoplanets',
    category: 'Astronomy',
    paperCount: 142,
    description:
      'Planets orbiting other stars, found by transits and stellar wobble, and now studied for their atmospheres.',
    completedStages: 4,
    totalStages: 5,
    updatedLabel: 'Updated 5 days ago',
  },
  {
    id: 'dark-matter',
    title: 'Dark Matter',
    category: 'Cosmology',
    paperCount: 87,
    description:
      'Invisible matter inferred from galaxy rotation and gravitational lensing. Its nature is still unknown.',
    completedStages: 3,
    totalStages: 5,
    updatedLabel: 'Updated 1 week ago',
  },
]

/** Total number of threads in the library (placeholder until the API exists). */
export const totalThreadCount = 24

/** The five stages every thread follows ("How a thread unfolds"). */
export const threadStages: ThreadStage[] = [
  { title: 'Origin', description: 'First ideas and predictions' },
  { title: 'Research', description: 'Key papers and experiments' },
  { title: 'Discoveries', description: 'Confirmed observations' },
  { title: 'Data', description: 'Measurements and charts' },
  { title: 'Latest Developments', description: 'Open questions today' },
]

/** Stage shown as "Current stage" in the Black Holes preview (1-based). */
export const previewCurrentStage = 3
