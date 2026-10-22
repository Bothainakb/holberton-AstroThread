-- 004: sign-in with one-time email codes instead of passwords.
--
-- Additive only and safe to run again: existing accounts and their old
-- password hashes are kept (they are no longer used), new accounts have none.
-- Undo:  DROP TABLE login_codes;

ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- At most one active code per email (codes are stored hashed).
CREATE TABLE IF NOT EXISTS login_codes (
    id SERIAL PRIMARY KEY,
    email VARCHAR(254) NOT NULL,
    purpose VARCHAR(10) NOT NULL
        CONSTRAINT login_codes_purpose_check CHECK (purpose IN ('login', 'signup')),
    code_hash VARCHAR(255) NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS login_codes_email_lower_key
    ON login_codes (lower(email));
