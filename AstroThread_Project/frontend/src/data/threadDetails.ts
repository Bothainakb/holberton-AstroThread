// MOCK DATA: Thread Details content.
//
// Everything in this file is static placeholder content copied from the Figma
// frame "03-research-thread-details". It is NOT live data from NASA, OpenAlex
// or the AstroThread database; the backend is not connected yet. Only the
// Black Holes thread has detail content in the design, so it is the only
// thread with an entry here.
import type { ChartPoint } from './home'

export type StageIcon = 'origin' | 'research' | 'discoveries' | 'data' | 'latest'

export interface StageFact {
  label: string
  title: string
  text: string
}

export interface StageContent {
  paragraphs: string[]
  facts: StageFact[]
}

export interface DetailStage {
  title: string
  summary: string
  icon: StageIcon
  /** Detailed stage content; only Stage 1 (Origin) exists in Figma so far. */
  content?: StageContent
}

export interface RelatedPaper {
  /** Database id; sample papers from the design have none. */
  id?: number
  year: number | null
  title: string
  authors: string
  summary?: string
  /** Link to the paper (DOI or arXiv), when known. */
  url?: string
  /** A hand-picked sample from the database, labelled on the card. */
  illustrative?: boolean
}

export interface EvidenceStat {
  value: string
  label: string
}

export interface NasaMediaItem {
  title: string
  description: string
}

export interface ThreadDetail {
  threadId: string
  headline: string
  intro: string
  categories: string[]
  stages: DetailStage[]
  papers: RelatedPaper[]
  evidence: {
    chartTitle: string
    chartNote: string
    chart: ChartPoint[]
    status: { label: string; source: string }
    keyDiscovery: { title: string; text: string }
    stats: EvidenceStat[]
  }
  nasa: {
    media: NasaMediaItem[]
    data: { title: string; rows: string[] }
  }
  latest: {
    day: string
    year: string
    title: string
    text: string
  }
}

/** Stage titles and icons shared by every thread. */
export const stageIcons: StageIcon[] = ['origin', 'research', 'discoveries', 'data', 'latest']

const NASA_PLACEHOLDER = 'Placeholder description. The image and caption will come from NASA.'

export const threadDetails: Record<string, ThreadDetail> = {
  'black-holes': {
    threadId: 'black-holes',
    headline: 'Black Holes: From Theory to Observation',
    intro:
      'Explore how our understanding of black holes evolved from theoretical predictions to modern observations.',
    categories: ['Astrophysics', 'Physics'],
    stages: [
      {
        title: 'Origin',
        summary: 'How the idea began in theoretical physics',
        icon: 'origin',
        content: {
          paragraphs: [
            'The idea of a black hole began on paper, long before any telescope could test it. In 1783 John Michell imagined "dark stars" so massive that light could not escape them. In 1916 Karl Schwarzschild found the first exact solution to Einstein\'s equations of general relativity, which describes a point where gravity becomes inescapable.',
            'For decades this was treated as a mathematical curiosity. The term "black hole" only became common in the late 1960s, as physicists showed that collapsing stars really could form them.',
          ],
          facts: [
            {
              label: 'KEY CONCEPT',
              title: 'Event horizon',
              text: 'The boundary beyond which nothing, not even light, can escape.',
            },
            {
              label: 'IMPORTANT SCIENTIST',
              title: 'Karl Schwarzschild',
              text: "German physicist; solved Einstein's field equations for a point mass.",
            },
            {
              label: 'APPROXIMATE YEAR',
              title: '1916',
              text: 'Building on John Michell\'s "dark stars" idea from 1783.',
            },
          ],
        },
      },
      { title: 'Research', summary: 'The papers and experiments that tested it', icon: 'research' },
      {
        title: 'Discoveries',
        summary: 'Observations that confirmed black holes',
        icon: 'discoveries',
      },
      { title: 'Data', summary: 'Measurements, masses and images', icon: 'data' },
      {
        title: 'Latest Developments',
        summary: 'What researchers are finding now',
        icon: 'latest',
      },
    ],
    papers: [
      {
        year: 1916,
        title: "On the Gravitational Field of a Mass Point According to Einstein's Theory",
        authors: 'Karl Schwarzschild',
        summary:
          'The first exact solution of general relativity, later understood to describe a non-rotating black hole.',
      },
      {
        year: 1965,
        title: 'Gravitational Collapse and Space-Time Singularities',
        authors: 'Roger Penrose',
        summary:
          'Shows that singularities form inevitably when a massive star collapses under its own gravity.',
      },
      {
        year: 2019,
        title:
          'First M87 Event Horizon Telescope Results. I. The Shadow of the Supermassive Black Hole',
        authors: 'Event Horizon Telescope Collaboration',
        summary: 'Presents the first image of a black hole shadow, at the centre of the galaxy M87.',
      },
    ],
    evidence: {
      chartTitle: 'Observations over time',
      chartNote: 'Illustrative data',
      // Relative heights of the six points in Figma (0 = axis, 1 = top).
      chart: [
        { year: 1970, value: 0.293 },
        { year: 1980, value: 0.393 },
        { year: 1990, value: 0.502 },
        { year: 2000, value: 0.721 },
        { year: 2010, value: 0.851 },
        { year: 2020, value: 1 },
      ],
      status: { label: 'Observation confirmed', source: 'Event Horizon Telescope · 2019' },
      keyDiscovery: {
        title: 'First image of a black hole shadow',
        text: 'The supermassive black hole M87* matched the size and shape predicted by general relativity.',
      },
      stats: [
        { value: '6.5 billion', label: 'solar masses' },
        { value: '55 million', label: 'light-years away' },
        { value: '1.3 mm', label: 'wavelength' },
      ],
    },
    nasa: {
      media: [
        { title: 'Sagittarius A* in X-rays', description: NASA_PLACEHOLDER },
        { title: 'The jet of galaxy M87', description: NASA_PLACEHOLDER },
        { title: 'Black hole accretion disk', description: NASA_PLACEHOLDER },
      ],
      data: {
        title: 'Observation details',
        rows: ['Object: Sagittarius A*', 'Type: Supermassive black hole'],
      },
    },
    latest: {
      day: '27 MAR',
      year: '2024',
      title: 'Polarized light reveals magnetic fields around Sagittarius A*',
      text: 'New Event Horizon Telescope images show strong, ordered magnetic fields spiralling at the edge of the black hole at the centre of the Milky Way.',
    },
  },
}
