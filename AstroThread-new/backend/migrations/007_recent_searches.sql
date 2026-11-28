CREATE TABLE IF NOT EXISTS recent_searches (
    id          SERIAL       PRIMARY KEY,
    user_id     INTEGER      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    query       VARCHAR(100) NOT NULL,
    searched_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS recent_searches_user_query
    ON recent_searches (user_id, LOWER(query));

CREATE INDEX IF NOT EXISTS recent_searches_user_time
    ON recent_searches (user_id, searched_at DESC);
