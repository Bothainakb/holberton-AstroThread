-- AstroThread sample data
--
-- Run after schema.sql, from the repository root:
--   psql -U postgres -d astrothread_db -f database/seed.sql
--
-- Thread titles and descriptions match the frontend (Figma) content.
-- There is deliberately no "Dark Matter" thread yet: the backend tests
-- expect that search to return no results (the "No Results" design).

BEGIN;

INSERT INTO research_threads (title, category, description, is_featured) VALUES
    ('Black Holes', 'Astrophysics',
     'Regions where gravity is so strong that nothing, not even light, can escape. Trace them from theory to the first image.',
     TRUE),
    ('Gravitational Waves', 'Physics',
     'Ripples in spacetime from colliding black holes and neutron stars, first detected directly in 2015.',
     TRUE),
    ('Exoplanets', 'Astronomy',
     'Planets orbiting other stars, found by transits and stellar wobble, and now studied for their atmospheres.',
     TRUE),
    ('Neutron Stars', 'Astrophysics',
     'Ultra-dense remnants of supernovae: pulsars, magnetars and the mergers that forge heavy elements.',
     FALSE),
    ('The Expanding Universe', 'Cosmology',
     'From Hubble''s law to dark energy: how we learned that space itself is stretching, and speeding up.',
     FALSE);

-- Timeline events, linked to their thread by title.
INSERT INTO timeline_events (thread_id, year, title, description)
SELECT t.id, e.year, e.title, e.description
FROM (VALUES
    ('Black Holes', 1916, 'Schwarzschild solution',
     'Karl Schwarzschild finds the first exact solution of Einstein''s equations describing a black hole.'),
    ('Black Holes', 1971, 'Cygnus X-1',
     'The X-ray source Cygnus X-1 becomes the first strong black hole candidate.'),
    ('Black Holes', 2015, 'First merger detected',
     'LIGO detects gravitational waves from two black holes merging.'),
    ('Black Holes', 2019, 'First image of a black hole',
     'The Event Horizon Telescope releases the image of the black hole in galaxy M87.'),
    ('Black Holes', 2022, 'Sagittarius A* imaged',
     'The Event Horizon Telescope images the black hole at the center of the Milky Way.'),

    ('Gravitational Waves', 1916, 'Einstein''s prediction',
     'General relativity predicts ripples in spacetime.'),
    ('Gravitational Waves', 1974, 'Hulse-Taylor binary pulsar',
     'A binary pulsar is discovered whose orbit later shows energy loss to gravitational waves.'),
    ('Gravitational Waves', 2015, 'First direct detection',
     'LIGO observes GW150914, a signal from merging black holes.'),
    ('Gravitational Waves', 2017, 'Neutron star merger',
     'GW170817 is seen in both gravitational waves and light.'),

    ('Exoplanets', 1992, 'Pulsar planets',
     'The first confirmed exoplanets are found orbiting a pulsar.'),
    ('Exoplanets', 1995, '51 Pegasi b',
     'The first exoplanet around a Sun-like star is discovered.'),
    ('Exoplanets', 2009, 'Kepler launches',
     'NASA''s Kepler mission begins searching for transiting planets.'),
    ('Exoplanets', 2018, 'TESS launches',
     'NASA''s TESS begins surveying nearby bright stars for planets.'),

    ('Neutron Stars', 1934, 'Neutron stars proposed',
     'Baade and Zwicky suggest supernovae leave behind neutron stars.'),
    ('Neutron Stars', 1967, 'Pulsars discovered',
     'Jocelyn Bell Burnell detects the first radio pulsar.'),
    ('Neutron Stars', 2017, 'Kilonova observed',
     'A neutron star merger is observed forging heavy elements.'),

    ('The Expanding Universe', 1922, 'Friedmann equations',
     'Alexander Friedmann shows general relativity allows an expanding universe.'),
    ('The Expanding Universe', 1929, 'Hubble''s law',
     'Edwin Hubble finds that distant galaxies are moving away faster.'),
    ('The Expanding Universe', 1965, 'Cosmic microwave background',
     'Penzias and Wilson detect the leftover radiation of the early universe.'),
    ('The Expanding Universe', 1998, 'Accelerating expansion',
     'Supernova observations show the expansion is speeding up.')
) AS e (thread_title, year, title, description)
JOIN research_threads t ON t.title = e.thread_title;

-- Chart shown on the Home page. These are the illustrative values from the
-- design (relative heights, 0 to 1), not real measurements.
INSERT INTO chart_data (thread_id, title, chart_type, note, dataset)
SELECT id, 'Black Hole Mass', 'line', 'Illustrative data',
       '[{"year": 2015, "value": 0.196},
         {"year": 2018, "value": 0.397},
         {"year": 2021, "value": 0.548},
         {"year": 2023, "value": 0.799},
         {"year": 2025, "value": 1}]'::jsonb
FROM research_threads
WHERE title = 'Black Holes';

-- A few well-known papers. More can be imported from OpenAlex later.
INSERT INTO research_papers (title, authors, publication_year, url) VALUES
    ('Observation of Gravitational Waves from a Binary Black Hole Merger',
     'B. P. Abbott et al. (LIGO Scientific Collaboration and Virgo Collaboration)', 2016,
     'https://doi.org/10.1103/PhysRevLett.116.061102'),
    ('First M87 Event Horizon Telescope Results. I. The Shadow of the Supermassive Black Hole',
     'Event Horizon Telescope Collaboration', 2019,
     'https://doi.org/10.3847/2041-8213/ab0ec7'),
    ('A Jupiter-mass companion to a solar-type star',
     'M. Mayor, D. Queloz', 1995,
     'https://doi.org/10.1038/378355a0'),
    ('A relation between distance and radial velocity among extra-galactic nebulae',
     'E. Hubble', 1929,
     'https://doi.org/10.1073/pnas.15.3.168');

INSERT INTO thread_papers (thread_id, paper_id)
SELECT t.id, p.id
FROM (VALUES
    ('Black Holes',            'Observation of Gravitational Waves from a Binary Black Hole Merger'),
    ('Black Holes',            'First M87 Event Horizon Telescope Results. I. The Shadow of the Supermassive Black Hole'),
    ('Gravitational Waves',    'Observation of Gravitational Waves from a Binary Black Hole Merger'),
    ('Exoplanets',             'A Jupiter-mass companion to a solar-type star'),
    ('The Expanding Universe', 'A relation between distance and radial velocity among extra-galactic nebulae')
) AS link (thread_title, paper_title)
JOIN research_threads t ON t.title = link.thread_title
JOIN research_papers p ON p.title = link.paper_title;

COMMIT;
