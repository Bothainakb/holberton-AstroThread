
CREATE TABLE IF NOT EXISTS saved_topics (
    id       SERIAL       PRIMARY KEY,
    user_id  INTEGER      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    topic    VARCHAR(100) NOT NULL,
    saved_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS saved_topics_user_topic
    ON saved_topics (user_id, LOWER(topic));

CREATE TABLE IF NOT EXISTS journey_steps (
    id         SERIAL      PRIMARY KEY,
    user_id    INTEGER     NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    step_key   VARCHAR(40) NOT NULL,              
    step_type  VARCHAR(10) NOT NULL CHECK (step_type IN ('search', 'paper')),
    query      VARCHAR(100),                      
    paper_id   INTEGER     REFERENCES research_papers (id) ON DELETE CASCADE, 
    topic      VARCHAR(200),                      
    note       VARCHAR(500),
    created_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, step_key),
    CHECK (
        (step_type = 'search' AND query IS NOT NULL AND paper_id IS NULL)
        OR (step_type = 'paper' AND paper_id IS NOT NULL AND query IS NULL)
    )
);

CREATE INDEX IF NOT EXISTS journey_steps_user ON journey_steps (user_id, created_at DESC);
