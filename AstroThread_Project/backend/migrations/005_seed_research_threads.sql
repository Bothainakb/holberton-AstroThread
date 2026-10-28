-- 005: seed the Research Threads from the Figma design. Re-runnable.

ALTER TABLE research_threads ADD COLUMN IF NOT EXISTS slug VARCHAR(100) UNIQUE;

-- "age" spaces out created_at so "Sorted by most recent" matches the design order
INSERT INTO research_threads (title, category, description, slug, created_at)
SELECT v.title, v.category, v.description, v.slug, NOW() - v.age::interval
FROM (VALUES
 ('Black Holes', 'Astrophysics',
  'Regions where gravity is so strong that nothing, not even light, can escape. Trace them from theory to the first image.',
  'black-holes', '2 days'),
 ('Gravitational Waves', 'Physics',
  'Ripples in spacetime from colliding black holes and neutron stars, first detected directly in 2015.',
  'gravitational-waves', '4 days'),
 ('Exoplanets', 'Astronomy',
  'Planets orbiting other stars, found by transits and stellar wobble, and now studied for their atmospheres.',
  'exoplanets', '5 days'),
 ('Dark Matter', 'Cosmology',
  'Invisible matter inferred from galaxy rotation and gravitational lensing. Its nature is still unknown.',
  'dark-matter', '7 days'),
 ('Neutron Stars', 'Astrophysics',
  'Ultra-dense remnants of supernovae: pulsars, magnetars and the mergers that forge heavy elements.',
  'neutron-stars', '8 days'),
 ('The Expanding Universe', 'Cosmology',
  'From Hubble''s law to dark energy: how we learned that space itself is stretching, and speeding up.',
  'expanding-universe', '14 days')
) AS v(title, category, description, slug, age)
WHERE NOT EXISTS (
    SELECT 1 FROM research_threads t WHERE t.slug = v.slug OR t.title = v.title
);

-- Any thread added without a slug gets one from its title
UPDATE research_threads
SET slug = trim(both '-' from lower(regexp_replace(title, '[^a-zA-Z0-9]+', '-', 'g')))
WHERE slug IS NULL;
