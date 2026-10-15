-- AstroThread database schema (PostgreSQL)
--
-- Run from the repository root:
--   psql -U postgres -d astrothread_db -f database/schema.sql
--
-- WARNING: this drops and recreates every table, so all existing data is
-- deleted. Run database/seed.sql afterwards to load the sample content.

DROP TABLE IF EXISTS bookmarks CASCADE;
DROP TABLE IF EXISTS chart_data CASCADE;
DROP TABLE IF EXISTS timeline_events CASCADE;
DROP TABLE IF EXISTS thread_papers CASCADE;
DROP TABLE IF EXISTS research_papers CASCADE;
DROP TABLE IF EXISTS research_threads CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Accounts. Visitors are not stored; every account is a user or an owner.
CREATE TABLE users (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT         NOT NULL,
    role          VARCHAR(10)  NOT NULL DEFAULT 'user'
                  CHECK (role IN ('user', 'owner')),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Research topics. The column is "description" (not "summary") because the
-- existing backend (GET /api/threads) and the frontend already use that name.
CREATE TABLE research_threads (
    id          SERIAL PRIMARY KEY,
    title       VARCHAR(150) NOT NULL UNIQUE,
    category    VARCHAR(100) NOT NULL,
    description TEXT         NOT NULL,
    is_featured BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Paper metadata, usually imported from OpenAlex.
CREATE TABLE research_papers (
    id               SERIAL PRIMARY KEY,
    openalex_id      VARCHAR(50) UNIQUE,
    title            TEXT NOT NULL,
    authors          TEXT,
    publication_year INTEGER,
    abstract         TEXT,
    url              TEXT
);

-- Many-to-many link between threads and papers.
CREATE TABLE thread_papers (
    thread_id INTEGER NOT NULL REFERENCES research_threads (id) ON DELETE CASCADE,
    paper_id  INTEGER NOT NULL REFERENCES research_papers (id) ON DELETE CASCADE,
    PRIMARY KEY (thread_id, paper_id)
);

-- Discoveries and milestones shown on a thread's timeline.
CREATE TABLE timeline_events (
    id          SERIAL PRIMARY KEY,
    thread_id   INTEGER NOT NULL REFERENCES research_threads (id) ON DELETE CASCADE,
    year        INTEGER NOT NULL,
    title       VARCHAR(150) NOT NULL,
    description TEXT
);

-- Data for a thread's charts. "dataset" holds the points as JSON,
-- for example [{"year": 2015, "value": 0.2}, ...].
CREATE TABLE chart_data (
    id         SERIAL PRIMARY KEY,
    thread_id  INTEGER NOT NULL REFERENCES research_threads (id) ON DELETE CASCADE,
    title      VARCHAR(150) NOT NULL,
    chart_type VARCHAR(20)  NOT NULL DEFAULT 'line'
               CHECK (chart_type IN ('line', 'bar', 'scatter')),
    note       TEXT,
    dataset    JSONB        NOT NULL
);

-- A user's saved threads; one bookmark per user and thread.
CREATE TABLE bookmarks (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    thread_id  INTEGER NOT NULL REFERENCES research_threads (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, thread_id)
);

CREATE INDEX idx_timeline_events_thread ON timeline_events (thread_id, year);
CREATE INDEX idx_chart_data_thread ON chart_data (thread_id);
CREATE INDEX idx_bookmarks_user ON bookmarks (user_id);
