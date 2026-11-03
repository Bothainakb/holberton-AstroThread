-- 013: Daily AI Research Assistant usage per user (POST /api/ai/explain).
--
-- One row per user per day; `requests` counts the questions that day. The
-- daily limit itself is not stored here: it comes from AI_DAILY_LIMIT in the
-- server's environment, so it can change without a migration.
-- Additive only and safe to run again.
-- Apply with:  python manage.py migrate
-- Undo:  DROP TABLE ai_usage;

CREATE TABLE IF NOT EXISTS ai_usage (
    user_id  INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    used_on  DATE    NOT NULL DEFAULT CURRENT_DATE,
    requests INTEGER NOT NULL DEFAULT 0 CHECK (requests >= 0),
    PRIMARY KEY (user_id, used_on)
);
