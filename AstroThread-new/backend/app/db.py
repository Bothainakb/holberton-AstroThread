import os

import psycopg


def get_connection():
    url = os.getenv("DATABASE_URL")
    if url:
        return psycopg.connect(url)

    return psycopg.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=os.getenv("DB_PORT", "5432"),
        dbname=os.getenv("DB_NAME", "astrothread_db"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD") or None,
    )
