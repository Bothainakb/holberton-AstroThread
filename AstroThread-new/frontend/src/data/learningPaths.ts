import { sameText } from "./myThread";

export type LearningLevel = 1 | 2 | 3;

export const LEVEL_LABELS: Record<LearningLevel, string> = {
  1: "Beginner",
  2: "Intermediate",
  3: "Advanced",
};

export interface PathPaper {
  id: string;
  title: string;
  year: number;
}

export interface PathStep {
  title: string;
  query: string;
  level: LearningLevel;
  why: string;
  papers: PathPaper[];
  relatedTopic?: string;
}

export interface NextTopic {
  name: string;
  level: LearningLevel;
  why: string;
}

export interface LearningPath {
  topic: string;
  field: string;
  intro: string;
  why: string;
  startPaperId: string;
  startWhy: string;
  steps: PathStep[];
  next: NextTopic[];
}

export type StepStatus = "done" | "current" | "todo";

export interface StepProgress extends PathStep {
  index: number;
  readCount: number;
  status: StepStatus;
}

export interface PathProgress {
  steps: StepProgress[];
  current: StepProgress | null;
  doneSteps: number;
  totalPapers: number;
  readPapers: number;
}

export const STEP_STATUS_LABELS: Record<StepStatus, string> = {
  done: "Completed",
  current: "Current step",
  todo: "Up next",
};

const learningPaths: readonly LearningPath[] = [
  {
    topic: "Black Holes",
    field: "Astrophysics",
    intro:
      "A black hole forms when a lot of mass is packed into a very small space, so gravity becomes strong enough that nothing, not even light, can escape. You can’t see a black hole itself, but you can see what it does to everything around it: gas glowing as it falls in, stars racing around it, and ripples in spacetime when two of them collide.",
    why:
      "It’s a strong first topic because one simple idea, gravity strong enough to trap light, leads into almost every big question in modern astrophysics. You can begin with real images and observations and leave the mathematics for later steps.",
    startPaperId: "sample-eht-m87",
    startWhy: "The first image of a black hole. It shows the idea directly, before any equations.",
    steps: [
      {
        title: "What a black hole is",
        query: "black hole images",
        level: 1,
        why: "Start with what black holes look like in real observations, so the theory has something to hang on.",
        papers: [
          {
            id: "sample-eht-m87",
            title: "First M87 Event Horizon Telescope Results. I. The Shadow of the Supermassive Black Hole",
            year: 2019,
          },
          {
            id: "sample-eht-sgra",
            title: "First Sagittarius A* Event Horizon Telescope Results. I. The Shadow of the Supermassive Black Hole in the Center of the Milky Way",
            year: 2022,
          },
        ],
      },
      {
        title: "Finding hidden black holes",
        query: "Cygnus X-1",
        level: 1,
        why: "See how astronomers find a black hole they can’t see, from the star moving around it.",
        papers: [
          { id: "sample-cygnus-x1", title: "Cygnus X-1: a Spectroscopic Binary with a Heavy Companion?", year: 1972 },
          { id: "sample-gaia-bh1", title: "A Sun-like star orbiting a black hole", year: 2023 },
        ],
      },
      {
        title: "Hearing black holes merge",
        query: "binary black holes",
        level: 2,
        why: "Gravitational waves test black holes in a completely new way, with signals instead of light.",
        papers: [
          {
            id: "sample-gw150914",
            title: "Observation of Gravitational Waves from a Binary Black Hole Merger",
            year: 2016,
          },
        ],
        relatedTopic: "Gravitational Waves",
      },
      {
        title: "The first exact solution",
        query: "Schwarzschild metric",
        level: 2,
        why: "The 1916 solution to Einstein’s equations that first described a black hole, long before anyone believed they were real.",
        papers: [
          {
            id: "sample-schwarzschild",
            title: "On the Gravitational Field of a Mass Point According to Einstein’s Theory",
            year: 1916,
          },
        ],
      },
      {
        title: "Spin and singularities",
        query: "general relativity",
        level: 3,
        why: "Now the theory: how spinning black holes are described, and why collapse always ends in a singularity.",
        papers: [
          {
            id: "sample-kerr",
            title: "Gravitational Field of a Spinning Mass as an Example of Algebraically Special Metrics",
            year: 1963,
          },
          { id: "sample-penrose", title: "Gravitational Collapse and Space-Time Singularities", year: 1965 },
        ],
      },
      {
        title: "Quantum black holes",
        query: "Hawking radiation",
        level: 3,
        why: "Where gravity meets quantum physics: black holes glow faintly and slowly lose mass.",
        papers: [{ id: "sample-hawking", title: "Particle Creation by Black Holes", year: 1975 }],
      },
    ],
    next: [
      {
        name: "Supermassive black holes",
        level: 1,
        why: "Real black holes you can study, including the one at the centre of our galaxy.",
      },
      {
        name: "Gravitational Waves",
        level: 2,
        why: "When black holes merge they shake spacetime. You already know what’s colliding.",
      },
      {
        name: "Dark matter",
        level: 2,
        why: "Another thing found only through its gravity, studied with some of the same tools.",
      },
      {
        name: "Hawking radiation",
        level: 3,
        why: "Where gravity meets quantum physics. Read it after general relativity.",
      },
    ],
  },
  {
    topic: "Gravitational Waves",
    field: "Gravitational physics",
    intro:
      "Gravitational waves are tiny stretches and squeezes of space itself, sent out when heavy objects like black holes or neutron stars spiral into each other. By the time they reach Earth they change distances by far less than the width of a proton, so detecting them took decades of work.",
    why:
      "It’s a good first topic because the first detection is a clear, well-documented story, and it leads naturally into black holes, neutron stars and how detectors work.",
    startPaperId: "sample-gw150914",
    startWhy: "The first direct detection, and the event that opened the field.",
    steps: [
      {
        title: "The first detection",
        query: "GW150914",
        level: 1,
        why: "Begin with the 2015 signal from two merging black holes.",
        papers: [
          {
            id: "sample-gw150914",
            title: "Observation of Gravitational Waves from a Binary Black Hole Merger",
            year: 2016,
          },
        ],
        relatedTopic: "Black Holes",
      },
      {
        title: "Colliding neutron stars",
        query: "neutron star merger",
        level: 1,
        why: "The 2017 merger was seen in gravitational waves and in light at the same time.",
        papers: [
          {
            id: "sample-gw170817",
            title: "GW170817: Observation of Gravitational Waves from a Binary Neutron Star Inspiral",
            year: 2017,
          },
        ],
      },
      {
        title: "Indirect evidence first",
        query: "binary pulsar",
        level: 2,
        why: "A pulsar in a binary system showed the waves existed decades before direct detection.",
        papers: [{ id: "sample-hulse-taylor", title: "Discovery of a pulsar in a binary system", year: 1975 }],
      },
      {
        title: "Mergers by the dozen",
        query: "binary black hole mergers",
        level: 2,
        why: "Move from a single event to heavier and more distant mergers.",
        papers: [
          {
            id: "sample-gw170104",
            title: "GW170104: Observation of a 50-Solar-Mass Binary Black Hole Coalescence at Redshift 0.2",
            year: 2017,
          },
          {
            id: "sample-gw190521",
            title: "GW190521: A Binary Black Hole Merger with a Total Mass of 150 Solar Masses",
            year: 2020,
          },
        ],
      },
      {
        title: "Einstein’s prediction",
        query: "general relativity",
        level: 3,
        why: "The 1916 paper that first predicted the waves. Read it once you know what was finally detected.",
        papers: [
          {
            id: "sample-einstein-1916",
            title: "Approximative Integration of the Field Equations of Gravitation",
            year: 1916,
          },
        ],
      },
    ],
    next: [
      {
        name: "Black Holes",
        level: 1,
        why: "Most signals so far come from black holes, so knowing them helps you read every detection.",
      },
      {
        name: "Neutron stars",
        level: 1,
        why: "The other objects that merge, and the source of the 2017 signal.",
      },
      {
        name: "Pulsar timing",
        level: 2,
        why: "A completely different way to detect waves, using the steady ticks of pulsars.",
      },
      {
        name: "Multi-messenger astronomy",
        level: 3,
        why: "Studying one event with waves and light together: the frontier of the field.",
      },
    ],
  },
  {
    topic: "Exoplanets",
    field: "Planetary science",
    intro:
      "Exoplanets are planets that orbit stars other than the Sun. Almost none can be photographed directly, so astronomers find them from the tiny dip in starlight when a planet passes in front of its star, or from the small wobble a planet’s gravity gives its star.",
    why:
      "It’s an approachable first topic: the detection methods are easy to picture, and the big question, whether other Earths exist, is easy to care about.",
    startPaperId: "sample-51-peg",
    startWhy: "The first planet found around a Sun-like star, and the paper that started the field.",
    steps: [
      {
        title: "The first worlds",
        query: "first exoplanet discovery",
        level: 1,
        why: "See how the first exoplanets were found, and why they surprised everyone.",
        papers: [
          { id: "sample-51-peg", title: "A Jupiter-mass companion to a solar-type star", year: 1995 },
          {
            id: "sample-pulsar-planets",
            title: "A planetary system around the millisecond pulsar PSR1257+12",
            year: 1992,
          },
        ],
      },
      {
        title: "Planets by transits",
        query: "transit method",
        level: 1,
        why: "Learn the method behind most known planets: watching a star dim as a planet passes in front.",
        papers: [{ id: "sample-hd209458", title: "Detection of Planetary Transits Across a Sun-like Star", year: 2000 }],
      },
      {
        title: "A planet next door",
        query: "Proxima Centauri b",
        level: 2,
        why: "A rocky planet around the nearest star to the Sun, in the zone where water could be liquid.",
        papers: [
          {
            id: "sample-proxima-b",
            title: "A terrestrial planet candidate in a temperate orbit around Proxima Centauri",
            year: 2016,
          },
        ],
      },
      {
        title: "Seven Earth-sized worlds",
        query: "TRAPPIST-1",
        level: 3,
        why: "A whole system of rocky planets, and one of the best places to study whether small worlds can hold atmospheres.",
        papers: [
          {
            id: "sample-trappist-1",
            title: "Seven temperate terrestrial planets around the nearby ultracool dwarf star TRAPPIST-1",
            year: 2017,
          },
        ],
      },
    ],
    next: [
      { name: "Transit method", level: 1, why: "The method behind most known planets." },
      { name: "Radial velocity", level: 1, why: "The wobble method used for the very first discovery." },
      {
        name: "Habitable zone",
        level: 2,
        why: "Where liquid water could exist, and why it matters in the search for life.",
      },
      { name: "Exoplanet atmospheres", level: 3, why: "The frontier: measuring the air of other worlds." },
    ],
  },
];

export function getLearningPaths(): readonly LearningPath[] {
  return learningPaths;
}

export function getLearningPath(topic: string): LearningPath | undefined {
  return learningPaths.find((path) => sameText(path.topic, topic));
}

export function findPathPaper(path: LearningPath, paperId: string): PathPaper | undefined {
  for (const step of path.steps) {
    const paper = step.papers.find((item) => item.id === paperId);

    if (paper) {
      return paper;
    }
  }

  return undefined;
}

export function getPathProgress(path: LearningPath, readIds: ReadonlySet<string>): PathProgress {
  const counted = path.steps.map((step, index) => {
    const readCount = step.papers.filter((paper) => readIds.has(paper.id)).length;
    return { ...step, index, readCount, complete: step.papers.length > 0 && readCount === step.papers.length };
  });
  const currentIndex = counted.findIndex((step) => !step.complete);

  const steps: StepProgress[] = counted.map(({ complete, ...step }) => ({
    ...step,
    status: complete ? "done" : step.index === currentIndex ? "current" : "todo",
  }));

  const paperIds = new Set(steps.flatMap((step) => step.papers.map((paper) => paper.id)));
  const readPapers = [...paperIds].filter((id) => readIds.has(id)).length;

  return {
    steps,
    current: currentIndex < 0 ? null : steps[currentIndex],
    doneSteps: steps.filter((step) => step.status === "done").length,
    totalPapers: paperIds.size,
    readPapers,
  };
}