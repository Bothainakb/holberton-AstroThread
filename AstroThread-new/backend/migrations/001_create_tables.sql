
CREATE TABLE IF NOT EXISTS research_threads (
    id                SERIAL PRIMARY KEY,
    slug              VARCHAR(100) NOT NULL UNIQUE,  
    title             VARCHAR(200) NOT NULL,         
    search_count      INTEGER      NOT NULL DEFAULT 0 CHECK (search_count >= 0),
    last_searched_at  TIMESTAMP,
    papers_fetched_at TIMESTAMP,                     
    created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS research_papers (
    id               SERIAL PRIMARY KEY,
    openalex_id      VARCHAR(64) NOT NULL UNIQUE,   
    title            TEXT        NOT NULL,
    authors          TEXT,
    publication_year INTEGER,
    abstract         TEXT,
    url              TEXT,
    cited_by_count   INTEGER
);

CREATE TABLE IF NOT EXISTS thread_papers (
    thread_id INTEGER  NOT NULL REFERENCES research_threads (id) ON DELETE CASCADE,
    paper_id  INTEGER  NOT NULL REFERENCES research_papers (id)  ON DELETE CASCADE,
    rank      SMALLINT NOT NULL,                    
    PRIMARY KEY (thread_id, paper_id)
);
