-- 008: Latest Developments for Black Holes, Exoplanets and Dark Matter.
--
-- Three developments per thread, each with the page that announced it. Every
-- link was opened on 2026-10-30 and the date below is the one the source
-- gives (for LZ, the date the page says the results were presented):
--   Black Holes  2025-09-10  LIGO Lab, Caltech     ligo.caltech.edu/news/ligo20250910
--                2022-05-12  ESO (EHT release)     eso.org/public/news/eso2208-eht-mw/
--                2019-04-10  ESO (EHT release)     eso.org/public/news/eso1907/
--   Exoplanets   2025-09-17  NASA                  nasa.gov/universe/exoplanets/...-reaches-6000/
--                2023-09-11  NASA Science (Webb)   science.nasa.gov/missions/webb/...k2-18-b/
--                2022-08-25  NASA Science (Webb)   science.nasa.gov/missions/webb/...exoplanet-atmosphere/
--   Dark Matter  2025-03-19  ESA                   esa.int/.../Euclid_opens_data_treasure_trove...
--                2024-08-26  UC Berkeley Physics   physics.berkeley.edu/news/lz-experiment-...
--                2023-11-07  ESA                   esa.int/.../Euclid_s_first_images...
--
-- Additive and re-runnable: two nullable columns are added; a development is
-- only inserted if its thread has none with the same title; the existing
-- Black Holes row (2019, seeded by 004) only gets a source and fuller text if
-- it has no source yet. Nothing is deleted.
-- Apply with:  python manage.py migrate

ALTER TABLE latest_developments
    ADD COLUMN IF NOT EXISTS source_url TEXT,
    ADD COLUMN IF NOT EXISTS source_name VARCHAR(200);

WITH developments (slug, event_date, title, text, source_name, source_url) AS (
    VALUES
    ('black-holes', DATE '2025-09-10',
     'Hawking''s black hole area theorem confirmed',
     'Ten years after the first detection, LIGO, Virgo and KAGRA announced that the clearest black-hole merger signal yet, GW250114, verifies Stephen Hawking''s area theorem: the horizon area of the final black hole is larger than that of the two black holes that merged.',
     'LIGO Lab, Caltech',
     'https://www.ligo.caltech.edu/news/ligo20250910'),
    ('black-holes', DATE '2022-05-12',
     'First image of the black hole at the heart of our galaxy',
     'The Event Horizon Telescope collaboration revealed the first image of Sagittarius A*, the supermassive black hole at the centre of the Milky Way, confirming that the compact object there is a black hole.',
     'ESO (Event Horizon Telescope release)',
     'https://www.eso.org/public/news/eso2208-eht-mw/'),
    ('black-holes', DATE '2019-04-10',
     'First image of a black hole',
     'The Event Horizon Telescope, a planet-scale array of radio telescopes, captured the first image of a black hole: the shadow of the supermassive black hole at the centre of the galaxy M87.',
     'ESO (Event Horizon Telescope release)',
     'https://www.eso.org/public/news/eso1907/'),

    ('exoplanets', DATE '2025-09-17',
     'NASA''s count of confirmed exoplanets reaches 6,000',
     'Thirty years after 51 Pegasi b, the first planet found around a Sun-like star, the official tally of exoplanets tracked by NASA passed 6,000, with more than 8,000 further candidates awaiting confirmation.',
     'NASA',
     'https://www.nasa.gov/universe/exoplanets/nasas-tally-of-planets-outside-our-solar-system-reaches-6000/'),
    ('exoplanets', DATE '2023-09-11',
     'Webb finds methane and carbon dioxide on K2-18 b',
     'The James Webb Space Telescope detected methane and carbon dioxide in the atmosphere of K2-18 b, a planet 8.6 times as massive as Earth in its star''s habitable zone, and a possible but unconfirmed sign of dimethyl sulfide.',
     'NASA Science (Webb)',
     'https://science.nasa.gov/missions/webb/webb-discovers-methane-carbon-dioxide-in-atmosphere-of-k2-18-b/'),
    ('exoplanets', DATE '2022-08-25',
     'First clear detection of carbon dioxide in an exoplanet atmosphere',
     'Webb found the first clear evidence of carbon dioxide in the atmosphere of a planet outside the Solar System, the hot gas giant WASP-39 b, about 700 light-years away.',
     'NASA Science (Webb)',
     'https://science.nasa.gov/missions/webb/nasas-webb-detects-carbon-dioxide-in-exoplanet-atmosphere/'),

    ('dark-matter', DATE '2025-03-19',
     'Euclid''s first data release maps 26 million galaxies',
     'ESA''s Euclid mission released its first survey data: one week of observations covering 63 square degrees of sky, with 26 million galaxies and about 500 gravitational lens candidates, a first look at the atlas it is building to map dark matter.',
     'ESA',
     'https://www.esa.int/Science_Exploration/Space_Science/Euclid/Euclid_opens_data_treasure_trove_offers_glimpse_of_deep_fields'),
    ('dark-matter', DATE '2024-08-26',
     'LZ sets a new record in the search for dark matter particles',
     'Analysing 280 days of data, the LUX-ZEPLIN experiment found no evidence of WIMPs heavier than 9 GeV/c², setting the world''s most stringent limits on these leading dark matter candidates.',
     'UC Berkeley Physics',
     'https://physics.berkeley.edu/news/lz-experiment-sets-new-record-search-dark-matter'),
    ('dark-matter', DATE '2023-11-07',
     'Euclid''s first images',
     'ESA unveiled Euclid''s first full-colour images, showing that the telescope can capture sharp views of large areas of sky, the capability it needs to map how dark matter and dark energy shape the Universe.',
     'ESA',
     'https://www.esa.int/Science_Exploration/Space_Science/Euclid/Euclid_s_first_images_the_dazzling_edge_of_darkness')
),
targets AS (
    SELECT t.id AS thread_id, d.*
    FROM developments d
    JOIN research_threads t ON t.slug = d.slug
),
sourced AS (
    -- The 2019 Black Holes row from 004: add its source and fuller text.
    UPDATE latest_developments ld
    SET text = tg.text, source_name = tg.source_name, source_url = tg.source_url
    FROM targets tg
    WHERE ld.thread_id = tg.thread_id
      AND ld.event_date = tg.event_date
      AND lower(ld.title) = lower(tg.title)
      AND ld.source_url IS NULL
    RETURNING ld.id
)
INSERT INTO latest_developments (thread_id, event_date, title, text, source_name, source_url)
SELECT tg.thread_id, tg.event_date, tg.title, tg.text, tg.source_name, tg.source_url
FROM targets tg
WHERE NOT EXISTS (
    SELECT 1 FROM latest_developments ld
    WHERE ld.thread_id = tg.thread_id AND lower(ld.title) = lower(tg.title)
);
