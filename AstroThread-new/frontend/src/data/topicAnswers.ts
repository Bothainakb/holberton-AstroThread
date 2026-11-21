import { normalizeSearchText } from "../services/search/searchService";

export type TopicFigure = "black-hole" | "gravitational-wave" | "transit";

export interface TopicFact {
  label: string;
  value: string;
}

export interface Subtopic {
  name: string;
  description: string;
}

export interface TopicAnswer {
  topic: string;
  slug: string;
  field: string;
  aliases: string[];
  headline: string;
  definition: string;
  highlight: string;
  figure: TopicFigure;
  caption: string;
  facts: TopicFact[];
  subtopics: Subtopic[];
}

const topicAnswers: readonly TopicAnswer[] = [
  {
    topic: "Black Holes",
    slug: "black-holes",
    field: "Astrophysics",
    aliases: ["black hole", "blackhole", "blackholes"],
    headline: "Regions where gravity traps light",
    definition:
      "Black holes are regions of spacetime where gravity is so strong that nothing, not even light, can escape once it crosses the event horizon.",
    highlight: "nothing, not even light, can escape",
    figure: "black-hole",
    caption: "Schematic of a black hole image: a dark shadow inside a ring of light.",
    facts: [
      { label: "Boundary", value: "Event horizon" },
      { label: "First image", value: "M87*, published 2019" },
      { label: "Milky Way’s black hole", value: "Sagittarius A*, about 4 million solar masses" },
    ],
    subtopics: [
      { name: "Event horizon", description: "The boundary beyond which nothing can escape a black hole’s gravity." },
      { name: "Hawking radiation", description: "The predicted quantum glow that makes black holes slowly lose mass." },
      { name: "Supermassive black holes", description: "Giants of millions to billions of solar masses at galaxy centres." },
      { name: "Black hole imaging", description: "How networks of radio telescopes captured the first black hole images." },
    ],
  },
  {
    topic: "Gravitational Waves",
    slug: "gravitational-waves",
    field: "Gravitational physics",
    aliases: ["gravitational wave", "ligo"],
    headline: "Ripples in spacetime",
    definition:
      "Gravitational waves are ripples in the curvature of spacetime produced by accelerating masses, and they travel outward at the speed of light.",
    highlight: "ripples in the curvature of spacetime",
    figure: "gravitational-wave",
    caption: "Schematic merger signal: the wave speeds up and grows until the two objects merge.",
    facts: [
      { label: "First direct detection", value: "GW150914, 14 September 2015" },
      { label: "Speed", value: "The speed of light" },
      { label: "Ground-based detectors", value: "LIGO, Virgo, KAGRA" },
    ],
    subtopics: [
      { name: "Binary mergers", description: "Pairs of black holes or neutron stars spiralling together and colliding." },
      { name: "Neutron stars", description: "Dense stellar remnants whose collisions send out gravitational waves." },
      { name: "Pulsar timing", description: "Using the steady ticks of pulsars to sense slow ripples in spacetime." },
      { name: "Multi-messenger astronomy", description: "Studying one event with both gravitational waves and light." },
    ],
  },
  {
    topic: "Exoplanets",
    slug: "exoplanets",
    field: "Planetary science",
    aliases: ["exoplanet", "extrasolar planets", "extrasolar planet"],
    headline: "Planets beyond the Solar System",
    definition:
      "Exoplanets are planets that orbit stars other than the Sun. Most are found from the dimming or the wobble they cause in their host star.",
    highlight: "planets that orbit stars other than the Sun",
    figure: "transit",
    caption: "Schematic transit light curve: the star dims while the planet passes in front.",
    facts: [
      { label: "First around a Sun-like star", value: "51 Pegasi b, 1995" },
      { label: "Confirmed so far", value: "More than 6,000" },
      { label: "Main detection methods", value: "Transits and radial velocity" },
    ],
    subtopics: [
      { name: "Transit method", description: "Finding planets from the dip in starlight as they pass in front of their star." },
      { name: "Radial velocity", description: "Detecting planets from the small wobble they give their star." },
      { name: "Habitable zone", description: "The range of orbits where liquid water could exist on a planet’s surface." },
      { name: "Exoplanet atmospheres", description: "Reading the gases around planets from the starlight they filter." },
    ],
  },
];

export function findTopicAnswer(query: string): TopicAnswer | undefined {
  const normalized = normalizeSearchText(query);

  if (!normalized) {
    return undefined;
  }

  return topicAnswers.find((answer) =>
    [answer.topic, ...answer.aliases].some((name) => normalizeSearchText(name) === normalized),
  );
}