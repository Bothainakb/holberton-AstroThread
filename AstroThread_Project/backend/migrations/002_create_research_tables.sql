-- 002: research content (threads, papers, timelines, charts) and bookmarks.
--
-- Additive only, like 001: creates missing tables, columns and indexes and
-- never changes or deletes existing rows, so it is safe to run again.
-- Apply with:  python manage.py migrate
--
-- Columns follow AstroThread-Technical-Documentation.md (3.2), except that the
-- thread text column is "description" (used by GET /api/threads and the
-- frontend) and chart_data has a "note" column ("Illustrative data").

CREATE TABLE IF NOT EXISTS research_threads (
    id SERIAL PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Databases created by hand before this migration may have an older
-- research_threads table with only id, title, category and description.
ALTER TABLE research_threads
    ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- One thread per title (003 relies on this to avoid duplicates).
CREATE UNIQUE INDEX IF NOT EXISTS research_threads_title_key
    ON research_threads (title);

-- Paper metadata, usually imported from OpenAlex.
CREATE TABLE IF NOT EXISTS research_papers (
    id SERIAL PRIMARY KEY,
    openalex_id VARCHAR(50) UNIQUE,
    title TEXT NOT NULL,
    authors TEXT,
    publication_year INTEGER,
    abstract TEXT,
    url TEXT
);

-- Which papers belong to which thread (many-to-many).
CREATE TABLE IF NOT EXISTS thread_papers (
    thread_id INTEGER NOT NULL REFERENCES research_threads (id) ON DELETE CASCADE,
    paper_id INTEGER NOT NULL REFERENCES research_papers (id) ON DELETE CASCADE,
    PRIMARY KEY (thread_id, paper_id)
);

-- Discoveries shown on a thread's timeline (and the Home page).
CREATE TABLE IF NOT EXISTS timeline_events (
    id SERIAL PRIMARY KEY,
    thread_id INTEGER NOT NULL REFERENCES research_threads (id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT
);

-- Chart data; "dataset" is a JSON list such as [{"year": 2015, "value": 0.2}].
CREATE TABLE IF NOT EXISTS chart_data (
    id SERIAL PRIMARY KEY,
    thread_id INTEGER NOT NULL REFERENCES research_threads (id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    chart_type VARCHAR(20) NOT NULL DEFAULT 'line'
        CONSTRAINT chart_data_type_check CHECK (chart_type IN ('line', 'bar', 'scatter')),
    note TEXT,
    dataset JSONB NOT NULL
);

-- A user's saved threads; one bookmark per user and thread.
CREATE TABLE IF NOT EXISTS bookmarks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    thread_id INTEGER NOT NULL REFERENCES research_threads (id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Uniqueness rules are separate indexes (not inline constraints) so they are
-- also added to tables that already existed before this migration.
CREATE UNIQUE INDEX IF NOT EXISTS timeline_events_unique_event
    ON timeline_events (thread_id, year, title);
CREATE UNIQUE INDEX IF NOT EXISTS chart_data_unique_title
    ON chart_data (thread_id, title);
CREATE UNIQUE INDEX IF NOT EXISTS bookmarks_unique_thread
    ON bookmarks (user_id, thread_id);

CREATE INDEX IF NOT EXISTS timeline_events_thread_idx ON timeline_events (thread_id, year);
CREATE INDEX IF NOT EXISTS chart_data_thread_idx ON chart_data (thread_id);
CREATE INDEX IF NOT EXISTS bookmarks_user_idx ON bookmarks (user_id);
