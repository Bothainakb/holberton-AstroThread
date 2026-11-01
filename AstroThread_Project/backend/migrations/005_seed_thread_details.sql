-- 005: sample content for the Black Holes thread on the Thread Details page.
--
-- Everything is attached to one thread: the 'Black Holes' row with the lowest
-- id (titles are not unique in research_threads). If no such thread exists,
-- this file adds nothing at all: no timeline events, papers or links.
-- Re-running adds nothing: events and links use ON CONFLICT, papers are
-- matched by title and year.
-- No chart rows are added: there is no verified dataset yet, so the page shows
-- that no measurements are available.
--
-- Apply with:  python manage.py migrate

-- Timeline (oldest first on the page). From dana's thread_details.sql.
INSERT INTO timeline_events (thread_id, year, title, description)
SELECT t.id, e.year, e.title, e.description
FROM (SELECT min(id) AS id FROM research_threads WHERE title = 'Black Holes') AS t
CROSS JOIN (VALUES
    (1916, 'Schwarzschild solution',
     'Karl Schwarzschild finds the first exact solution of Einstein''s equations, describing a black hole.'),
    (1965, 'Singularity theorem',
     'Roger Penrose shows that collapse into a singularity is a general outcome of gravity.'),
    (2019, 'First image of a black hole',
     'The Event Horizon Telescope images the shadow of the black hole in galaxy M87.')
) AS e (year, title, description)
WHERE t.id IS NOT NULL
ON CONFLICT (thread_id, year, title) DO NOTHING;

-- Illustrative papers (a hand-picked sample, labelled on the page).
-- References checked against Crossref and arXiv:
--   Schwarzschild, Sitzungsber. Preuss. Akad. Wiss. Berlin (1916) 189-196;
--     English translation arXiv:physics/9905030.
--   Penrose, Phys. Rev. Lett. 14, 57 (1965), doi:10.1103/PhysRevLett.14.57.
--   EHT Collaboration, ApJL 875, L1 (2019), doi:10.3847/2041-8213/ab0ec7.
INSERT INTO research_papers (title, authors, publication_year, url)
SELECT p.title, p.authors, p.publication_year, p.url
FROM (VALUES
    ('On the Gravitational Field of a Mass Point According to Einstein''s Theory',
     'Karl Schwarzschild', 1916, 'https://arxiv.org/abs/physics/9905030'),
    ('Gravitational Collapse and Space-Time Singularities',
     'Roger Penrose', 1965, 'https://doi.org/10.1103/PhysRevLett.14.57'),
    ('First M87 Event Horizon Telescope Results. I. The Shadow of the Supermassive Black Hole',
     'Event Horizon Telescope Collaboration', 2019, 'https://doi.org/10.3847/2041-8213/ab0ec7')
) AS p (title, authors, publication_year, url)
WHERE EXISTS (SELECT 1 FROM research_threads WHERE title = 'Black Holes')
  AND NOT EXISTS (
      SELECT 1 FROM research_papers r
      WHERE r.title = p.title AND r.publication_year = p.publication_year
  );

-- Link each paper (the lowest id with that title and year) to the thread.
INSERT INTO thread_papers (thread_id, paper_id, is_illustrative)
SELECT links.thread_id, links.paper_id, TRUE
FROM (
    SELECT t.id AS thread_id,
           (SELECT min(r.id) FROM research_papers r
            WHERE r.title = p.title AND r.publication_year = p.publication_year) AS paper_id
    FROM (SELECT min(id) AS id FROM research_threads WHERE title = 'Black Holes') AS t
    CROSS JOIN (VALUES
        ('On the Gravitational Field of a Mass Point According to Einstein''s Theory', 1916),
        ('Gravitational Collapse and Space-Time Singularities', 1965),
        ('First M87 Event Horizon Telescope Results. I. The Shadow of the Supermassive Black Hole', 2019)
    ) AS p (title, publication_year)
    WHERE t.id IS NOT NULL
) AS links
WHERE links.paper_id IS NOT NULL
ON CONFLICT (thread_id, paper_id) DO NOTHING;
