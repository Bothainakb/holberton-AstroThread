
ALTER TABLE research_threads
    ADD COLUMN IF NOT EXISTS slug     VARCHAR(100) UNIQUE,
    ADD COLUMN IF NOT EXISTS headline VARCHAR(255),
    ADD COLUMN IF NOT EXISTS intro    TEXT,
    ADD COLUMN IF NOT EXISTS evidence JSONB;

CREATE TABLE IF NOT EXISTS thread_stages (
    id         SERIAL PRIMARY KEY,
    thread_id  INT NOT NULL REFERENCES research_threads(id) ON DELETE CASCADE,
    position   SMALLINT NOT NULL CHECK (position BETWEEN 1 AND 5),
    icon       VARCHAR(20)  NOT NULL,
    title      VARCHAR(100) NOT NULL,
    summary    TEXT NOT NULL,
    paragraphs JSONB NOT NULL DEFAULT '[]',
    facts      JSONB NOT NULL DEFAULT '[]',
    UNIQUE (thread_id, position)
);

CREATE TABLE IF NOT EXISTS latest_developments (
    id         SERIAL PRIMARY KEY,
    thread_id  INT NOT NULL REFERENCES research_threads(id) ON DELETE CASCADE,
    event_date DATE NOT NULL,
    title      VARCHAR(255) NOT NULL,
    text       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS research_papers (
    id               SERIAL PRIMARY KEY,
    openalex_id      VARCHAR(64) UNIQUE NOT NULL,
    title            TEXT NOT NULL,
    authors          TEXT,
    publication_year INT,
    summary          TEXT,
    url              TEXT
);

CREATE TABLE IF NOT EXISTS thread_papers (
    thread_id INT NOT NULL REFERENCES research_threads(id) ON DELETE CASCADE,
    paper_id  INT NOT NULL REFERENCES research_papers(id)  ON DELETE CASCADE,
    PRIMARY KEY (thread_id, paper_id)
);
