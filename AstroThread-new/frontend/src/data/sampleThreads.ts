import type { ResearchThread } from "../types/research";

export const sampleThreads: readonly ResearchThread[] = [
  {
    id: "black-hole-theory",
    title: "Black Hole Theory",
    topic: "Black Holes",
    summary:
      "How solutions to Einstein’s equations turned into a full theory of black holes, from the first exact solution to Hawking radiation.",
    paperIds: ["sample-schwarzschild", "sample-kerr", "sample-penrose", "sample-hawking"],
  },
  {
    id: "observing-black-holes",
    title: "Observing Black Holes",
    topic: "Black Holes",
    summary:
      "From an X-ray source with an unseen companion to direct images of black hole shadows and dormant black holes found by Gaia.",
    paperIds: ["sample-cygnus-x1", "sample-eht-m87", "sample-eht-sgra", "sample-gaia-bh1"],
  },
  {
    id: "predicting-gravitational-waves",
    title: "Predicting Gravitational Waves",
    topic: "Gravitational Waves",
    summary:
      "Einstein’s prediction of ripples in spacetime and the binary pulsar that gave the first indirect evidence they exist.",
    paperIds: ["sample-einstein-1916", "sample-hulse-taylor"],
  },
  {
    id: "detecting-gravitational-waves",
    title: "Detecting Gravitational Waves",
    topic: "Gravitational Waves",
    summary:
      "LIGO and Virgo detections of merging black holes and neutron stars, from the first signal in 2015 to record-mass mergers.",
    paperIds: ["sample-gw150914", "sample-gw170104", "sample-gw170817", "sample-gw190521"],
  },
  {
    id: "discovering-exoplanets",
    title: "Discovering Exoplanets",
    topic: "Exoplanets",
    summary:
      "The first planets found beyond the Solar System, around a pulsar and a Sun-like star, and the first planet seen crossing its star.",
    paperIds: ["sample-pulsar-planets", "sample-51-peg", "sample-hd209458"],
  },
  {
    id: "rocky-worlds",
    title: "Rocky Worlds in Habitable Zones",
    topic: "Exoplanets",
    summary:
      "Earth-sized planets around nearby small stars, at distances where liquid water could exist on their surfaces.",
    paperIds: ["sample-proxima-b", "sample-trappist-1"],
  },
];