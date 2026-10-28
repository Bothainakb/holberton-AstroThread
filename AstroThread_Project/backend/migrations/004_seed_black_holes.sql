
-- Seed the Black Holes thread details safely on repeated runs.

-- Assign the slug and details to one matching thread only.
UPDATE research_threads
SET slug = 'black-holes',
    headline = 'Black Holes: From Theory to Observation',
    intro = 'Explore how our understanding of black holes evolved from theoretical predictions to modern observations.'
WHERE id = (
    SELECT id
    FROM research_threads
    WHERE title = 'Black Holes'
    ORDER BY id
    LIMIT 1
)
AND NOT EXISTS (
    SELECT 1
    FROM research_threads
    WHERE slug = 'black-holes'
      AND id <> (
          SELECT id
          FROM research_threads
          WHERE title = 'Black Holes'
          ORDER BY id
          LIMIT 1
      )
);

-- Seed stages for the thread that owns this slug.
INSERT INTO thread_stages (
    thread_id, position, icon, title, summary, paragraphs, facts
)
SELECT
    t.id,
    s.position,
    s.icon,
    s.title,
    s.summary,
    s.paragraphs::jsonb,
    s.facts::jsonb
FROM research_threads t
CROSS JOIN (
    VALUES
    (
        1,
        'origin',
        'Origin',
        'How the idea began in theoretical physics',
        '["In 1916 Karl Schwarzschild found the first exact solution to Einstein''s equations, describing a point where gravity becomes inescapable."]',
        '[{"label":"KEY CONCEPT","title":"Event horizon","text":"The boundary beyond which nothing, not even light, can escape."}]'
    ),
    (
        2,
        'research',
        'Research',
        'The papers and experiments that tested it',
        '[]',
        '[]'
    ),
    (
        3,
        'discoveries',
        'Discoveries',
        'Observations that confirmed black holes',
        '[]',
        '[]'
    ),
    (
        4,
        'data',
        'Data',
        'What the measurements show',
        '[]',
        '[]'
    ),
    (
        5,
        'latest',
        'Latest Developments',
        'Where the research is now',
        '[]',
        '[]'
    )
) AS s(position, icon, title, summary, paragraphs, facts)
WHERE t.slug = 'black-holes'
ON CONFLICT (thread_id, position) DO NOTHING;

-- Add the first image discovery if it does not already exist.
INSERT INTO latest_developments (thread_id, event_date, title, text)
SELECT
    t.id,
    '2019-04-10',
    'First image of a black hole',
    'The Event Horizon Telescope imaged the shadow of the black hole in galaxy M87.'
FROM research_threads t
WHERE t.slug = 'black-holes'
AND NOT EXISTS (
    SELECT 1
    FROM latest_developments ld
    WHERE ld.thread_id = t.id
);
