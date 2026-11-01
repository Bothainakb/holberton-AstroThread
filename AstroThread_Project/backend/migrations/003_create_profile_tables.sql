-- 003: data for the User Profile page (Figma "08-Profile").
--
-- Taken from feature/profile-page (migrations 002 and 005), keeping only what
-- the Profile API needs. Sign-in stays email + password: password_hash is not
-- changed and the one-time-code tables (that branch's 004) are not added.
--
-- Additive only: adds missing columns, tables and indexes and never changes or
-- deletes existing rows, so it is safe to run again.
-- Apply with:  python manage.py migrate
-- Undo:  DROP TABLE user_activity; DROP TABLE thread_progress; DROP TABLE bookmarks;
--        DROP TABLE timeline_events; DROP TABLE research_papers;
--        ALTER TABLE users DROP COLUMN bio, DROP COLUMN avatar_url,
--            DROP COLUMN email_notifications, DROP COLUMN language;

-- Profile header and Account Settings.
--   bio: the short description under the email.
--   avatar_url: optional picture; without one the page shows initials ("AA").
--   email_notifications: the user's saved preference only; nothing sends
--     emails yet.
--   language: only 'en' for now.
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS bio VARCHAR(300),
    ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS language VARCHAR(10) NOT NULL DEFAULT 'en';

-- Papers and timeline events: user_activity points at them ("Papers Read",
-- "Discoveries Viewed"). Same definitions as feature/profile-page.
CREATE TABLE IF NOT EXISTS research_papers (
    id SERIAL PRIMARY KEY,
    openalex_id VARCHAR(50) UNIQUE,
    title TEXT NOT NULL,
    authors TEXT,
    publication_year INTEGER,
    abstract TEXT,
    url TEXT
);

CREATE TABLE IF NOT EXISTS timeline_events (
    id SERIAL PRIMARY KEY,
    thread_id INTEGER NOT NULL REFERENCES research_threads (id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT
);

-- A user's saved threads; one bookmark per user and thread.
CREATE TABLE IF NOT EXISTS bookmarks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    thread_id INTEGER NOT NULL REFERENCES research_threads (id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Separate index (not an inline constraint) so it is also added to a bookmarks
-- table that already existed; POST /api/bookmarks relies on it (ON CONFLICT).
CREATE UNIQUE INDEX IF NOT EXISTS bookmarks_unique_thread
    ON bookmarks (user_id, thread_id);
CREATE INDEX IF NOT EXISTS bookmarks_user_idx ON bookmarks (user_id);

-- How far a user is in each thread they opened: "Stage 3 of 5" and
-- "Recently Explored". The page sends stage_count with each update;
-- stages_completed never goes above stage_count.
CREATE TABLE IF NOT EXISTS thread_progress (
    user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    thread_id INTEGER NOT NULL REFERENCES research_threads (id) ON DELETE CASCADE,
    current_stage INTEGER NOT NULL DEFAULT 1,
    stages_completed INTEGER NOT NULL DEFAULT 0,
    stage_count INTEGER NOT NULL,
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_viewed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, thread_id),
    CONSTRAINT thread_progress_stage_check CHECK (
        stage_count BETWEEN 1 AND 50
        AND current_stage BETWEEN 1 AND stage_count
        AND stages_completed BETWEEN 0 AND stage_count
    )
);

CREATE INDEX IF NOT EXISTS thread_progress_recent_idx
    ON thread_progress (user_id, last_viewed_at DESC);

-- The "Research Activity" list. Each row points at what it is about:
--   started_thread / completed_stage -> thread_id (and stage_number)
--   read_paper -> paper_id (thread_id optional)
--   viewed_discovery -> event_id (a timeline event) and its thread_id
CREATE TABLE IF NOT EXISTS user_activity (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    activity_type VARCHAR(20) NOT NULL
        CONSTRAINT user_activity_type_check CHECK (activity_type IN (
            'started_thread', 'completed_stage', 'read_paper', 'viewed_discovery'
        )),
    thread_id INTEGER REFERENCES research_threads (id) ON DELETE CASCADE,
    paper_id INTEGER REFERENCES research_papers (id) ON DELETE CASCADE,
    event_id INTEGER REFERENCES timeline_events (id) ON DELETE CASCADE,
    stage_number INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_activity_target_check CHECK (
        (activity_type IN ('started_thread', 'completed_stage') AND thread_id IS NOT NULL)
        OR (activity_type = 'read_paper' AND paper_id IS NOT NULL)
        OR (activity_type = 'viewed_discovery' AND event_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS user_activity_user_idx
    ON user_activity (user_id, created_at DESC);
