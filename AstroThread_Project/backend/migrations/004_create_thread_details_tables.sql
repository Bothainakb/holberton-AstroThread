-- 004: tables for the Thread Details page (GET /api/threads/<id>).
--
-- Based on dana's thread_details.sql (Thread-Details branch), fitted to the
-- existing schema: research_threads keeps its `description` column and
-- research_papers / timeline_events come from 003. Definitions match
-- feature/profile-page so the branches can be merged later.
--
-- Additive only: never changes or deletes existing rows, safe to run again.
-- Apply with:  python manage.py migrate
-- Undo:  DROP TABLE thread_papers; DROP TABLE chart_data;
--        DROP INDEX timeline_events_unique_event, timeline_events_thread_idx;

-- Papers shown under "Related Research Papers" for a thread.
--   is_illustrative: a sample selection added by hand (migration 005), not a
--   curated or automatically imported list; the page labels these papers.
CREATE TABLE IF NOT EXISTS thread_papers (
    thread_id INTEGER NOT NULL REFERENCES research_threads (id) ON DELETE CASCADE,
    paper_id INTEGER NOT NULL REFERENCES research_papers (id) ON DELETE CASCADE,
    PRIMARY KEY (thread_id, paper_id)
);

ALTER TABLE thread_papers
    ADD COLUMN IF NOT EXISTS is_illustrative BOOLEAN NOT NULL DEFAULT FALSE;

-- Measurements for the "From research to evidence" chart. Only verified data
-- belongs here; with no rows the page says no measurements are available.
CREATE TABLE IF NOT EXISTS chart_data (
    id SERIAL PRIMARY KEY,
    thread_id INTEGER NOT NULL REFERENCES research_threads (id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    chart_type VARCHAR(20) NOT NULL DEFAULT 'line'
        CONSTRAINT chart_data_type_check CHECK (chart_type IN ('line', 'bar', 'scatter')),
    note TEXT,
    dataset JSONB NOT NULL
);

-- Uniqueness rules are separate indexes so they also apply to tables that
-- already existed; migration 005 relies on them to avoid duplicate rows.
CREATE UNIQUE INDEX IF NOT EXISTS timeline_events_unique_event
    ON timeline_events (thread_id, year, title);
CREATE UNIQUE INDEX IF NOT EXISTS chart_data_unique_title
    ON chart_data (thread_id, title);

CREATE INDEX IF NOT EXISTS timeline_events_thread_idx ON timeline_events (thread_id, year);
CREATE INDEX IF NOT EXISTS chart_data_thread_idx ON chart_data (thread_id);
