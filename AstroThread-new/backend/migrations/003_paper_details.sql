ALTER TABLE research_papers
    ADD COLUMN IF NOT EXISTS venue                TEXT,
    ADD COLUMN IF NOT EXISTS topic                TEXT,
    ADD COLUMN IF NOT EXISTS keywords             JSONB NOT NULL DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS author_list          JSONB NOT NULL DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS method               TEXT,
    ADD COLUMN IF NOT EXISTS main_finding         TEXT,
    ADD COLUMN IF NOT EXISTS why_it_matters       TEXT,
    ADD COLUMN IF NOT EXISTS details_generated_at TIMESTAMP;
