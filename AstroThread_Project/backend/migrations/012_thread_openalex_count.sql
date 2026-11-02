-- 012: How many OpenAlex papers a thread with no papers of its own lists, so
-- GET /api/threads can give every thread card its paper count straight away.
--
--   openalex_paper_count: the number of papers the last OpenAlex search for
--     the thread returned (GET /api/threads/<id>/openalex-papers stores it, and
--     the server refreshes it at start-up); NULL until it has been searched.
--   openalex_checked_at: when that search ran.
--
-- Papers linked in thread_papers are not changed; a thread that has some
-- still shows those. Additive only and safe to run again.
-- Apply with:  python manage.py migrate
-- Undo:  ALTER TABLE research_threads DROP COLUMN openalex_paper_count, DROP COLUMN openalex_checked_at;

ALTER TABLE research_threads
    ADD COLUMN IF NOT EXISTS openalex_paper_count INTEGER,
    ADD COLUMN IF NOT EXISTS openalex_checked_at TIMESTAMP;
