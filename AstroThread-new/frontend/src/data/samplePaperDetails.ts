import type { PaperDetails } from "../types/research";

export type PaperDetailFields = Pick<PaperDetails, "method" | "mainFinding" | "whyItMatters">;

export const samplePaperDetails: Readonly<Record<string, PaperDetailFields>> = {
  "sample-schwarzschild": {
    method:
      "Solved Einstein’s field equations exactly for empty space around a single, non-rotating, spherical mass.",
    mainFinding:
      "The solution contains a special radius, now called the Schwarzschild radius, where the description of spacetime changes sharply.",
    whyItMatters:
      "It became the mathematical starting point for black holes and is still used to describe non-rotating ones.",
  },
  "sample-kerr": {
    method:
      "Searched for exact solutions of Einstein’s equations with a special algebraic structure.",
    mainFinding:
      "Found the exact spacetime outside a rotating mass, described by just its mass and its spin.",
    whyItMatters:
      "Real black holes spin, so the Kerr solution is used to model almost every black hole observed today.",
  },
  "sample-penrose": {
    method:
      "Used geometric methods to study collapsing matter without assuming perfect symmetry.",
    mainFinding:
      "Once a trapped surface forms, collapse must produce a singularity, whatever the exact shape of the star.",
    whyItMatters:
      "It showed that black holes are a general result of gravity, a result recognized by the 2020 Nobel Prize in Physics.",
  },
  "sample-cygnus-x1": {
    method:
      "Measured the changing velocity of a bright blue star linked to the X-ray source Cygnus X-1.",
    mainFinding:
      "The star orbits an unseen companion every 5.6 days, and the companion appears too heavy to be a white dwarf or likely even a neutron star.",
    whyItMatters:
      "Cygnus X-1 became one of the first strong observational candidates for a stellar black hole.",
  },
  "sample-hawking": {
    method:
      "Applied quantum field theory to the curved spacetime around a black hole’s event horizon.",
    mainFinding:
      "Black holes should emit thermal radiation and slowly lose mass, with smaller black holes radiating faster.",
    whyItMatters:
      "It linked gravity, quantum theory, and thermodynamics, and raised the still-open black hole information question.",
  },
  "sample-eht-m87": {
    method:
      "Combined radio telescopes around the world into one Earth-sized virtual telescope using very long baseline interferometry.",
    mainFinding:
      "Imaged a bright ring around a dark shadow at the center of galaxy M87, matching predictions for a black hole of about 6.5 billion solar masses.",
    whyItMatters:
      "It was the first direct image of a black hole’s surroundings, testing general relativity in a new way.",
  },
  "sample-eht-sgra": {
    method:
      "Used the same global radio array, with extra steps to handle a source that changes within minutes.",
    mainFinding:
      "Imaged a ring around a shadow at the Milky Way’s center, consistent with a black hole of about 4 million solar masses.",
    whyItMatters:
      "It confirmed that our own galaxy has a supermassive black hole at its center.",
  },
  "sample-gaia-bh1": {
    method:
      "Searched Gaia satellite star positions for wobbling stars, then confirmed one with ground-based spectroscopy.",
    mainFinding:
      "Found a Sun-like star orbiting a dark companion of about 10 solar masses, with no sign of light from the companion.",
    whyItMatters:
      "It is the nearest known black hole and shows that quiet black holes can be found without X-rays.",
  },
  "sample-einstein-1916": {
    method:
      "Approximated Einstein’s equations for weak gravitational fields, treating spacetime as nearly flat.",
    mainFinding:
      "Changes in gravity should travel outward as waves moving at the speed of light.",
    whyItMatters:
      "It is the first prediction of gravitational waves, confirmed directly almost a century later.",
  },
  "sample-hulse-taylor": {
    method:
      "Searched for pulsars with the Arecibo radio telescope and studied the timing of their pulses.",
    mainFinding:
      "Found a pulsar orbiting another neutron star every 7.75 hours, with pulse timing that changes over the orbit.",
    whyItMatters:
      "Later timing of this system showed its orbit shrinking as predicted by gravitational-wave emission, earning the 1993 Nobel Prize.",
  },
  "sample-gw150914": {
    method:
      "Recorded the same signal in two LIGO laser interferometers and compared it with general relativity waveforms.",
    mainFinding:
      "The signal matched two black holes of about 36 and 29 solar masses merging about 1.3 billion light-years away.",
    whyItMatters:
      "It was the first direct detection of gravitational waves and the first observed black hole merger.",
  },
  "sample-gw170104": {
    method:
      "Detected a signal with both LIGO detectors and estimated the source properties from waveform models.",
    mainFinding:
      "Two black holes totaling about 50 solar masses merged roughly 3 billion light-years away.",
    whyItMatters:
      "It showed that heavy black hole mergers are common and added new tests of general relativity.",
  },
  "sample-gw170817": {
    method:
      "Combined gravitational-wave data from LIGO and Virgo with gamma-ray, optical, and other telescope observations.",
    mainFinding:
      "Two neutron stars merged, producing a short gamma-ray burst and a glowing kilonova.",
    whyItMatters:
      "It began multi-messenger astronomy with gravitational waves and showed where many heavy elements form.",
  },
  "sample-gw190521": {
    method:
      "Analyzed a short signal detected by LIGO and Virgo using several waveform models.",
    mainFinding:
      "Two black holes of about 85 and 66 solar masses merged into a remnant of about 142 solar masses.",
    whyItMatters:
      "It was the first clear detection of an intermediate-mass black hole, a range that was hard to observe before.",
  },
  "sample-pulsar-planets": {
    method:
      "Timed the radio pulses of the millisecond pulsar PSR B1257+12 with the Arecibo telescope.",
    mainFinding:
      "Regular changes in pulse arrival times revealed at least two planet-mass bodies orbiting the pulsar.",
    whyItMatters:
      "These were the first confirmed planets outside the Solar System.",
  },
  "sample-51-peg": {
    method:
      "Measured small shifts in the star’s spectrum over time to track its back-and-forth motion.",
    mainFinding:
      "A planet of about half Jupiter’s mass orbits 51 Pegasi every 4.2 days, very close to its star.",
    whyItMatters:
      "It was the first planet found around a Sun-like star and opened the study of hot Jupiters, earning the 2019 Nobel Prize.",
  },
  "sample-hd209458": {
    method:
      "Measured the star’s brightness carefully while a known planet was expected to pass in front of it.",
    mainFinding:
      "The star dimmed by about 1.7 percent during each transit, giving the planet’s size and a low density.",
    whyItMatters:
      "It was the first planet seen to transit its star, the method later used by Kepler and TESS.",
  },
  "sample-proxima-b": {
    method:
      "Monitored the radial velocity of Proxima Centauri with high-precision spectrographs over many nights.",
    mainFinding:
      "A planet at least 1.3 times Earth’s mass orbits the star every 11.2 days in its temperate zone.",
    whyItMatters:
      "It is the closest known exoplanet to the Sun and a key target for future studies of rocky planets.",
  },
  "sample-trappist-1": {
    method:
      "Observed repeated transits with the Spitzer Space Telescope and ground-based telescopes.",
    mainFinding:
      "Seven Earth-sized planets orbit the small star TRAPPIST-1, three of them in its temperate zone.",
    whyItMatters:
      "It is the largest known group of Earth-sized planets around one star and a major target for the James Webb Space Telescope.",
  },
};