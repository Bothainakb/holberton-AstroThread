-- 011: Saved research papers (paper bookmarks on Thread Details, listed on Profile).
--
--   paper_bookmarks: one row per user and paper. The paper is a research_papers
--     row: a database paper as it is, or an OpenAlex paper, stored there (by its
--     unique openalex_id) the first time someone saves it.
--   thread_id: the thread the paper was saved from, for the link on Profile.
--
-- Thread bookmarks (the bookmarks table) are not changed.
-- Additive only and safe to run again. Apply with:  python manage.py migrate
-- Undo:  DROP TABLE paper_bookmarks;

CREATE TABLE IF NOT EXISTS paper_bookmarks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    paper_id INTEGER NOT NULL REFERENCES research_papers (id) ON DELETE CASCADE,
    thread_id INTEGER REFERENCES research_threads (id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- A paper is saved at most once per user; POST relies on it (ON CONFLICT).
CREATE UNIQUE INDEX IF NOT EXISTS paper_bookmarks_unique_paper
    ON paper_bookmarks (user_id, paper_id);

CREATE INDEX IF NOT EXISTS paper_bookmarks_user_idx
    ON paper_bookmarks (user_id, created_at DESC);
