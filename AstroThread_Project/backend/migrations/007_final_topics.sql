-- 007: the final research topics: Black Holes, Exoplanets and Dark Matter.
--
-- * Adds the Dark Matter thread (if no thread has its title or slug).
-- * Gives every retained thread exactly five stages (Origin, Research,
--   Discoveries, Data, Latest Developments) with written content. Existing
--   stage rows are only filled in where they are still empty; written content
--   is never replaced.
-- * Adds a sourced bar chart for Dark Matter (Planck 2018 cosmological
--   parameters), in the same dataset format as 006.
-- * Removes the Gravitational Waves thread. Before this file was written its
--   only dependent row was its chart (chart_data, removed by ON DELETE
--   CASCADE); it had no stages, papers, bookmarks, progress or activity, and
--   nothing it owned is shared with the retained threads. A JSON backup of
--   the deleted rows was saved in backend/backups/.
--   Neutron Stars and The Expanding Universe never had database rows.
--
-- Re-runnable: inserts use ON CONFLICT or NOT EXISTS, updates only touch
-- empty stages, and the delete only matches the removed thread.
-- Apply with:  python manage.py migrate  (applies 001-007 in order; all re-runnable)

-- Dark Matter thread (same text as the design card and 005).
INSERT INTO research_threads (title, category, description, slug, headline, intro, created_at)
SELECT
    'Dark Matter',
    'Cosmology',
    'Invisible matter inferred from galaxy rotation and gravitational lensing. Its nature is still unknown.',
    'dark-matter',
    'Dark Matter: The Missing Mass of the Universe',
    'Follow how astronomers inferred an invisible form of matter from the motions of galaxies, mapped it with gravitational lensing and the cosmic microwave background, and are still searching for what it is made of.',
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM research_threads
    WHERE lower(trim(title)) = 'dark matter' OR slug = 'dark-matter'
);

-- Exoplanets hero text (only where it is still empty).
UPDATE research_threads
SET headline = 'Exoplanets: From Wobbling Stars to Alien Atmospheres'
WHERE slug = 'exoplanets' AND (headline IS NULL OR headline = '');

UPDATE research_threads
SET intro = 'Follow how astronomers went from guessing that other stars have planets to finding thousands of them, and to reading the chemistry of their atmospheres.'
WHERE slug = 'exoplanets' AND (intro IS NULL OR intro = '');

-- Stages. One row per (thread, position); content in the shape the Thread
-- Details page shows: paragraphs (text) and facts ({label, title, text}).
WITH stage_content (slug, position, icon, title, summary, paragraphs, facts) AS (
    VALUES
    -- Black Holes: stage 1 is the design's Origin text (a fuller version of
    -- the seeded one); stages 2-5 were seeded without content.
    ('black-holes', 1, 'origin', 'Origin', 'How the idea began in theoretical physics',
     $j$["The idea of a black hole began on paper, long before any telescope could test it. In 1783 John Michell imagined \"dark stars\" so massive that light could not escape them. In 1916 Karl Schwarzschild found the first exact solution to Einstein's equations of general relativity, which describes a point where gravity becomes inescapable.", "For decades this was treated as a mathematical curiosity. The term \"black hole\" only became common in the late 1960s, as physicists showed that collapsing stars really could form them."]$j$,
     $j$[{"label": "KEY CONCEPT", "title": "Event horizon", "text": "The boundary beyond which nothing, not even light, can escape."}, {"label": "IMPORTANT SCIENTIST", "title": "Karl Schwarzschild", "text": "German physicist; solved Einstein's field equations for a point mass."}, {"label": "APPROXIMATE YEAR", "title": "1916", "text": "Building on John Michell's \"dark stars\" idea from 1783."}]$j$),
    ('black-holes', 2, 'research', 'Research', 'The papers and experiments that tested it',
     $j$["In 1965 Roger Penrose proved that once a collapsing star passes a certain point, a singularity forms inevitably: black holes are a general prediction of relativity, not a special case. In 1974 Stephen Hawking showed that quantum effects make black holes emit faint radiation, linking gravity, quantum theory and thermodynamics.", "These results turned black holes from a curiosity into a central topic of physics, and gave observers clear predictions to look for."]$j$,
     $j$[{"label": "KEY PAPER", "title": "Gravitational Collapse and Space-Time Singularities", "text": "Roger Penrose, Physical Review Letters, 1965."}, {"label": "KEY CONCEPT", "title": "Hawking radiation", "text": "Faint thermal radiation that quantum theory predicts a black hole should emit."}, {"label": "RECOGNITION", "title": "Nobel Prize 2020", "text": "Penrose shared the physics prize for showing that black holes follow from general relativity."}]$j$),
    ('black-holes', 3, 'discoveries', 'Discoveries', 'Observations that confirmed black holes',
     $j$["In the early 1970s the X-ray source Cygnus X-1 became the first widely accepted black hole: a companion too heavy to be a neutron star. From the 1990s, decades of tracking stars around the centre of the Milky Way revealed a compact object of about four million solar masses, Sagittarius A*.", "In 2015 LIGO detected gravitational waves from two merging black holes, and in 2019 the Event Horizon Telescope published the first image of a black hole's shadow, in the galaxy M87."]$j$,
     $j$[{"label": "FIRST CANDIDATE", "title": "Cygnus X-1", "text": "An X-ray binary in our galaxy, identified as a black hole in the early 1970s."}, {"label": "KEY DISCOVERY", "title": "GW150914", "text": "The first gravitational waves detected, from two black holes merging (2015)."}, {"label": "FIRST IMAGE", "title": "M87*", "text": "Event Horizon Telescope, 2019."}]$j$),
    ('black-holes', 4, 'data', 'Data', 'Measurements, masses and images',
     $j$["Gravitational-wave detectors now measure the mass of every black hole formed in a merger they observe. The chart on this page groups the final masses of the confident detections in the public LIGO-Virgo-KAGRA catalog.", "Most of these black holes are a few tens of times the mass of the Sun, far lighter than the supermassive black holes at the centres of galaxies."]$j$,
     $j$[{"label": "DATA SOURCE", "title": "GWTC", "text": "The Gravitational-wave Transient Catalog, published by LIGO, Virgo and KAGRA through GWOSC."}, {"label": "UNIT", "title": "Solar masses (M☉)", "text": "Black-hole masses are measured in multiples of the Sun's mass."}]$j$),
    ('black-holes', 5, 'latest', 'Latest Developments', 'What researchers are finding now',
     $j$["In 2022 the Event Horizon Telescope published the first image of Sagittarius A*, the black hole at the centre of our own galaxy. Gravitational-wave catalogs keep growing with every observing run, adding mergers that test how black holes form and grow.", "Open questions include how supermassive black holes grew so quickly in the early universe and what happens to information that falls into a black hole."]$j$,
     $j$[{"label": "RECENT RESULT", "title": "Sagittarius A* imaged", "text": "Event Horizon Telescope, 2022."}, {"label": "OPEN QUESTION", "title": "Information paradox", "text": "Whether information that falls into a black hole is lost when it evaporates."}]$j$),

    -- Exoplanets.
    ('exoplanets', 1, 'origin', 'Origin', 'The old question: are there other worlds?',
     $j$["People asked whether other stars have planets for centuries; in the 16th century Giordano Bruno argued that the stars are suns with worlds of their own. For a long time there was no way to test it: a planet is billions of times fainter than its star and lost in its glare.", "The question became science in 1992, when Aleksander Wolszczan and Dale Frail found planets orbiting the pulsar PSR B1257+12, and in 1995, when Michel Mayor and Didier Queloz found 51 Pegasi b around a Sun-like star."]$j$,
     $j$[{"label": "KEY CONCEPT", "title": "Exoplanet", "text": "A planet that orbits a star other than the Sun."}, {"label": "IMPORTANT SCIENTISTS", "title": "Michel Mayor and Didier Queloz", "text": "Found 51 Pegasi b in 1995; Nobel Prize in Physics 2019."}, {"label": "APPROXIMATE YEAR", "title": "1992-1995", "text": "First pulsar planets (1992), then the first planet around a Sun-like star (1995)."}]$j$),
    ('exoplanets', 2, 'research', 'Research', 'The methods that made planets visible',
     $j$["Planets are rarely seen directly. The radial velocity method measures the tiny back-and-forth wobble of a star, shifting its light, as a planet pulls on it. The transit method watches for the small dip in a star's brightness when a planet passes in front of it.", "Space telescopes made transits a survey tool: NASA's Kepler watched about 150,000 stars from 2009 to 2018, and TESS has surveyed most of the sky since 2018."]$j$,
     $j$[{"label": "METHOD", "title": "Radial velocity", "text": "Detects a planet from the Doppler wobble of its star; gives a minimum mass."}, {"label": "METHOD", "title": "Transit photometry", "text": "Detects a planet from the dip in starlight as it crosses its star; gives its size."}, {"label": "MISSIONS", "title": "Kepler and TESS", "text": "NASA transit surveys, launched in 2009 and 2018."}]$j$),
    ('exoplanets', 3, 'discoveries', 'Discoveries', 'Worlds unlike anything in the Solar System',
     $j$["51 Pegasi b turned out to be a \"hot Jupiter\", a giant planet orbiting its star in about four days, a kind of planet no one expected. In 1999 HD 209458 b became the first exoplanet seen to transit its star.", "Later discoveries include Proxima Centauri b (2016), a planet around the nearest star to the Sun, and TRAPPIST-1 (2017), a small star with seven Earth-sized planets."]$j$,
     $j$[{"label": "SURPRISE", "title": "Hot Jupiters", "text": "Giant planets orbiting closer to their stars than Mercury does to the Sun."}, {"label": "NEAREST", "title": "Proxima Centauri b", "text": "Orbits the closest star to the Sun, about 4.2 light-years away."}, {"label": "KEY DISCOVERY", "title": "TRAPPIST-1", "text": "Seven Earth-sized planets around one small, cool star (2017)."}]$j$),
    ('exoplanets', 4, 'data', 'Data', 'Thousands of confirmed planets, year by year',
     $j$["The NASA Exoplanet Archive collects every confirmed planet with its measured properties. The chart on this page counts the planets in its Planetary Systems Composite table by the year they were discovered.", "The tall bars in 2014 and 2016 are large batches of Kepler planets confirmed statistically at once; most planets known today were found by the transit method."]$j$,
     $j$[{"label": "DATA SOURCE", "title": "NASA Exoplanet Archive", "text": "Planetary Systems Composite Parameters table (pscomppars)."}, {"label": "IN THE CHART", "title": "6,090 planets", "text": "Confirmed planets discovered from 1992 to 2025, in the archive table used for the chart."}]$j$),
    ('exoplanets', 5, 'latest', 'Latest Developments', 'Reading the atmospheres of other worlds',
     $j$["The James Webb Space Telescope now measures starlight filtered through the atmospheres of transiting planets. In 2022 it made the first clear detection of carbon dioxide in an exoplanet atmosphere, on the hot gas giant WASP-39 b.", "The next goals are the atmospheres of small rocky planets and, eventually, the search for gases that could signal life."]$j$,
     $j$[{"label": "RECENT RESULT", "title": "CO₂ on WASP-39 b", "text": "First clear detection of carbon dioxide in an exoplanet atmosphere, JWST, 2022."}, {"label": "OPEN QUESTION", "title": "Habitable worlds", "text": "Whether rocky planets in their stars' habitable zones keep atmospheres."}]$j$),

    -- Dark Matter.
    ('dark-matter', 1, 'origin', 'Origin', 'Galaxies moving too fast for what we can see',
     $j$["In 1933 Fritz Zwicky measured the speeds of galaxies in the Coma Cluster and found them moving far too fast to be held together by the mass of their visible stars. He proposed that the cluster contains a large amount of unseen \"dark matter\".", "For decades the idea received little attention: many astronomers assumed the missing mass would turn out to be ordinary material that was simply too faint to see."]$j$,
     $j$[{"label": "KEY CONCEPT", "title": "Dark matter", "text": "Matter that neither emits nor absorbs light, detected only through its gravity."}, {"label": "IMPORTANT SCIENTIST", "title": "Fritz Zwicky", "text": "Swiss astronomer at Caltech who studied the Coma Cluster."}, {"label": "APPROXIMATE YEAR", "title": "1933", "text": "Zwicky's study of the Coma Cluster of galaxies."}]$j$),
    ('dark-matter', 2, 'research', 'Research', 'Rotation curves and the missing mass',
     $j$["In the 1970s Vera Rubin and Kent Ford measured how fast stars and gas orbit in spiral galaxies. Far from the centre, where visible matter thins out, orbits should slow down; instead the rotation curves stayed flat.", "Together with radio measurements of hydrogen gas, this showed that galaxies are embedded in much larger halos of invisible mass, and made dark matter a mainstream problem in astronomy."]$j$,
     $j$[{"label": "KEY CONCEPT", "title": "Rotation curve", "text": "Orbital speed plotted against distance from a galaxy's centre."}, {"label": "IMPORTANT SCIENTIST", "title": "Vera Rubin", "text": "American astronomer whose rotation curves made the case for dark matter."}, {"label": "APPROXIMATE YEAR", "title": "1970s", "text": "Optical rotation curves of spiral galaxies, starting with Andromeda (1970)."}]$j$),
    ('dark-matter', 3, 'discoveries', 'Discoveries', 'Seeing invisible mass with gravity',
     $j$["Gravitational lensing, the bending of light by mass, lets astronomers map where mass is, whether or not it shines. In the Bullet Cluster, two galaxy clusters that collided, lensing shows most of the mass separated from the hot gas that holds most of the ordinary matter (published 2006).", "Measurements of the cosmic microwave background, the oldest light in the universe, independently require about five times more dark matter than ordinary matter."]$j$,
     $j$[{"label": "KEY TECHNIQUE", "title": "Gravitational lensing", "text": "Mass bends the light of background galaxies, revealing where the mass is."}, {"label": "KEY DISCOVERY", "title": "Bullet Cluster", "text": "Mass and ordinary gas seen apart after a cluster collision (2006)."}, {"label": "INDEPENDENT EVIDENCE", "title": "Cosmic microwave background", "text": "Its pattern of hot and cold spots fixes the amount of dark matter."}]$j$),
    ('dark-matter', 4, 'data', 'Data', 'How much of the universe is dark',
     $j$["The Planck satellite mapped the cosmic microwave background across the whole sky. Its 2018 results measure the densities of ordinary and dark matter very precisely; the chart on this page converts them into shares of the universe's total energy density today.", "Dark matter makes up about 26% of the universe and ordinary matter about 5%: there is roughly five times more dark matter than the matter that forms stars, planets and people. The rest is dark energy."]$j$,
     $j$[{"label": "DATA SOURCE", "title": "Planck 2018", "text": "Planck Collaboration, Cosmological parameters, A&A 641, A6 (2020)."}, {"label": "KEY NUMBER", "title": "About 5 to 1", "text": "Dark matter to ordinary matter: Ωc h² = 0.120 against Ωb h² = 0.0224."}]$j$),
    ('dark-matter', 5, 'latest', 'Latest Developments', 'The search for what it is made of',
     $j$["Underground experiments such as LUX-ZEPLIN look for rare collisions between dark matter particles and atomic nuclei; so far none has been seen, which rules out many proposed particles. Other searches look for axions, a much lighter candidate.", "ESA's Euclid telescope, launched in 2023, is mapping dark matter across a large part of the sky through weak gravitational lensing."]$j$,
     $j$[{"label": "EXPERIMENT", "title": "LUX-ZEPLIN", "text": "A liquid-xenon detector deep underground in South Dakota."}, {"label": "MISSION", "title": "Euclid", "text": "ESA space telescope launched in July 2023 to map dark matter and dark energy."}, {"label": "OPEN QUESTION", "title": "What is it?", "text": "No particle has been detected; its nature is still unknown."}]$j$)
),
targets AS (
    SELECT t.id AS thread_id, s.*
    FROM stage_content s
    JOIN research_threads t ON t.slug = s.slug
),
filled AS (
    UPDATE thread_stages ts
    SET paragraphs = tg.paragraphs::jsonb,
        facts = tg.facts::jsonb,
        -- Existing summaries are kept.
        summary = COALESCE(NULLIF(ts.summary, ''), tg.summary)
    FROM targets tg
    WHERE ts.thread_id = tg.thread_id
      AND ts.position = tg.position
      AND (ts.paragraphs = '[]'::jsonb
           -- Black Holes Origin was seeded with one sentence of the design text.
           OR (tg.slug = 'black-holes' AND tg.position = 1
               AND jsonb_array_length(ts.paragraphs) < 2))
    RETURNING ts.id
)
INSERT INTO thread_stages (thread_id, position, icon, title, summary, paragraphs, facts)
SELECT thread_id, position, icon, title, summary, paragraphs::jsonb, facts::jsonb
FROM targets
ON CONFLICT (thread_id, position) DO NOTHING;

-- Dark Matter: 3 bars (Planck 2018).
INSERT INTO chart_data (thread_id, title, chart_type, note, dataset)
SELECT t.id, 'What the universe is made of today', 'bar', 'Shares of the total energy density of the universe today from Planck 2018 (TT,TE,EE+lowE+lensing): dark matter Ωc = 0.120 / h² and ordinary matter Ωb = 0.0224 / h² with h = H0 / 100 = 0.674; dark energy = 1 − Ωm with Ωm = 0.315 (flat ΛCDM). Neutrinos (about 0.1%) and radiation are too small to show.', $j${"x":{"label":"Component","unit":null,"kind":"category"},"y":{"label":"Share of the universe","unit":"%"},"points":[{"label":"Dark energy","y":68.5},{"label":"Dark matter","y":26.4},{"label":"Ordinary matter","y":4.9}],"source":{"name":"Planck Collaboration, Planck 2018 results. VI. Cosmological parameters (A&A 641, A6, 2020)","url":"https://doi.org/10.1051/0004-6361/201833910","retrieved":"2026-10-30","detail":"Abstract values: H0 = 67.4 km/s/Mpc, Ωm = 0.315, Ωc h² = 0.120, Ωb h² = 0.0224 (arXiv:1807.06209)."}}$j$::jsonb
FROM (SELECT min(id) AS id FROM research_threads WHERE slug = 'dark-matter') AS t
WHERE t.id IS NOT NULL
ON CONFLICT (thread_id, title) DO UPDATE
    SET chart_type = EXCLUDED.chart_type, note = EXCLUDED.note, dataset = EXCLUDED.dataset;

-- Remove Gravitational Waves (its chart is removed by ON DELETE CASCADE).
DELETE FROM research_threads WHERE slug = 'gravitational-waves';
