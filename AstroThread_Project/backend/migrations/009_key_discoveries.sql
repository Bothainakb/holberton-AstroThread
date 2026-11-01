-- 009: Key Discoveries (timeline_events) with sources, for Black Holes,
-- Exoplanets and Dark Matter.
--
-- Foundational discoveries, separate from Latest Developments (008). Every
-- link was opened on 2026-10-30 and the year is the one the source gives:
--   Black Holes (rows from 005, text kept; only a source is added)
--     1916  arXiv: English translation of Schwarzschild's paper   arxiv.org/abs/physics/9905030
--     1965  NobelPrize.org, Physics 2020 press release (Penrose)  nobelprize.org/prizes/physics/2020/press-release/
--     2019  ESO (Event Horizon Telescope release)                 eso.org/public/news/eso1907/
--   Exoplanets
--     1992  Nature (Wolszczan & Frail, published 1992-01-09)      nature.com/articles/355145a0
--     1995  NobelPrize.org, Physics 2019 press release            nobelprize.org/prizes/physics/2019/press-release/
--     1999  arXiv (Charbonneau et al., astro-ph/9911436)          arxiv.org/abs/astro-ph/9911436
--     2017  NASA release 17-015 (2017-02-22)                      nasa.gov/news-release/...-single-star/
--   Dark Matter
--     1933  Springer, Gen. Relativ. Gravit. (English republication of Zwicky 1933)
--     1970  Carnegie Science (Rubin and Ford)                     carnegiescience.edu/vera-rubin-...
--     2006  NASA Chandra X-ray Center press release (2006-08-21)  chandra.harvard.edu/press/06_releases/press_082106.html
--
-- Additive and re-runnable: two nullable columns are added; Black Holes rows
-- only get a source if they have none; new rows use the existing unique index
-- (thread_id, year, title). Nothing is deleted.
-- Apply with:  python manage.py migrate

ALTER TABLE timeline_events
    ADD COLUMN IF NOT EXISTS source_name VARCHAR(200),
    ADD COLUMN IF NOT EXISTS source_url TEXT;

WITH discoveries (slug, year, title, description, source_name, source_url) AS (
    VALUES
    -- Black Holes: titles and text as seeded by 005; only the source is new.
    ('black-holes', 1916, 'Schwarzschild solution', NULL,
     'arXiv (English translation of Schwarzschild, 1916)',
     'https://arxiv.org/abs/physics/9905030'),
    ('black-holes', 1965, 'Singularity theorem', NULL,
     'NobelPrize.org (Nobel Prize in Physics 2020)',
     'https://www.nobelprize.org/prizes/physics/2020/press-release/'),
    ('black-holes', 2019, 'First image of a black hole', NULL,
     'ESO (Event Horizon Telescope release)',
     'https://www.eso.org/public/news/eso1907/'),

    ('exoplanets', 1992, 'First planets found beyond the Solar System',
     'Aleksander Wolszczan and Dale Frail found planets orbiting the pulsar PSR B1257+12, the first confirmed planets outside the Solar System, detected from tiny variations in the timing of the pulsar''s radio pulses.',
     'Nature (Wolszczan & Frail, 1992)',
     'https://www.nature.com/articles/355145a0'),
    ('exoplanets', 1995, 'First planet around a Sun-like star: 51 Pegasi b',
     'Michel Mayor and Didier Queloz announced 51 Pegasi b, a gas giant comparable to Jupiter orbiting a Sun-like star, found from the wobble of its star. The discovery earned the 2019 Nobel Prize in Physics.',
     'NobelPrize.org (Nobel Prize in Physics 2019)',
     'https://www.nobelprize.org/prizes/physics/2019/press-release/'),
    ('exoplanets', 1999, 'First transit of an exoplanet: HD 209458 b',
     'Astronomers saw the planet HD 209458 b pass in front of its Sun-like star, dimming its light. It was the first planetary transit observed, giving a planet''s size directly and founding the transit method later used by Kepler and TESS.',
     'arXiv (Charbonneau et al., 1999)',
     'https://arxiv.org/abs/astro-ph/9911436'),
    ('exoplanets', 2017, 'Seven Earth-size planets around TRAPPIST-1',
     'NASA''s Spitzer Space Telescope and ground-based telescopes revealed the first known system of seven Earth-size planets around a single star; three of them lie in the habitable zone.',
     'NASA',
     'https://www.nasa.gov/news-release/nasa-telescope-reveals-largest-batch-of-earth-size-habitable-zone-planets-around-single-star/'),

    ('dark-matter', 1933, 'Zwicky infers unseen matter in the Coma Cluster',
     'Fritz Zwicky measured the speeds of galaxies in the Coma Cluster and concluded that the cluster must contain far more non-luminous matter than visible matter to hold together: the first argument for dark matter.',
     'General Relativity and Gravitation (English republication of Zwicky, 1933)',
     'https://link.springer.com/article/10.1007/s10714-008-0707-4'),
    ('dark-matter', 1970, 'Flat rotation curves of spiral galaxies',
     'Vera Rubin and Kent Ford found that stars in the Andromeda galaxy orbit at the same speed far from its centre, a flat rotation curve implying unseen mass. By 1980 they had shown the same in 21 spiral galaxies.',
     'Carnegie Science',
     'https://carnegiescience.edu/vera-rubin-opening-doors-dark-matter-and-women-stem'),
    ('dark-matter', 2006, 'Bullet Cluster: direct evidence of dark matter',
     'Observations of the colliding galaxy cluster 1E 0657-56 by NASA''s Chandra X-ray Observatory and other telescopes showed most of the mass, mapped by gravitational lensing, separated from the hot gas that holds most of the ordinary matter.',
     'NASA Chandra X-ray Center',
     'https://chandra.harvard.edu/press/06_releases/press_082106.html')
),
targets AS (
    SELECT t.id AS thread_id, d.*
    FROM discoveries d
    JOIN research_threads t ON t.slug = d.slug
),
sourced AS (
    UPDATE timeline_events te
    SET source_name = tg.source_name, source_url = tg.source_url
    FROM targets tg
    WHERE te.thread_id = tg.thread_id
      AND te.year = tg.year
      AND te.title = tg.title
      AND te.source_url IS NULL
    RETURNING te.id
)
INSERT INTO timeline_events (thread_id, year, title, description, source_name, source_url)
SELECT thread_id, year, title, description, source_name, source_url
FROM targets
WHERE description IS NOT NULL
ON CONFLICT (thread_id, year, title) DO NOTHING;
