-- Overview written by Ai.
ALTER TABLE research_threads
    ADD COLUMN IF NOT EXISTS overview              TEXT,
    ADD COLUMN IF NOT EXISTS overview_generated_at TIMESTAMP;
