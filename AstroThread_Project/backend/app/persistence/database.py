import os

import psycopg


def get_db_connection():
    """Connect to PostgreSQL using environment variables.

    DATABASE_URL (set by hosting platforms) wins if present; otherwise the
    DB_* settings are used. backend/.env is optional: it only fills in
    variables that are not already set.
    """
    url = os.getenv("DATABASE_URL")
    if url:
        return psycopg.connect(url)

    try:
        return psycopg.connect(
            host=os.getenv("DB_HOST", "localhost"),
            port=os.getenv("DB_PORT", "5432"),
            dbname=os.getenv("DB_NAME", "astrothread_db"),
            user=os.getenv("DB_USER", "postgres"),
            # None = no password sent (works for local "trust" setups)
            password=os.getenv("DB_PASSWORD") or None,
        )
    except psycopg.OperationalError as error:
        raise RuntimeError(
            "Could not connect to PostgreSQL. Set DB_PASSWORD (and DB_PORT if "
            f"it isn't 5432), or DATABASE_URL. Details: {error}"
        ) from error
