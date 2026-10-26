-- 005: data for the User Profile page (Figma "08-Profile").
--
-- Additive only, like 001-004: adds missing columns and tables and never
-- changes or deletes existing rows, so it is safe to run again.
-- Apply with:  python manage.py migrate
-- Undo:  DROP TABLE user_activity; DROP TABLE thread_progress;
--        ALTER TABLE users DROP COLUMN bio, DROP COLUMN avatar_url,
--            DROP COLUMN email_notifications, DROP COLUMN language;

-- Profile header and Account Settings.
--   bio: the short description under the email ("Exploring black holes...").
--   avatar_url: optional picture; without one the page shows initials ("AA").
--   email_notifications: "Email me about new stages in saved threads".
--   language: "Language used across AstroThread" (only 'en' for now).
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS bio VARCHAR(300),
    ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS language VARCHAR(10) NOT NULL DEFAULT 'en';

-- How far a user is in each thread they opened: "Stage 3 of 5",
-- "Recently Explored" and "Research Stages Completed".
-- Stage titles live in the frontend, so the page sends stage_count with
-- each update; stages_completed never goes above stage_count.
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

-- The "Research Activity" list, plus the "Papers Read" and
-- "Discoveries Viewed" counts. Each row points at what it is about:
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
