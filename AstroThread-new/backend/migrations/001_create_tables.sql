-- 001: the tables for the Home page and search .
CREATE TABLE IF NOT EXISTS research_threads (
    id           SERIAL PRIMARY KEY,
    slug         VARCHAR(100) NOT NULL UNIQUE,     
    title        VARCHAR(200) NOT NULL,
    category     VARCHAR(100) NOT NULL,
    description  TEXT         NOT NULL,
    popular_rank SMALLINT     UNIQUE CHECK (popular_rank > 0),
    created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS research_papers (
    id               SERIAL PRIMARY KEY,
    title            TEXT NOT NULL,
    authors          TEXT,
    publication_year INTEGER,
    abstract         TEXT,
    url              TEXT,
    UNIQUE (title, publication_year)              
);

CREATE TABLE IF NOT EXISTS thread_papers (
    thread_id INTEGER NOT NULL REFERENCES research_threads (id) ON DELETE CASCADE,
    paper_id  INTEGER NOT NULL REFERENCES research_papers (id)  ON DELETE CASCADE,
    PRIMARY KEY (thread_id, paper_id)               
