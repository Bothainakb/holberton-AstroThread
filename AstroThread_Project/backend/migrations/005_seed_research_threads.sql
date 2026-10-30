
-- 005: seed the Research Threads from the Figma design. Re-runnable.
-- The library keeps three topics (Black Holes, Exoplanets, Dark Matter; see
-- 007), so Gravitational Waves, Neutron Stars and The Expanding Universe are
-- no longer seeded.

ALTER TABLE research_threads
ADD COLUMN IF NOT EXISTS slug VARCHAR(100) UNIQUE;

-- Seed the default research threads if their title and slug are not taken.
INSERT INTO research_threads (title, category, description, slug, created_at)
SELECT
    v.title,
    v.category,
    v.description,
    v.slug,
    NOW() - v.age::interval
FROM (
    VALUES
    (
        'Exoplanets',
        'Astronomy',
        'Planets orbiting other stars, found by transits and stellar wobble, and now studied for their atmospheres.',
        'exoplanets',
        '5 days'
    ),
    (
        'Dark Matter',
        'Cosmology',
        'Invisible matter inferred from galaxy rotation and gravitational lensing. Its nature is still unknown.',
        'dark-matter',
        '7 days'
    )
) AS v(title, category, description, slug, age)
WHERE NOT EXISTS (
    SELECT 1
    FROM research_threads t
    WHERE lower(trim(t.title)) = lower(trim(v.title))
       OR t.slug = v.slug
);

-- Generate a slug only when it is not already used by another thread.
WITH missing_slugs AS (
    SELECT
        t.id,
        trim(both '-' FROM lower(
            regexp_replace(t.title, '[^a-zA-Z0-9]+', '-', 'g')
        )) AS generated_slug
    FROM research_threads t
    WHERE t.slug IS NULL
)
UPDATE research_threads AS t
SET slug = m.generated_slug
FROM missing_slugs AS m
WHERE t.id = m.id
  AND m.generated_slug <> ''
  AND NOT EXISTS (
      SELECT 1
      FROM research_threads AS other
      WHERE other.slug = m.generated_slug
  );
