-- 001: accounts for login (User and Owner roles).
--
-- Additive only: creates the `users` table if it does not exist and never
-- changes or deletes existing tables or rows, so it is safe to run again.
-- Apply with:  python manage.py migrate
-- Undo (deletes every account):  DROP TABLE users;
--
-- Columns follow "users" in AstroThread-Technical-Documentation.md (3.2).
-- Passwords are stored only as Werkzeug hashes (scrypt), never in plain text.

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(254) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(10) NOT NULL DEFAULT 'user'
        CONSTRAINT users_role_check CHECK (role IN ('user', 'owner')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Emails are unique regardless of case, and login looks them up by lower(email).
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_key ON users (lower(email));
