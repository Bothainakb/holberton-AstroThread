-- 002: create the research_threads table if it does not exist.
-- Existing tables and records are preserved.

CREATE TABLE IF NOT EXISTS research_threads (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
