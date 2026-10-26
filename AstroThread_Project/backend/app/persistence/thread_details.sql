-- Tables the Thread Details page reads (PostgreSQL).
-- Skip any table if already created.

CREATE TABLE IF NOT EXISTS research_threads (
    id          SERIAL PRIMARY KEY,
    title       VARCHAR(200) NOT NULL,
    category    VARCHAR(80)  NOT NULL,
    summary     TEXT         NOT NULL,
    is_featured BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS timeline_events (
    id          SERIAL PRIMARY KEY,
    thread_id   INT NOT NULL REFERENCES research_threads(id) ON DELETE CASCADE,
    year        INT NOT NULL,
    title       VARCHAR(200) NOT NULL,
    description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS chart_data (
    id         SERIAL PRIMARY KEY,
    thread_id  INT NOT NULL REFERENCES research_threads(id) ON DELETE CASCADE,
    title      VARCHAR(200) NOT NULL,
    chart_type VARCHAR(30)  NOT NULL,          
    dataset    JSONB        NOT NULL           
);

CREATE TABLE IF NOT EXISTS research_papers (
    id               SERIAL PRIMARY KEY,
    openalex_id      VARCHAR(64) UNIQUE NOT NULL,
    title            TEXT NOT NULL,
    authors          TEXT,
    publication_year INT,
    abstract         TEXT,
    url              TEXT
);

CREATE TABLE IF NOT EXISTS thread_papers (
    thread_id INT NOT NULL REFERENCES research_threads(id) ON DELETE CASCADE,
    paper_id  INT NOT NULL REFERENCES research_papers(id)  ON DELETE CASCADE,
    PRIMARY KEY (thread_id, paper_id)
);

-- Sample data 
INSERT INTO research_threads (title, category, summary, is_featured)
VALUES ('Black Holes: From Theory to Observation', 'Astrophysics',
        'How black holes went from a prediction of general relativity to the first image of a black hole shadow.', TRUE);

INSERT INTO timeline_events (thread_id, year, title, description) VALUES
 (1, 1916, 'Schwarzschild solution', 'Karl Schwarzschild finds the first exact solution of Einstein''s equations, describing a black hole.'),
 (1, 1965, 'Singularity theorem', 'Roger Penrose shows that collapse into a singularity is a general outcome of gravity.'),
 (1, 2019, 'First image of a black hole', 'The Event Horizon Telescope images the shadow of the black hole in galaxy M87.');

-- Placeholder numbers for testing only; 
INSERT INTO chart_data (thread_id, title, chart_type, dataset) VALUES
 (1, 'Observations over time', 'bar',
  '{"labels": ["1970s", "1990s", "2010s", "2020s"], "values": [2, 9, 41, 87]}');
