-- 010: columns the Owner Dashboard (Figma "11-Owner-Dashboard") needs.
--
--   is_featured: "Show as a featured thread on Home" in the edit form, and
--     the FEATURED column of the threads table.
--   updated_at: the LAST UPDATED column. Existing rows start at their
--     created_at; owner edits set it to the current time.
--
-- Additive only and safe to run again. Apply with:  python manage.py migrate
-- Undo:  ALTER TABLE research_threads DROP COLUMN is_featured, DROP COLUMN updated_at;

ALTER TABLE research_threads
    ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;

UPDATE research_threads
SET updated_at = COALESCE(created_at, CURRENT_TIMESTAMP)
WHERE updated_at IS NULL;

ALTER TABLE research_threads
    ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN updated_at SET NOT NULL;
